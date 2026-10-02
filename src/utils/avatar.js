/**
 * @file 头像兜底工具：用户未设置自定义头像时生成首字母 SVG 占位图
 */

/**
 * 根据名称首字母生成圆形 SVG 头像的 data URL
 * @param {string} name - 用户昵称或用户名；为空时使用兜底字母 U
 * @returns {string} 可直接用于 img src 的 SVG data URL
 */
export function letterAvatar(name) {
  const letter = (name || 'U').charAt(0).toUpperCase();
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">' +
        '<rect width="52" height="52" rx="26" fill="#c45620"/>' +
        '<text x="26" y="35" text-anchor="middle" fill="#fff" font-size="24" font-weight="bold">' +
        letter +
        '</text></svg>'
    )
  );
}
