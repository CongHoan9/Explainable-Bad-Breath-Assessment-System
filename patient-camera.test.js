const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const camera = require('./camera-quality.js');
const timers = new Map();
const elements = new Map();
let timerId = 0, now = 0;
const element = id => {
  if (!elements.has(id)) elements.set(id, { hidden: false, textContent: '', style: { setProperty() {} },
    classList: { toggle() {}, remove() {} }, setAttribute() {} });
  return elements.get(id);
};
const context = vm.createContext({ ...camera, performance: { now: () => now },
  setTimeout: (callback, duration) => { timers.set(++timerId, { callback, duration }); return timerId; },
  clearTimeout: id => timers.delete(id), clearInterval() {},
  document: { hidden: false, getElementById: element, querySelector: element, addEventListener() {} },
  window: { addEventListener() {} },
  patientFlow: { operation: 0, stream: { getTracks: () => [] }, draft: { stage: 'camera', answers: Array(23).fill(null) } },
  renders: 0, renderPatientTab() { context.renders++; }, requirePatientSession: () => true });
vm.runInContext(fs.readFileSync('patient-camera.js', 'utf8'), context);
vm.runInContext('armTongueCapture()', context);
assert.equal(timers.size, 1);
assert.equal([...timers.values()][0].duration, 2000);
now = 500;
vm.runInContext(`
  tongueCameraState.best = { canvas: { toDataURL: () => 'data:image/jpeg;base64,aligned' }, quality: { ready: true, brightness: 130 } };
  tongueCameraState.clock.lastSampleAt = 1900;
  tongueCameraState.quality = { ready: false };
`, context);
now = 2000;
[...timers.values()][0].callback();
assert.equal(context.patientFlow.draft.stage, 'review');
assert.equal(context.patientFlow.draft.photo, 'data:image/jpeg;base64,aligned');
assert.equal(context.patientFlow.draft.captureQuality.ready, true);
assert.equal(timers.size, 0);
assert.equal(context.renders, 1);

// A window with no good frame must finish without saving an invalid image.
context.patientFlow.stream = { getTracks: () => [] };
context.patientFlow.draft = { stage: 'camera', answers: Array(23).fill(null) };
vm.runInContext('armTongueCapture()', context);
now = 4000;
[...timers.values()][0].callback();
assert.equal(context.patientFlow.draft.stage, 'camera');
assert.equal(context.patientFlow.draft.photo, undefined);
assert.equal(element('cameraCaptureError').hidden, false);
assert.equal(timers.size, 0);

// Cancellation clears the deadline; switching away cannot save a late image.
vm.runInContext('armTongueCapture(); cancelTongueCapture()', context);
assert.equal(timers.size, 0);
assert.equal(element('cameraCaptureError').hidden, true);

// Opening the file picker cancels an armed capture but keeps the preview alive.
let pickerClicks = 0;
element('tongueImageFile').click = () => { pickerClicks++; };
vm.runInContext('armTongueCapture(); chooseTongueImage()', context);
assert.equal(timers.size, 0);
assert.equal(pickerClicks, 1);
assert(context.patientFlow.stream);
console.log('Capture deadline, best-frame save, failure, cancellation and file picker checks passed.');
