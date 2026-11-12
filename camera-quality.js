/* Lightweight camera checks. Alignment is a color/shape heuristic, not semantic
 * tongue recognition. Thresholds are deliberately centralized for device tuning.
 */
const TONGUE_CAPTURE = Object.freeze({
  width: 150,
  height: 200,
  duration: 2000,
  maximumFrameGap: 550,
  minimumBrightness: 65,
  maximumBrightness: 228,
  minimumSharpness: 28,
  maximumMotion: 9,
  outline: 'M90 55 C65 64 54 98 53 145 L56 235 C57 294 91 347 150 352 C209 347 243 294 244 235 L247 145 C246 98 235 64 210 55 C188 42 173 53 150 59 C127 53 112 42 90 55 Z'
});

function analyzeTongueFrame(image, previousGray, mask) {
  const { width, height, data } = image;
  const gray = new Float32Array(width * height);
  let brightness = 0, dark = 0, clipped = 0, count = 0;
  let redInside = 0, redTotal = 0, centerX = 0, centerY = 0, motion = 0;
  const regions = Array.from({ length: 6 }, () => ({ count: 0, red: 0 }));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, offset = i * 4;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2];
    const luminance = .2126 * r + .7152 * g + .0722 * b;
    gray[i] = luminance;
    const tongueColor = r > 65 && r - g > 22 && r > g * 1.18 && r > b * 1.06 && b > g * .9;
    if (tongueColor) redTotal++;
    if (!mask[i]) continue;
    count++;
    brightness += luminance;
    if (luminance < 42) dark++;
    if (r > 246 && g > 246 && b > 246) clipped++;
    if (previousGray?.length === gray.length) motion += Math.abs(luminance - previousGray[i]);
    const region = regions[Math.min(2, Math.floor(y / height * 3)) * 2 + (x < width / 2 ? 0 : 1)];
    region.count++;
    if (tongueColor) { redInside++; region.red++; centerX += x; centerY += y; }
  }
  let laplacian = 0, laplacianSquared = 0, edges = 0;
  // Exclude the guide boundary so a sharp silhouette cannot hide a blurred surface.
  const margin = 5;
  for (let y = margin; y < height - margin; y++) for (let x = margin; x < width - margin; x++) {
    const i = y * width + x;
    if (!mask[i] || !mask[i - margin] || !mask[i + margin] || !mask[i - width * margin] || !mask[i + width * margin]) continue;
    const value = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
    laplacian += value; laplacianSquared += value * value; edges++;
  }
  brightness /= Math.max(1, count);
  const sharpness = edges ? Math.max(0, laplacianSquared / edges - (laplacian / edges) ** 2) : 0;
  motion = previousGray?.length === gray.length ? motion / Math.max(1, count) : Infinity;
  const coverage = redInside / Math.max(1, count);
  const containment = redInside / Math.max(1, redTotal);
  // Require tongue-colored pixels across both sides and all three guide rows.
  const occupiedRegions = regions.filter(region => region.red / Math.max(1, region.count) > .14).length;
  const aligned = coverage >= .34 && containment >= .67 && occupiedRegions >= 5
    && Math.abs(centerX / Math.max(1, redInside) / width - .5) < .11
    && Math.abs(centerY / Math.max(1, redInside) / height - .51) < .15;
  const lighting = count > 0 && brightness >= TONGUE_CAPTURE.minimumBrightness
    && brightness <= TONGUE_CAPTURE.maximumBrightness && dark / count < .45 && clipped / count < .4;
  const sharp = sharpness >= TONGUE_CAPTURE.minimumSharpness;
  const stable = motion <= TONGUE_CAPTURE.maximumMotion;
  const issue = !lighting ? (brightness < TONGUE_CAPTURE.minimumBrightness || dark / Math.max(1, count) >= .45 ? 'dark' : 'bright')
    : !sharp ? 'blur' : !aligned ? 'alignment' : !stable ? 'motion' : null;
  return { gray, brightness, sharpness, motion, coverage, containment, lighting, sharp, aligned, stable, ready: !issue, issue };
}

function advanceTongueCountdown(clock, quality, now) {
  // A capture window lasts two seconds while alignment and frame selection run.
  // Quality controls which frame may be saved, not the duration of the window.
  const continuous = clock.goodSince !== null && clock.lastSampleAt !== null
    && now - clock.lastSampleAt <= TONGUE_CAPTURE.maximumFrameGap;
  const goodSince = continuous ? clock.goodSince : now;
  const elapsed = Math.max(0, now - goodSince);
  return { goodSince, lastSampleAt: now, remaining: Math.max(0, Math.ceil((TONGUE_CAPTURE.duration - elapsed) / 1000)), progress: Math.min(1, elapsed / TONGUE_CAPTURE.duration), ready: elapsed >= TONGUE_CAPTURE.duration };
}

// Map the visible guide through the video's object-fit: cover crop. Both the
// quality checks and saved photograph must use exactly the area inside the guide.
function computeTongueVideoCrop(frameWidth, frameHeight, videoWidth, videoHeight, guide, mirrored = false) {
  const scale = Math.max(frameWidth / videoWidth, frameHeight / videoHeight);
  const offsetX = (videoWidth - frameWidth / scale) / 2;
  const offsetY = (videoHeight - frameHeight / scale) / 2;
  const left = mirrored ? frameWidth - guide.left - guide.width : guide.left;
  return { x: offsetX + left / scale, y: offsetY + guide.top / scale, width: guide.width / scale, height: guide.height / scale };
}

// Estimate a centered, upright crop from the dominant tongue-colored component.
// This is a framing heuristic; it does not identify anatomy or detect lesions.
function estimateTongueFraming(image) {
  const { width, height, data } = image;
  const seen = new Uint8Array(width * height);
  const colored = index => {
    const r = data[index * 4], g = data[index * 4 + 1], b = data[index * 4 + 2];
    return r > 65 && r - g > 22 && r > g * 1.18 && r > b * 1.06 && b > g * .9;
  };
  let best = null, bestScore = 0;
  for (let seed = 0; seed < seen.length; seed++) {
    if (seen[seed] || !colored(seed)) continue;
    const pixels = [seed];
    seen[seed] = 1;
    let sx = 0, sy = 0;
    for (let head = 0; head < pixels.length; head++) {
      const index = pixels[head], x = index % width, y = Math.floor(index / width);
      sx += x; sy += y;
      const neighbors = [];
      if (x > 0) neighbors.push(index - 1);
      if (x + 1 < width) neighbors.push(index + 1);
      if (y > 0) neighbors.push(index - width);
      if (y + 1 < height) neighbors.push(index + width);
      for (const next of neighbors) if (!seen[next] && colored(next)) { seen[next] = 1; pixels.push(next); }
    }
    if (pixels.length < width * height * .008) continue;
    const cx = sx / pixels.length, cy = sy / pixels.length;
    const distance = Math.hypot(cx / width - .5, cy / height - .5);
    const score = pixels.length / (1 + distance * 6);
    if (score > bestScore) { best = { pixels, cx, cy }; bestScore = score; }
  }
  if (!best) return null;
  const { pixels, cx, cy } = best;
  let xx = 0, yy = 0, xy = 0;
  for (const index of pixels) {
    const x = index % width - cx, y = Math.floor(index / width) - cy;
    xx += x * x; yy += y * y; xy += x * y;
  }
  const eccentricity = Math.hypot(xx - yy, 2 * xy) / Math.max(1, xx + yy);
  let angle = .5 * Math.atan2(2 * xy, xx - yy) - Math.PI / 2;
  while (angle < -Math.PI / 2) angle += Math.PI;
  while (angle > Math.PI / 2) angle -= Math.PI;
  // A nearly round region has no reliable orientation.
  if (eccentricity < .12) angle = 0;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const index of pixels) {
    const x = index % width - cx, y = Math.floor(index / width) - cy;
    const rx = cos * x + sin * y, ry = -sin * x + cos * y;
    minX = Math.min(minX, rx); maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry); maxY = Math.max(maxY, ry);
  }
  const cropHeight = Math.max((maxY - minY + 1) / .76, (maxX - minX + 1) / .65 / .75);
  return { centerX: cx / width, centerY: cy / height, height: cropHeight / height, angle };
}

function fitTongueFraming(base, detected, videoWidth, videoHeight) {
  if (!detected) return { ...base, angle: 0 };
  const angle = detected.angle;
  let height = Math.min(videoHeight, Math.max(base.height * .3, base.height * detected.height));
  let width = height * .75;
  // The rotated rectangle must stay within the source, avoiding padded edges.
  const extentX = Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height;
  const extentY = Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height;
  const scale = Math.min(1, videoWidth / extentX, videoHeight / extentY);
  width *= scale; height *= scale;
  const halfX = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height) / 2;
  const halfY = (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height) / 2;
  const cx = Math.max(halfX, Math.min(videoWidth - halfX, base.x + detected.centerX * base.width));
  const cy = Math.max(halfY, Math.min(videoHeight - halfY, base.y + detected.centerY * base.height));
  return { x: cx - width / 2, y: cy - height / 2, width, height, angle };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { TONGUE_CAPTURE, analyzeTongueFrame, advanceTongueCountdown, computeTongueVideoCrop, estimateTongueFraming, fitTongueFraming };
