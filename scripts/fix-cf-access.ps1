# =============================================================
# @file  guonian 网站访问修复工具（Cloudflare 优选 IP）
# @description 部分地区运营商对 Cloudflare 默认 Anycast IP 做 TLS 阻断
#              （表现为浏览器秒级"连接被重置"）。本脚本从本机逐个探测
#              备用 Cloudflare IP，挑选最快可达的写入 hosts，使
#              cjbx.dkw.ccwu.cc 绕过被封 IP。
#              用法：右键 PowerShell“以管理员身份运行”，执行：
#                powershell -ExecutionPolicy Bypass -File .\fix-cf-access.ps1
#              恢复：fix-cf-access.ps1 -Undo
# =============================================================
param([switch]$Undo)

$Hostname = 'cjbx.dkw.ccwu.cc'
$Marker = '# guonian-cf-fix'
$HostsPath = "$env:windir\System32\drivers\etc\hosts"
$CandidateIPs = @(
  '104.16.0.1','104.17.0.1','104.18.0.1','104.19.0.1',
  '188.114.96.1','188.114.97.1','190.93.244.1'
)

# --- 管理员检查 ---
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "请以【管理员身份】运行 PowerShell 后再执行本脚本。" -ForegroundColor Red
  exit 1
}

# --- 恢复模式 ---
if ($Undo) {
  $lines = Get-Content $HostsPath -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch [regex]::Escape($Marker) }
  Set-Content -Path $HostsPath -Value $lines -Encoding ASCII
  ipconfig /flushdns | Out-Null
  Write-Host "已移除修复规则并刷新 DNS，恢复默认解析。" -ForegroundColor Green
  exit 0
}

Write-Host "===== guonian 访问修复：从本机探测可用的 Cloudflare IP =====" -ForegroundColor Cyan

# --- 逐个探测：TCP 443 + TLS(SNI=$Hostname) + HTTP GET /api/health ---
function Test-CFIp {
  param([string]$IP)
  $result = [ordered]@{ IP = $IP; TcpMs = $null; TlsOk = $false; HttpCode = $null; TotalMs = $null }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $tcp = New-Object Net.Sockets.TcpClient
  try {
    $iar = $tcp.BeginConnect($IP, 443, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(4000)) { $tcp.Close(); return $result }
    $tcp.EndConnect($iar)
    $result.TcpMs = [int]$sw.ElapsedMilliseconds
  } catch { $tcp.Close(); return $result }

  try {
    $ssl = New-Object Net.Security.SslStream($tcp.GetStream(), $false, { $true })
    $ssl.AuthenticateAsClient($Hostname)
    $result.TlsOk = $true
    $req = "GET /api/health HTTP/1.1`r`nHost: $Hostname`r`nConnection: close`r`nUser-Agent: cf-fix/1.0`r`n`r`n"
    $b = [Text.Encoding]::ASCII.GetBytes($req)
    $ssl.Write($b, 0, $b.Length); $ssl.Flush()
    $sr = New-Object IO.StreamReader($ssl)
    $first = $sr.ReadLine()
    if ($first -match 'HTTP/1\.1 (\d{3})') { $result.HttpCode = [int]$Matches[1] }
    $ssl.Close()
  } catch { } finally { $tcp.Close() }
  $sw.Stop(); $result.TotalMs = [int]$sw.ElapsedMilliseconds
  return $result
}

$working = @()
foreach ($ip in $CandidateIPs) {
  $r = Test-CFIp -IP $ip
  $status = if ($r.HttpCode -eq 200) {
    Write-Host ("[可用] {0,-16} TCP {1}ms  总耗时 {2}ms" -f $ip, $r.TcpMs, $r.TotalMs) -ForegroundColor Green
    'ok'
  } elseif ($r.TlsOk) {
    Write-Host ("[受限] {0,-16} TLS 成功但 HTTP {1}" -f $ip, $r.HttpCode) -ForegroundColor Yellow
    'limited'
  } elseif ($null -ne $r.TcpMs) {
    Write-Host ("[阻断] {0,-16} TCP 通但 TLS 被重置（典型的地区性封锁特征）" -f $ip) -ForegroundColor Red
    'blocked'
  } else {
    Write-Host ("[超时] {0,-16} TCP 4000ms 内无响应" -f $ip) -ForegroundColor DarkGray
    'timeout'
  }
  if ($r.HttpCode -eq 200) { $working += $r }
}

if ($working.Count -eq 0) {
  Write-Host "`n所有备用 IP 在本机网络下均不可用——该运营商可能封锁了全部 Cloudflare 段。" -ForegroundColor Red
  Write-Host "hosts 方案无法解决，需要改用国内可达的反代/加速入口（如香港中转或腾讯 EdgeOne）。" -ForegroundColor Yellow
  Write-Host "请把本窗口完整截图发回。" -ForegroundColor Yellow
  exit 2
}

# --- 选最快的写入 hosts（幂等替换旧规则）---
$best = $working | Sort-Object TotalMs | Select-Object -First 1
$hosts = Get-Content $HostsPath -ErrorAction SilentlyContinue
$hosts = $hosts | Where-Object { $_ -notmatch [regex]::Escape($Marker) -and $_ -notmatch "^\s*[^#]*\s$([regex]::Escape($Hostname))\s*$" }
$hosts += ""
$hosts += "$Marker  $(Get-Date -Format 'yyyy-MM-dd HH:mm')  best=$($best.IP) delay=$($best.TotalMs)ms"
$hosts += "$($best.IP) $Hostname"
Set-Content -Path $HostsPath -Value $hosts -Encoding ASCII
ipconfig /flushdns | Out-Null

Write-Host "`n已写入 hosts：$($best.IP) -> $Hostname（耗时 $($best.TotalMs)ms）" -ForegroundColor Green
Write-Host "正在最终验证……" -ForegroundColor Cyan
Start-Sleep -Seconds 1
$check = Test-CFIp -IP $best.IP
if ($check.HttpCode -eq 200) {
  Write-Host "✅ 修复成功！请重新打开浏览器访问：https://$Hostname/" -ForegroundColor Green
  Write-Host "   如仍异常，按 Ctrl+F5 强制刷新，或重启浏览器。" -ForegroundColor Cyan
} else {
  Write-Host "⚠ 写入后验证未通过（HTTP $($check.HttpCode)），请把本窗口截图发回。" -ForegroundColor Yellow
}
Write-Host "`n如需恢复默认：以管理员运行  fix-cf-access.ps1 -Undo" -ForegroundColor DarkGray
