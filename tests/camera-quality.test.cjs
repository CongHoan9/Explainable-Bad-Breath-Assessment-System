const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TONGUE_CAPTURE, analyzeTongueFrame, advanceTongueCountdown, computeTongueVideoCrop } = require('../camera-quality.js');

function fixture({ dark = false, blur = false, bright = false, shift = 0, fullFrame = false, variation = 0 } = {}) {
  const { width, height } = TONGUE_CAPTURE;
  const data = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    mask[index] = ((x - 75) / 48) ** 2 + ((y - 102) / 75) ** 2 < 1 ? 1 : 0;
    const tongue = fullFrame || ((x - 75 - shift) / 46) ** 2 + ((y - 102) / 73) ** 2 < 1;
    const texture = blur ? 0 : ((x + y) % 2 ? 7 : -7);
    const color = dark ? [25, 9, 12] : bright ? [253, 253, 253]
      : tongue ? [196 + texture + variation, 99 + texture + variation, 128 + texture + variation] : [30, 32, 34];
    data.set([...color, 255], index * 4);
  }
  return { image: { width, height, data }, mask };
}
function analyze(options, previous) {
  const { image, mask } = fixture(options);
  return analyzeTongueFrame(image, previous, mask);
}

test('accepts a textured, lit, centered candidate only after a stable frame', () => {
  const initial = analyze({});
  assert.equal(initial.ready, false);
  assert.equal(initial.issue, 'motion');
  const stable = analyze({}, initial.gray);
  assert.equal(stable.ready, true);
  assert.equal(stable.aligned, true);
});
test('rejects low light, clipping, blur, off-center placement and a filled frame', () => {
  assert.equal(analyze({ dark: true }).issue, 'dark');
  assert.equal(analyze({ bright: true }).issue, 'bright');
  assert.equal(analyze({ blur: true }).sharp, false);
  assert.equal(analyze({ shift: 45 }).aligned, false);
  assert.equal(analyze({ fullFrame: true }).aligned, false);
});
test('motion interrupts an otherwise acceptable frame', () => {
  const previous = analyze({}).gray;
  const moved = analyze({ variation: 22 }, previous);
  assert.equal(moved.stable, false);
  assert.equal(moved.ready, false);
});
test('capture requires a complete three-second interval', () => {
  let clock = { goodSince: null, lastSampleAt: null };
  for (let now = 0; now < 3000; now += 150) {
    clock = advanceTongueCountdown(clock, { ready: true }, now);
    assert.equal(clock.ready, false);
  }
  clock = advanceTongueCountdown(clock, { ready: true }, 3000);
  assert.equal(clock.ready, true);
});
test('any failing frame resets the entire interval', () => {
  let clock = { goodSince: null, lastSampleAt: null };
  for (let now = 0; now <= 2700; now += 150) clock = advanceTongueCountdown(clock, { ready: true }, now);
  clock = advanceTongueCountdown(clock, { ready: false }, 2850);
  assert.equal(clock.goodSince, null);
  for (let now = 3000; now < 6000; now += 150) {
    clock = advanceTongueCountdown(clock, { ready: true }, now);
    assert.equal(clock.ready, false);
  }
  assert.equal(advanceTongueCountdown(clock, { ready: true }, 6000).ready, true);
});
test('a stalled camera cannot advance the countdown using wall time alone', () => {
  let clock = advanceTongueCountdown({ goodSince: null, lastSampleAt: null }, { ready: true }, 0);
  clock = advanceTongueCountdown(clock, { ready: true }, 150);
  clock = advanceTongueCountdown(clock, { ready: true }, 4000);
  assert.equal(clock.ready, false);
  assert.equal(clock.goodSince, 4000);
  assert.equal(clock.remaining, 3);
});
test('full-screen camera crop matches the on-screen guide across aspect ratios', () => {
  for (const [frameWidth, frameHeight, videoWidth, videoHeight] of [[320, 568, 1280, 960], [390, 844, 600, 800], [800, 400, 1280, 960]]) {
    const width = Math.min(frameWidth - 32, (frameHeight - 220) * .75, 400);
    const guide = { left: (frameWidth - width) / 2, top: 64, width, height: width / .75 };
    const crop = computeTongueVideoCrop(frameWidth, frameHeight, videoWidth, videoHeight, guide);
    const scale = Math.max(frameWidth / videoWidth, frameHeight / videoHeight);
    const offsetX = (videoWidth - frameWidth / scale) / 2;
    const offsetY = (videoHeight - frameHeight / scale) / 2;
    assert.ok(Math.abs((crop.x - offsetX) * scale - guide.left) < .001);
    assert.ok(Math.abs((crop.y - offsetY) * scale - guide.top) < .001);
    assert.ok(Math.abs(crop.width / crop.height - .75) < .001);
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= videoWidth && crop.y + crop.height <= videoHeight);
  }
});
test('front-camera mirroring maps an off-center guide to the opposite source side', () => {
  const guide = { left: 20, top: 60, width: 180, height: 240 };
  const normal = computeTongueVideoCrop(320, 568, 1280, 960, guide);
  const mirrored = computeTongueVideoCrop(320, 568, 1280, 960, guide, true);
  assert.ok(Math.abs(mirrored.x - (1280 - normal.x - normal.width)) < .001);
  assert.equal(mirrored.y, normal.y);
});
