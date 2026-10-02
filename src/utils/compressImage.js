/**
 * @file 图片压缩：按比例缩放大图并导出 JPEG data URL，用于上传前降低体积
 */

/**
 * 将图片文件等比压缩为 JPEG data URL
 * @param {File} file - 用户选择的原始图片文件
 * @param {object} [opts={}] - 压缩参数
 * @param {number} [opts.maxWidth=1024] - 允许的最大宽度（px）
 * @param {number} [opts.maxHeight=1024] - 允许的最大高度（px）
 * @param {number} [opts.quality=0.85] - JPEG 输出质量，取值 0~1
 * @returns {Promise<string>} 压缩后的 JPEG data URL；读取或解码失败时 Promise reject
 */
export function compressImage(file, { maxWidth = 1024, maxHeight = 1024, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.onload = () => {
        let { width, height } = img;
        // 仅在任一维度超限时等比缩小，缩放比取宽高方向的较小值以保证两者都不超限
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
