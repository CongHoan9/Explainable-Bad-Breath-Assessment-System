const assert = require('node:assert/strict');
const { TONGUE_CAPTURE, advanceTongueCountdown, estimateTongueFraming, fitTongueFraming } = require('./camera-quality.js');

assert.equal(TONGUE_CAPTURE.duration, 2000);
let clock = { goodSince: 0, lastSampleAt: 0 };
for (let now = 150; now <= 1950; now += 150) {
  clock = advanceTongueCountdown(clock, { ready: now > 900 }, now);
  assert.equal(clock.goodSince, 0, 'alignment must run inside the capture window');
  assert.equal(clock.ready, false);
}
clock = advanceTongueCountdown(clock, { ready: true }, 2000);
assert.equal(clock.ready, true);
assert.equal(clock.remaining, 0);
assert.equal(clock.progress, 1);
const stale = advanceTongueCountdown(clock, { ready: true }, 3000);
assert.equal(stale.goodSince, 3000, 'a suspended stream cannot complete capture');

function imageAt(cx, cy, angle, size = 1) {
  const width = 150, height = 200, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = x - cx, dy = y - cy;
    const rx = Math.cos(angle) * dx + Math.sin(angle) * dy;
    const ry = -Math.sin(angle) * dx + Math.cos(angle) * dy;
    const inside = (rx / (23 * size)) ** 2 + (ry / (48 * size)) ** 2 < 1;
    data.set(inside ? [180, 90, 110, 255] : [30, 30, 30, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}
const scan = { x: 0, y: 0, width: 600, height: 800 };
for (const [cx, cy, angle, size] of [[75, 100, 0, 1], [95, 120, .3, .7], [60, 85, -.4, 1.2], [75, 100, Math.PI / 2, 1]]) {
  const detected = estimateTongueFraming(imageAt(cx, cy, angle, size));
  assert(detected);
  assert(Math.abs(detected.centerX * 150 - cx) < 1);
  assert(Math.abs(detected.centerY * 200 - cy) < 1);
  assert(Math.abs(Math.sin(detected.angle - angle)) < .03, 'estimated rotation straightens the long axis');
  const crop = fitTongueFraming(scan, detected, 600, 800);
  assert(Math.abs(crop.width / crop.height - .75) < 1e-9);
  const halfX = (Math.abs(Math.cos(crop.angle)) * crop.width + Math.abs(Math.sin(crop.angle)) * crop.height) / 2;
  const halfY = (Math.abs(Math.sin(crop.angle)) * crop.width + Math.abs(Math.cos(crop.angle)) * crop.height) / 2;
  const centerX = crop.x + crop.width / 2, centerY = crop.y + crop.height / 2;
  assert(centerX - halfX >= -1e-8 && centerX + halfX <= 600 + 1e-8);
  assert(centerY - halfY >= -1e-8 && centerY + halfY <= 800 + 1e-8);
}
assert.equal(estimateTongueFraming(imageAt(-1000, -1000, 0)), null);
assert.deepEqual(fitTongueFraming(scan, null, 600, 800), { ...scan, angle: 0 });
console.log('Two-second capture, translation, portrait/landscape rotation, scale and source-bound checks passed.');
