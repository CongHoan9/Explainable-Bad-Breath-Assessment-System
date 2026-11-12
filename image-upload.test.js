const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const upload = require('./image-upload.js');
const catalog = require('./demo-images.js');
const explanation = require('./assessment-explanation.js');
const camera = require('./camera-quality.js');

assert.equal(upload.format(Uint8Array.from([255, 216, 255, 0])), 'image/jpeg');
assert.equal(upload.format(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
assert.equal(upload.format(Buffer.from('RIFF0000WEBP')), 'image/webp');
assert.equal(upload.format(Buffer.from('<svg>')), null);
assert.equal(upload.format(new Uint8Array()), null);

const gray = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(100) };
const analysis = upload.inspect(gray, 1920, 1080);
assert(upload.valid(analysis));
assert(Math.abs(analysis.brightness - 100) < 1e-6);
assert.equal(analysis.contrast, 0);
assert.equal(analysis.sharpness, 0);
assert(!upload.valid({ ...analysis, width: 0 }));
assert(!upload.valid({ ...analysis, brightness: NaN }));

assert.equal(catalog.entries.length, 8);
for (const item of catalog.entries) {
  for (const [path, role] of [[item.original, 'original'], [item.reference, 'reference']]) {
    const bytes = fs.readFileSync(path);
    assert.equal(upload.format(bytes), 'image/jpeg');
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.deepEqual(catalog.byHash(hash), { id: item.id, role });
  }
}
assert.equal(catalog.byHash('unrelated'), null);
assert.equal(catalog.byId('unrelated'), null);

const nodes = new Map(), canvases = [];
const element = id => {
  if (!nodes.has(id)) nodes.set(id, { classList: { remove() {} } });
  return nodes.get(id);
};
const context = vm.createContext({ ...camera, ImageUpload: upload, DemoImageCatalog: catalog, AssessmentExplanation: explanation,
  crypto: crypto.webcrypto, clearInterval() {}, clearTimeout() {},
  document: { querySelector: element, getElementById: element, addEventListener() {}, createElement(tag) {
    assert.equal(tag, 'canvas');
    const canvas = { width: 0, height: 0, rotations: [], getContext: () => ({ fillRect() {}, drawImage() {},
      save() {}, restore() {}, translate() {}, rotate: angle => canvas.rotations.push(angle),
      getImageData: () => gray }), toDataURL: () => 'data:image/jpeg;base64,uploaded' };
    canvases.push(canvas); return canvas;
  } }, window: { addEventListener() {} },
  patientFlow: { operation: 0, tab: 'diagnosis', draft: { stage: 'guide' } },
  newAssessmentDraft: () => ({ answers: Array(23).fill(null), stage: 'guide' }),
  renderPatientTab() {}, requirePatientSession: () => true,
  patientIcon: name => `<i>${name}</i>`, escapePatientText: value => String(value ?? ''),
  renderPatientStage: (body, actions) => body + actions });
vm.runInContext(fs.readFileSync('patient-camera.js', 'utf8'), context);
vm.runInContext('decodeTongueUpload = async () => ({ naturalWidth: 1920, naturalHeight: 1080 })', context);

function file(bytes, name = 'renamed.jpg') {
  return { name, size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
}
async function run() {
  const original = fs.readFileSync(catalog.entries[0].original);
  await context.uploadTongueImage({ files: [file(original)] });
  const record = context.patientFlow.draft;
  assert.equal(record.stage, 'review');
  assert.equal(record.photoKind, 'upload');
  assert.equal(record.demoImageId, catalog.entries[0].id, 'renaming must not affect exact-byte matching');
  assert.equal(record.demoImageRole, 'original');
  assert.equal(record.imageAnalysis.width, 1080);
  assert.equal(record.imageAnalysis.height, 1920);
  assert.equal(record.imageAnalysis.sourceWidth, 1920);
  assert.equal(canvases.at(-1).width, 900);
  assert.equal(canvases.at(-1).height, 1600);
  assert.deepEqual(canvases.at(-1).rotations, [Math.PI / 2], 'landscape pixels are saved upright');
  const portrait = upload.portraitCanvas({ naturalWidth: 1080, naturalHeight: 1920 }, context.document);
  assert.equal(portrait.width, 900);
  assert.equal(portrait.height, 1600);
  assert.deepEqual(portrait.rotations, [], 'an already upright image must not rotate again');
  assert(explanation.usableImage(record));
  assert.equal(explanation.decide({ ...record, warningSigns: [], warningScreened: true }).needsRetake, false);
  assert.equal(explanation.decide({ ...record, warningSigns: [], warningScreened: true }).canShowLevel, false, 'pixel statistics must not fabricate a model result');
  context.confirmTonguePhoto();
  assert.equal(context.patientFlow.draft.stage, 'questions');

  await context.uploadTongueImage({ files: [file(Buffer.from([255, 216, 255, 0]))] });
  assert.equal(context.patientFlow.draft.demoImageId, null, 'an unrelated image must not get a paired demo');
  const previous = context.patientFlow.draft;
  await context.uploadTongueImage({ files: [] });
  assert.equal(context.patientFlow.draft, previous, 'closing the picker changes nothing');
  await context.uploadTongueImage({ files: [file(Buffer.from('not an image'))] });
  assert.equal(context.patientFlow.draft.stage, 'guide');
  assert(context.patientFlow.error.includes('JPG'));
  await context.uploadTongueImage({ files: [{ size: upload.maximumBytes + 1 }] });
  assert(context.patientFlow.error.includes('15 MB'));

  let resolveDecode;
  context.decodeTongueUpload = () => new Promise(resolve => { resolveDecode = resolve; });
  const pending = context.uploadTongueImage({ files: [file(original)] });
  await new Promise(resolve => setImmediate(resolve));
  context.cancelTongueUpload();
  resolveDecode({ naturalWidth: 1920, naturalHeight: 1080 });
  await pending;
  assert.equal(context.patientFlow.draft.stage, 'guide', 'canceled decode cannot overwrite the current flow');

  vm.runInContext(fs.readFileSync('patient-results.js', 'utf8'), context);
  context.patientFlow.overlay = true;
  const result = context.renderUploadedTongueAnalysis(record);
  assert(result.includes(encodeURI(catalog.entries[0].reference)));
  assert(!result.includes('<svg'), 'uploaded files must not show a fabricated heatmap');
  assert(result.includes('1080 × 1920'));
  assert(result.includes('onload="orientUploadedResultImage(this)"'));
  const properties = new Map();
  let isLandscape = false;
  const frame = { classList: { toggle: (name, value) => { isLandscape = value; } }, style: { setProperty: (name, value) => properties.set(name, value) } };
  context.orientUploadedResultImage({ naturalWidth: 1920, naturalHeight: 1080, parentElement: frame });
  assert.equal(isLandscape, true, 'reference and legacy images must also display upright');
  assert.equal(frame.style.aspectRatio, '1080 / 1920');
  assert(Math.abs(parseFloat(properties.get('--upright-image-width')) - 177.777777) < .001);
  context.orientUploadedResultImage({ naturalWidth: 900, naturalHeight: 1600, parentElement: frame });
  assert.equal(isLandscape, false, 'normalized uploads are never double-rotated');
  context.patientFlow.overlay = false;
  assert(context.renderUploadedTongueAnalysis(record).includes(record.photo));
  const shortcut = context.renderCaptureUploadShortcut();
  assert(shortcut.includes('type="file"') && shortcut.includes('Tải ảnh lên'));
  assert(!shortcut.includes('Chọn ảnh demo'));
  console.log('All 16 demo files, upload validation, pairing, cancellation, image sizing and result rendering checks passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
