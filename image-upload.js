/* Local image inspection only; these measurements are not a diagnosis. */
const ImageUpload = (() => {
  const maximumBytes = 15 * 1024 * 1024;
  function format(bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'image/png';
    if ([82, 73, 70, 70].every((value, i) => bytes[i] === value) && [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value)) return 'image/webp';
    return null;
  }
  function inspect(image, originalWidth = image.width, originalHeight = image.height) {
    const { width, height, data } = image;
    const gray = new Float32Array(width * height);
    let sum = 0, squares = 0, dark = 0, clipped = 0;
    for (let i = 0; i < gray.length; i++) {
      const value = .2126 * data[i * 4] + .7152 * data[i * 4 + 1] + .0722 * data[i * 4 + 2];
      gray[i] = value; sum += value; squares += value * value;
      if (value < 42) dark++;
      if (value > 240) clipped++;
    }
    let lapSum = 0, lapSquares = 0, count = 0;
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      lapSum += lap; lapSquares += lap * lap; count++;
    }
    const brightness = sum / gray.length;
    return { version: 1, width: originalWidth, height: originalHeight, decoded: true,
      brightness, contrast: Math.sqrt(Math.max(0, squares / gray.length - brightness ** 2)),
      sharpness: count ? Math.max(0, lapSquares / count - (lapSum / count) ** 2) : 0,
      darkFraction: dark / gray.length, clippedFraction: clipped / gray.length };
  }
  function valid(analysis) {
    return Boolean(analysis?.decoded === true && analysis.version === 1
      && Number.isInteger(analysis.width) && Number.isInteger(analysis.height)
      && analysis.width >= 64 && analysis.height >= 64 && analysis.width * analysis.height <= 40000000
      && ['brightness', 'contrast', 'sharpness', 'darkFraction', 'clippedFraction'].every(key => Number.isFinite(analysis[key]) && analysis[key] >= 0)
      && analysis.brightness <= 255 && analysis.contrast <= 255
      && analysis.darkFraction <= 1 && analysis.clippedFraction <= 1);
  }
  function portraitCanvas(image, document, maximumSide = 1600) {
    const width = image.naturalWidth, height = image.naturalHeight;
    const rotated = width > height;
    const scale = Math.min(1, maximumSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((rotated ? height : width) * scale);
    canvas.height = Math.round((rotated ? width : height) * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    if (rotated) context.rotate(Math.PI / 2);
    context.drawImage(image, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
    context.restore();
    return canvas;
  }
  return { maximumBytes, format, inspect, valid, portraitCanvas };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ImageUpload;
