import './style.css';
import sampleUrl from '../fixtures/single_boss.stl?url';
import defaultProfileUrl from './assets/default-bambu-settings.3mf?url';
import { extrudeFootprint } from './core/extrude';
import { parseStl, validateMesh, type MeshData, type MeshStats } from './core/mesh';
import { analyseMesh, horizontalRoot, smartFill, type MeshAnalysis, type SurfaceRegion } from './core/selection';
import { deriveAnchor, validateAnchorSettings, type Anchor } from './core/anchors';
import { exportBambu3mf, type ModifierPart } from './export/bambu-3mf';
import { readBambuProfile, type BambuProfile } from './export/profile';
import { Viewer } from './viewer';
import { directionFromFace, orientMesh, planarFaces } from './core/orientation';

const el = (id: string) => document.getElementById(id)!;
const input = (id: string) => el(id) as HTMLInputElement;
const button = (id: string) => el(id) as HTMLButtonElement;
const text = (error: unknown) => error instanceof Error ? error.message : String(error);
const mm = (n: number) => Number(n.toFixed(3)).toString();
let viewer: Viewer | undefined;
let viewerError = '';
let model: MeshData | undefined;
let originalModel: MeshData | undefined;
let stats: MeshStats | undefined;
let modelName = 'model';
let analysis: MeshAnalysis | undefined;
let region: SurfaceRegion | undefined;
let candidate: Anchor | undefined;
let anchors: Anchor[] = [];
let history: Anchor[][] = [];
let modifiers: ModifierPart[] = [];
let chooseRoot = false;
let chooseOrientation = false;
let selectionError = '';
let selectionAdjustment = '';
let modelError = '';
let profileError = '';
let exportNotice = '';
let loading = false;
let nextId = 1;
let request = 0;
let profileRequest = 0;
let profile: BambuProfile | undefined;
const hoverRegions = new Map<number, SurfaceRegion>();
const baseRegions = new Map<number, number[]>();
const confirmed = () => !!model && input('confirm').checked;
const dimensionDialog = el('dimension-dialog') as HTMLDialogElement;
let pendingPick: { face: number; modelRequest: number } | undefined;
let settingsFrame: number | undefined;
type SliderSetting = 'depth' | 'overlap';

try { viewer = new Viewer(el('viewport')); }
catch { viewerError = '3D selection needs WebGL. Enable hardware acceleration or use another browser.'; el('viewport').textContent = viewerError; }

function fingerprint(anchor: Anchor) {
  return [anchor.footprint.outer, ...anchor.footprint.holes].map(loop => loop.map(p => p.map(x => x.toFixed(3)).join(',')).sort().join(';')).sort().join('|');
}
function alreadyAdded(anchor: Anchor) {
  const key = fingerprint(anchor);
  return anchors.some(a => Math.abs(a.rootZ - anchor.rootZ) < 1e-5 && fingerprint(a) === key);
}
function idleHint() {
  if (chooseOrientation) return 'Click the flat bottom face that should sit on the print bed.';
  return !confirmed() ? 'Click a side face to confirm its size and start.' : chooseRoot
    ? 'Click the flat top of the supporting base.' : region
      ? 'Review your selection, or click another side face.' : 'Hover a blue side face, then click to select.';
}
function hint(message = idleHint(), state = '') {
  el('hover-info').textContent = message;
  el('canvas-hint').dataset.state = state;
}
function showSelection(title: string, description: string, state = 'idle') {
  el('selection-title').textContent = title;
  el('selection-info').textContent = description;
  el('selection-card').dataset.state = state;
}
function readableError(error: string) {
  if (/joined|branched|irregular|cross-section changes/.test(error)) return ['This feature is not supported yet', 'This outline joins other shapes or changes with height. Try an isolated round post or a straight rectangular wall.'];
  if (/upright|Slopes/.test(error)) return ['Click a blue side face', 'Select an upright side of a post or wall. Flat tops are used to identify the supporting base.'];
  if (/Base height|upward-facing horizontal/.test(error)) return ['Choose the flat base beneath the feature', 'Click the top surface of the material this feature stands on.'];
  return ['Check this selection', error];
}
function renderTargets() {
  const list = el('targets'); list.replaceChildren();
  el('target-count').textContent = String(anchors.length);
  if (!anchors.length) {
    const note = document.createElement('p'); note.className = 'empty-list'; note.textContent = 'Your added modifiers will appear here.'; list.append(note);
  }
  for (const anchor of anchors) {
    const row = document.createElement('div'); row.className = 'target';
    const dot = document.createElement('span'); dot.className = 'target-dot';
    const label = document.createElement('div'); label.className = 'target-text';
    label.textContent = `${anchor.kind === 'boss' ? 'Post' : 'Wall'} ${anchor.id}`;
    const detail = document.createElement('small'); detail.textContent = `Up to ${mm(anchor.maxDepth)} mm into base`;
    label.append(detail);
    const remove = document.createElement('button'); remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove modifier ${anchor.id}`); remove.title = `Remove modifier ${anchor.id}`;
    remove.addEventListener('click', () => {
      history.push([...anchors]); anchors = anchors.filter(a => a.id !== anchor.id); exportNotice = ''; update();
    });
    row.append(dot, label, remove); list.append(row);
  }
}
function makePart(anchor: Anchor, depth: number, overlap: number, wallLoops: number): ModifierPart {
  validateAnchorSettings(anchor, depth, overlap);
  return { name: `${modelName}_anchor_${anchor.id}`, wallLoops, mesh: extrudeFootprint(anchor.footprint, anchor.rootZ, depth, overlap) };
}
function fitNewSelection() {
  if (!candidate) return;
  const targets = [...anchors, candidate];
  const adjusted: string[] = [];
  for (const [setting, limit, fallback, label] of [
    ['depth', Math.min(...targets.map(a => a.maxDepth)), 3, 'Depth'],
    ['overlap', Math.min(...targets.map(a => a.topZ - a.rootZ)), 2, 'Overlap'],
  ] as const) {
    const current = Number(input(setting).value);
    const next = Math.min(Number.isFinite(current) && current > 0 ? current : fallback, limit);
    if (current !== next) {
      input(setting).value = String(next);
      // Use the same native range step as a slider gesture, avoiding long STL
      // float32 tails in the initial value and keeping thumb/number in sync.
      updateSlider(setting, [limit]);
      input(setting).value = input(`${setting}-slider`).value;
      adjusted.push(`${label} set to ${mm(Number(input(setting).value))} mm`);
    }
  }
  selectionAdjustment = adjusted.length ? `${adjusted.join('; ')} to fit ${anchors.length ? 'all selected features' : 'this feature'}.` : '';
}
function updateSlider(setting: SliderSetting, limits: number[]) {
  const slider = input(`${setting}-slider`);
  slider.disabled = !confirmed() || !limits.length;
  if (!limits.length) {
    input(setting).removeAttribute('max');
    el(`${setting}-range-hint`).textContent = `Select a surface to set the ${setting} range.`;
    return;
  }
  const limit = Math.min(...limits);
  const step = Math.min(limit / 10, limit >= 1 ? 0.1 : 0.01);
  slider.min = String(step); slider.max = String(limit); slider.step = String(step);
  input(setting).max = String(limit);
  const value = Number(input(setting).value);
  slider.value = String(Number.isFinite(value) ? Math.max(step, Math.min(limit, value)) : step);
  slider.setAttribute('aria-valuetext', `${mm(Number(slider.value))} millimetres`);
  el(`${setting}-range-hint`).textContent = `${mm(step)}–${mm(limit)} mm available${anchors.length ? ' · shared by all modifiers' : ''}`;
}
function update() {
  const ready = confirmed();
  for (const id of ['depth', 'walls', 'angle', 'overlap']) input(id).disabled = !ready;
  const targets = [...anchors, ...(candidate ? [candidate] : [])];
  updateSlider('depth', targets.map(a => a.maxDepth));
  updateSlider('overlap', targets.map(a => a.topZ - a.rootZ));
  el('confirm-row').hidden = !model;
  el('orientation-tools').hidden = !model;
  el('reset-orientation').hidden = !model || model === originalModel;
  el('orientation-note').hidden = !chooseOrientation && model === originalModel;
  button('orient-model').textContent = chooseOrientation ? 'Cancel orientation' : 'Model sideways? Set upright';
  for (const id of ['empty-state']) el(id).hidden = !!model;
  for (const id of ['view-tools', 'canvas-hint', 'legend']) el(id).hidden = !model;
  button('open-stl').textContent = model ? 'Replace STL' : 'Open STL';
  button('sample').hidden = !!model;
  button('undo').disabled = !history.length;
  el('clear-selection').hidden = !region && !selectionError && !chooseOrientation;
  el('choose-root').hidden = !region;
  button('choose-root').className = candidate ? 'text-button' : 'secondary';
  button('choose-root').textContent = chooseRoot ? 'Waiting for a base click…' : candidate ? 'Change base surface' : 'Pick base surface';
  button('choose-root').disabled = chooseRoot;
  el('add-target').hidden = !candidate;
  button('add-target').disabled = true;
  el('selection-facts').hidden = true;
  el('selection-facts').replaceChildren();
  el('root-legend').hidden = !candidate;
  const progress = ready ? (anchors.length ? 3 : 2) : 1;
  ['model', 'select', 'export'].forEach((name, i) => {
    el(`progress-${name}`).dataset.state = i + 1 === progress ? 'active' : i + 1 < progress ? 'done' : '';
  });
  let settingsError = '', candidateError = '';
  const preview: MeshData[] = [];
  modifiers = [];
  if (model) {
    const depth = Number(input('depth').value), overlap = Number(input('overlap').value), walls = Number(input('walls').value);
    try {
      if (!Number.isInteger(walls) || walls < 1 || walls > 100) throw new Error('Walls must be a whole number from 1 to 100.');
      if (!Number.isFinite(depth) || depth <= 0) throw new Error('Enter a depth greater than 0 mm.');
      if (!Number.isFinite(overlap) || overlap <= 0) throw new Error('Enter an overlap greater than 0 mm in Advanced options.');
      modifiers = anchors.map(a => makePart(a, depth, overlap, walls));
      preview.push(...modifiers.map(m => m.mesh));
      if (candidate) {
        try { preview.push(makePart(candidate, depth, overlap, walls).mesh); }
        catch (error) { candidateError = text(error); }
      }
    } catch (error) { settingsError = text(error); modifiers = []; }
    viewer?.setPreview(preview, region?.triangles ?? [], candidate ? { footprint: candidate.footprint, z: candidate.rootZ } : undefined);
  }
  if (!model) showSelection(loading ? 'Loading your model…' : 'Choose a model first', 'Then confirm its dimensions to start selecting.');
  else if (chooseOrientation) showSelection('Choose the face for the print bed', selectionError || 'Click the flat underside that should sit on the print bed. Drag to see it if needed.', selectionError ? 'error' : 'base');
  else if (!ready) showSelection('Click a side face to start', 'We’ll ask you to confirm the size, then select that surface. You can also confirm the dimensions above.');
  else if (settingsError || candidateError) showSelection('Adjust the modifier settings', settingsError || candidateError, 'error');
  else if (selectionError) { const [title, description] = readableError(selectionError); showSelection(title, description, 'error'); }
  else if (chooseRoot) showSelection('Click the supporting base', 'Pick its flat top next to the selected feature. The hover preview turns purple.', 'base');
  else if (candidate) {
    const duplicate = alreadyAdded(candidate);
    showSelection(duplicate ? 'This feature is already added' : candidate.kind === 'boss' ? 'Round post selected' : 'Straight wall selected', duplicate
      ? 'Choose another feature. Changing the depth or walls updates all added modifiers.'
      : `${selectionAdjustment ? selectionAdjustment + ' ' : ''}Check the purple outline at its base, then add this modifier.`, 'ready');
    button('add-target').disabled = duplicate;
    el('selection-facts').hidden = false;
    for (const fact of [`Up to ${mm(candidate.maxDepth)} mm depth`, `Base at ${mm(candidate.rootZ - stats!.bounds.min[2])} mm`, ...(candidate.footprint.holes.length ? ['Hole preserved'] : []), ...(candidate.overlapLimitedByCap ? ['Overlap stops below cap'] : [])]) {
      const chip = document.createElement('span'); chip.className = 'fact'; chip.textContent = fact; el('selection-facts').append(chip);
    }
  } else if (region) showSelection('Where does this feature meet the base?', 'This side continues below its starting point. Pick the flat supporting base to set the modifier depth.', 'base');
  else showSelection('Hover to find a surface', 'Click a blue side of an upright post or wall. Drag the model to see another side.');
  const status = el('status');
  const error = viewerError || modelError || profileError || settingsError;
  status.classList.toggle('error', !!error);
  status.textContent = error || (loading ? 'Loading and checking your STL…' : !model ? 'Open an STL or try the sample to begin.' : !ready
    ? 'Click the model to confirm its size and start selecting.' : !anchors.length ? 'Select a surface and add your first modifier.'
      : exportNotice || `${anchors.length} modifier${anchors.length === 1 ? '' : 's'} ready. Select more surfaces or export.`);
  button('export').disabled = !ready || !modifiers.length || !profile || !!error || chooseOrientation;
  el('export-note').textContent = profile && el('profile-info').dataset.source === 'custom'
    ? `Using ${profile.printer} settings. Modifiers stay aligned in one project.`
    : 'Includes default P1S 0.4 settings. Choose your printer and material in Bambu Studio.';
  renderTargets(); hint();
}
function reset() {
  cancelDimensionPrompt();
  if (settingsFrame !== undefined) cancelAnimationFrame(settingsFrame);
  settingsFrame = undefined;
  model = undefined; originalModel = undefined; analysis = undefined; stats = undefined; region = undefined; candidate = undefined;
  anchors = []; history = []; nextId = 1; chooseRoot = false; chooseOrientation = false; selectionError = ''; selectionAdjustment = ''; exportNotice = ''; modelError = '';
  input('confirm').checked = false; hoverRegions.clear(); baseRegions.clear(); viewer?.clear();
  el('model-name').textContent = 'Loading your STL…'; el('dimensions').textContent = '';
  update();
}
async function loadFile(file: File) {
  const current = ++request; loading = true; reset();
  try {
    if (!/\.stl$/i.test(file.name)) throw new Error('Choose an STL file. Other model formats are not supported yet.');
    if (file.size > 100 * 1024 * 1024) throw new Error('Choose an STL smaller than 100 MB.');
    const bytes = await file.arrayBuffer(); if (current !== request) return;
    acceptModel(parseStl(bytes), file.name.replace(/\.stl$/i, ''));
  } catch (error) { if (current === request) loadError(error); }
  finally { if (current === request) { loading = false; update(); } }
}
function loadError(error: unknown) {
  model = undefined; analysis = undefined; modelError = text(error);
  el('model-name').textContent = 'Could not open this STL'; el('dimensions').textContent = 'Choose another file to try again.';
}
function acceptModel(loaded: MeshData, name: string, original = loaded) {
  const checked = analyseMesh(loaded);
  stats = validateMesh(loaded); analysis = checked; model = loaded; originalModel = original; modelName = name;
  el('model-name').textContent = `${name}.stl`;
  el('dimensions').textContent = `${stats.dimensions.map(n => n.toFixed(1)).join(' × ')} mm`;
  viewer?.setModel(model, analysis.normals);
  input('xray').checked = false; viewer?.setXray(false);
}
async function loadSample() {
  const current = ++request; loading = true; reset(); input('stl').value = '';
  try {
    const response = await fetch(sampleUrl); if (!response.ok) throw new Error('Could not load the sample. Try opening an STL.');
    const bytes = await response.arrayBuffer(); if (current !== request) return;
    acceptModel(parseStl(bytes), 'sample_hollow_post');
  } catch (error) { if (current === request) loadError(error); }
  finally { if (current === request) { loading = false; update(); } }
}
function filled(face: number) {
  if (!analysis) throw new Error('Load a model first.');
  const cached = hoverRegions.get(face); if (cached) return cached;
  const result = smartFill(analysis, face, Number(input('angle').value));
  for (const triangle of result.triangles) hoverRegions.set(triangle, result);
  return result;
}
function pick(face: number) {
  if (!analysis) return;
  if (chooseOrientation) {
    try { applyOrientation(orientMesh(model!, directionFromFace(analysis, face))); }
    catch (error) { selectionError = text(error); update(); }
    return;
  }
  if (!confirmed()) { promptDimensions(face); return; }
  exportNotice = ''; selectionError = ''; selectionAdjustment = ''; candidate = undefined;
  try {
    if (chooseRoot && region) {
      const root = horizontalRoot(analysis, face);
      candidate = deriveAnchor(analysis, region, root, String(nextId)); chooseRoot = false;
    } else {
      region = undefined;
      region = filled(face);
      if (region.proposedRoot !== undefined) candidate = deriveAnchor(analysis, region, region.proposedRoot, String(nextId));
    }
    fitNewSelection();
  } catch (error) { selectionError = text(error); }
  update();
}
function hover(face?: number) {
  if (!analysis || face === undefined) { viewer?.setHover([]); hint(); return; }
  try {
    if (chooseRoot || chooseOrientation) {
      if (chooseOrientation) directionFromFace(analysis, face);
      else horizontalRoot(analysis, face);
      let faces = baseRegions.get(face);
      if (!faces) {
        faces = planarFaces(analysis, face);
        for (const triangle of faces) baseRegions.set(triangle, faces);
      }
      viewer?.setHover(faces, true); hint(chooseOrientation ? 'Flat face · click to lay this on the print bed' : 'Flat base surface · click to set the base', 'base');
    } else {
      const surface = filled(face);
      viewer?.setHover(surface.triangles); hint(confirmed() ? 'Side surface · click to check this feature' : 'Side surface · click to confirm size and select', 'side');
    }
  } catch {
    viewer?.setHover([]);
    hint(chooseRoot || chooseOrientation ? 'Move onto the flat top of the supporting base.' : 'Move onto a blue upright side face.', 'invalid');
  }
}
if (viewer) { viewer.onPick = pick; viewer.onHover = hover; }
function cancelDimensionPrompt() {
  pendingPick = undefined;
  if (dimensionDialog.open) dimensionDialog.close();
}
function promptDimensions(face: number) {
  if (!stats || dimensionDialog.open) return;
  pendingPick = { face, modelRequest: request };
  el('dimension-filename').textContent = `${modelName}.stl`;
  ['x', 'y', 'z'].forEach((axis, i) => { el(`dimension-${axis}`).textContent = stats!.dimensions[i].toFixed(1); });
  dimensionDialog.showModal();
}
button('confirm-dimensions').addEventListener('click', () => {
  const pending = pendingPick;
  cancelDimensionPrompt();
  if (!pending || pending.modelRequest !== request || !analysis) return;
  input('confirm').checked = true;
  pick(pending.face);
});
button('cancel-dimensions').addEventListener('click', cancelDimensionPrompt);
dimensionDialog.addEventListener('cancel', () => { pendingPick = undefined; });
function clearSelection() { region = undefined; candidate = undefined; chooseRoot = false; chooseOrientation = false; selectionError = ''; selectionAdjustment = ''; update(); }
function applyOrientation(oriented: MeshData) {
  // Validate before discarding targets. Reorient every part together by deriving
  // new targets in this explicit build frame; the disk file is never modified.
  analyseMesh(oriented); validateMesh(oriented);
  const original = originalModel!, name = modelName;
  ++request; reset(); acceptModel(oriented, name, original); update();
}
button('orient-model').addEventListener('click', () => {
  if (chooseOrientation) { clearSelection(); return; }
  cancelDimensionPrompt(); region = undefined; candidate = undefined; chooseRoot = false;
  chooseOrientation = true; selectionError = ''; update();
});
button('reset-orientation').addEventListener('click', () => { if (originalModel) applyOrientation(originalModel); });
function undo() { if (history.length) { anchors = history.pop()!; exportNotice = ''; update(); } }
for (const id of ['open-stl', 'empty-open']) button(id).addEventListener('click', () => { input('stl').value = ''; input('stl').click(); });
input('stl').addEventListener('change', () => { const file = input('stl').files?.[0]; if (file) void loadFile(file); });
button('sample').addEventListener('click', loadSample);
input('confirm').addEventListener('change', () => { if (!confirmed()) clearSelection(); update(); });
for (const id of ['depth', 'overlap', 'walls']) input(id).addEventListener('input', () => { exportNotice = ''; selectionAdjustment = ''; update(); });
function commitSlider(setting: SliderSetting, flush = false) {
  input(setting).value = input(`${setting}-slider`).value; exportNotice = ''; selectionAdjustment = '';
  button('export').disabled = true; button('add-target').disabled = true;
  if (flush) {
    if (settingsFrame !== undefined) cancelAnimationFrame(settingsFrame);
    settingsFrame = undefined; update();
  } else if (settingsFrame === undefined) settingsFrame = requestAnimationFrame(() => { settingsFrame = undefined; update(); });
}
for (const setting of ['depth', 'overlap'] as const) {
  const slider = input(`${setting}-slider`);
  slider.addEventListener('input', () => commitSlider(setting));
  slider.addEventListener('change', () => commitSlider(setting, true));
  slider.addEventListener('pointerup', () => commitSlider(setting, true));
  slider.addEventListener('keyup', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) commitSlider(setting, true);
  });
}
input('angle').addEventListener('input', () => { hoverRegions.clear(); if (region) { chooseRoot = false; pick(region.seed); } });
button('choose-root').addEventListener('click', () => { chooseRoot = true; candidate = undefined; selectionError = ''; update(); });
button('clear-selection').addEventListener('click', clearSelection);
button('add-target').addEventListener('click', () => {
  if (!candidate || button('add-target').disabled) return;
  history.push([...anchors]); anchors.push(candidate); nextId++; clearSelection();
});
button('undo').addEventListener('click', undo);
input('xray').addEventListener('change', () => viewer?.setXray(input('xray').checked));
function view(top = false) { viewer?.fitView(top); el('view-top').setAttribute('aria-pressed', String(top)); el('view-3d').setAttribute('aria-pressed', String(!top)); }
button('fit-view').addEventListener('click', () => view());
button('view-3d').addEventListener('click', () => view());
button('view-top').addEventListener('click', () => view(true));
document.addEventListener('keydown', event => {
  if (dimensionDialog.open) return;
  if ((event.target as HTMLElement)?.matches('input, textarea, select')) return;
  if (event.key === 'Escape') clearSelection();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
});
const workspace = el('viewport').parentElement!;
const isFileDrag = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
const clearFileDrag = () => workspace.classList.remove('drag-over');
// There is no drag-out action. Selected text and native file-input labels must
// not start browser/host drags; external files do not fire dragstart in this page.
document.addEventListener('dragstart', event => event.preventDefault());
workspace.addEventListener('dragover', event => {
  if (!isFileDrag(event)) { clearFileDrag(); return; }
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
  workspace.classList.add('drag-over');
});
workspace.addEventListener('dragleave', event => { if (!workspace.contains(event.relatedTarget as Node)) clearFileDrag(); });
workspace.addEventListener('drop', event => {
  clearFileDrag();
  if (!isFileDrag(event)) return;
  event.preventDefault();
  const file = event.dataTransfer?.files[0]; if (file) { input('stl').value = ''; void loadFile(file); }
});
document.addEventListener('drop', clearFileDrag);
document.addEventListener('dragend', clearFileDrag);
document.addEventListener('keydown', event => { if (event.key === 'Escape') clearFileDrag(); });
window.addEventListener('blur', clearFileDrag);
button('export').addEventListener('click', () => {
  if (!model || !profile || button('export').disabled) return;
  try {
    const archive = exportBambu3mf({ name: modelName, model, modifiers, profile });
    const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'model/3mf' }));
    const link = document.createElement('a'); link.href = url; link.download = `${modelName}_modifiers.3mf`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    exportNotice = '3MF exported. Open it as a project in Bambu Studio.'; update();
  } catch (error) { el('status').textContent = text(error); el('status').classList.add('error'); }
});
async function useDefaultProfile() {
  const current = ++profileRequest; profile = undefined; profileError = ''; input('profile').value = ''; update();
  try {
    const response = await fetch(defaultProfileUrl); if (!response.ok) throw new Error('Could not load the export preset. Reload the app or choose a settings project in Advanced options.');
    const bytes = new Uint8Array(await response.arrayBuffer()); if (current !== profileRequest) return;
    profile = readBambuProfile(bytes);
    el('profile-info').dataset.source = 'default';
    el('profile-info').textContent = 'Built-in default: P1S · 0.4 mm · PLA · 0.20 mm Standard. Choose your printer and material in Bambu Studio.';
  } catch (error) { if (current === profileRequest) profileError = text(error); }
  if (current === profileRequest) update();
}
button('default-profile').addEventListener('click', useDefaultProfile);
input('profile').addEventListener('change', async () => {
  const file = input('profile').files?.[0]; if (!file) { await useDefaultProfile(); return; }
  const current = ++profileRequest; profile = undefined; profileError = ''; update();
  try {
    if (file.size > 100 * 1024 * 1024) throw new Error('Choose a settings project smaller than 100 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer()); if (current !== profileRequest) return;
    profile = readBambuProfile(bytes); el('profile-info').dataset.source = 'custom';
    el('profile-info').textContent = `${profile.printer} · ${profile.process}. Only export settings are used.`;
  } catch (error) {
    if (current !== profileRequest) return;
    profileError = text(error); el('profile-info').dataset.source = 'error'; el('profile-info').textContent = profileError;
  }
  update();
});
update();
await useDefaultProfile();
