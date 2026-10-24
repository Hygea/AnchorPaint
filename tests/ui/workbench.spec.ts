import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { strFromU8, unzipSync, zipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { settingsProject } from '../settings-project';
import { inspect3mf } from '../../tools/inspect-3mf';
import { parseStl, type MeshData } from '../../src/core/mesh';
import { cappedPostModel } from '../shape-models';

test.use({ viewport: { width: 1440, height: 1000 } });
async function load(page: Page, file = 'single_boss.stl') {
  await page.getByLabel('Load your STL').setInputFiles(resolve('fixtures', file));
  await expect(page.locator('#confirm-row')).toBeVisible();
  await page.getByLabel('These dimensions are correct').check();
}
// Points on visible side faces in the fixed initial view. All selections below
// use the real canvas raycast, including the hover preview and orbit gesture.
const single = { x: 790, y: 500 };
const tenFirst = { x: 580, y: 485 };
const tenSecond = { x: 820, y: 580 };
async function clickSide(page: Page, point = single) { await page.mouse.click(point.x, point.y); }
async function advanced(page: Page) {
  if (!await page.locator('#advanced').evaluate(e => (e as HTMLDetailsElement).open)) await page.locator('#advanced > summary').click();
}
async function customSettings(page: Page) {
  await advanced(page);
  if (!await page.locator('#custom-settings').evaluate(e => (e as HTMLDetailsElement).open)) await page.locator('#custom-settings > summary').click();
}
function stlPayload(mesh: MeshData, name: string) {
  const facets = mesh.triangles.map(t => `facet normal 0 0 0\nouter loop\n${t.map(i => `vertex ${mesh.vertices[i].join(' ')}`).join('\n')}\nendloop\nendfacet`);
  return { name, mimeType: 'model/stl', buffer: Buffer.from(`solid test\n${facets.join('\n')}\nendsolid test`) };
}

test('AnchorPaint orients a sideways capped pin, exports the complete rotated model and restores the original', async ({ page }) => {
  const upright = cappedPostModel('domed');
  const sideways: MeshData = { ...upright, vertices: upright.vertices.map(v => [-v[2], v[1], v[0]]) };
  await page.goto('/'); await expect(page).toHaveTitle('AnchorPaint');
  await page.locator('#stl').setInputFiles(stlPayload(sideways, 'sideways_pin.stl'));
  await expect(page.locator('#dimensions')).toHaveText('9.0 × 30.0 × 30.0 mm');
  await page.locator('#orient-model').click();
  await expect(page.locator('#selection-title')).toHaveText('Choose the face for the print bed');
  await page.keyboard.press('Escape');
  await expect(page.locator('#reset-orientation')).toBeHidden();
  await page.locator('#orient-model').click();
  await page.mouse.move(950, 600);
  await expect(page.locator('#viewport')).toHaveAttribute('data-hover', 'base');
  await page.mouse.click(950, 600);
  await expect(page.locator('#dimensions')).toHaveText('30.0 × 30.0 × 9.0 mm');
  await expect(page.locator('#confirm')).not.toBeChecked();
  await page.mouse.click(884, 537);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#confirm-dimensions').click();
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await advanced(page);
  await expect(page.locator('#overlap-slider')).toHaveAttribute('max', '3');
  await page.locator('#overlap').fill('1.5'); await page.locator('#depth').fill('2');
  await page.locator('#add-target').click();
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const output = inspect3mf((await (await downloaded).path())!);
  const expected = stlPayload(upright, 'upright.stl').buffer;
  expect(output.volumes[0].mesh).toEqual(parseStl(expected.buffer.slice(expected.byteOffset, expected.byteOffset + expected.byteLength)));
  expect(output.volumes[1].stats.bounds).toEqual({ min: [-2, -2, 2], max: [2, 2, 5.5] });
  await page.locator('#reset-orientation').click();
  await expect(page.locator('#dimensions')).toHaveText('9.0 × 30.0 × 30.0 mm');
  await expect(page.locator('#reset-orientation')).toBeHidden();
  await expect(page.locator('#confirm')).not.toBeChecked();
  await expect(page.locator('#target-count')).toHaveText('0');
  await expect(page.locator('#export')).toBeDisabled();
});

test('a concave cap limits overlap and exports below the indentation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#stl').setInputFiles(stlPayload(cappedPostModel('concave'), 'concave_pin.stl'));
  await expect(page.locator('#confirm-row')).toBeVisible(); await page.locator('#confirm').check();
  await page.mouse.click(884, 537);
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await expect(page.locator('#selection-facts')).toContainText('Overlap stops below cap');
  await advanced(page);
  expect(Number(await page.locator('#overlap-slider').getAttribute('max'))).toBeCloseTo(2.6, 5);
  await page.locator('#overlap').fill('2.7'); await expect(page.locator('#add-target')).toBeDisabled();
  await page.locator('#overlap-slider').focus(); await page.keyboard.press('End');
  await expect(page.locator('#add-target')).toBeEnabled(); await page.locator('#add-target').click();
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const output = inspect3mf((await (await downloaded).path())!);
  expect(output.volumes[1].stats.bounds.max[2]).toBeLessThanOrEqual(6.600001);
  expect(output.volumes[1].stats.bounds.min[2]).toBe(1);
});

test('starts empty with a simple workflow, then previews the actual hovered surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#fixture, #mode, #baseline')).toHaveCount(0);
  await page.getByRole('button', { name: 'Or try a sample' }).click();
  await expect(page.locator('#dimensions')).toContainText('30.0 × 30.0 × 18.0 mm');
  await page.mouse.move(single.x, single.y);
  await expect(page.locator('#viewport')).toHaveAttribute('data-hover', 'side');
  await clickSide(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#dimension-x')).toHaveText('30.0');
  await expect(page.locator('#dimension-z')).toHaveText('18.0');
  await expect(page.locator('#confirm')).not.toBeChecked();
  await expect(page.locator('#add-target')).toBeHidden();
  await page.getByRole('button', { name: 'Confirm & select surface' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#confirm')).toBeChecked();
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await page.mouse.move(single.x, single.y);
  await expect(page.locator('#viewport')).toHaveAttribute('data-hover', 'side');
  await expect(page.locator('#hover-info')).toContainText('click to check');
  await clickSide(page);
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await expect(page.locator('#selection-facts')).toContainText('Hole preserved');
  await expect(page.locator('#root-legend')).toBeVisible();
  await expect(page.locator('#add-target')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#add-target')).toBeHidden();
  await expect(page.locator('#root-legend')).toBeHidden();
});

test('size confirmation can be cancelled and a replacement model discards the pending click', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Load your STL').setInputFiles(resolve('fixtures/single_boss.stl'));
  await expect(page.locator('#confirm-row')).toBeVisible();
  await clickSide(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#confirm')).not.toBeChecked();
  await clickSide(page); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#confirm')).not.toBeChecked();
  await clickSide(page);
  await page.getByLabel('Load your STL').setInputFiles(resolve('fixtures/ten_bosses.stl'));
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#confirm')).not.toBeChecked();
  await expect(page.locator('#target-count')).toHaveText('0');
  await expect(page.locator('#dimensions')).toContainText('110.0');
  await clickSide(page, tenFirst);
  await expect(page.locator('#dimension-x')).toHaveText('110.0');
  await expect(page.locator('#dimension-z')).toHaveText('16.0');
  await page.getByRole('button', { name: 'Confirm & select surface' }).click();
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await expect(page.locator('#add-target')).toBeEnabled();
  await clickSide(page, tenSecond);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('depth slider follows the local limit and number field, and its value reaches the exported volume', async ({ page }) => {
  await page.goto('/'); await load(page);
  const slider = page.getByRole('slider', { name: 'Adjust depth into base' });
  await expect(slider).toBeDisabled();
  await clickSide(page);
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute('max', '4');
  await slider.focus(); await page.keyboard.press('End');
  await expect(page.locator('#depth')).toHaveValue('4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#depth')).toHaveValue('3.9');
  await page.getByRole('spinbutton', { name: 'Depth into base mm' }).fill('5');
  await expect(page.locator('#add-target')).toBeDisabled();
  // Explicit slider interaction accepts the limit even if the numeric value
  // was outside it and the thumb was already visually at the maximum.
  await slider.focus(); await page.keyboard.press('End');
  await expect(page.locator('#depth')).toHaveValue('4');
  await expect(page.locator('#add-target')).toBeEnabled();
  await page.locator('#depth').fill('1.5');
  await expect(slider).toHaveValue('1.5');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#depth')).toHaveValue('1.6');
  await page.locator('#add-target').click();
  await expect(slider).toBeEnabled();
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const output = inspect3mf((await (await downloaded).path())!);
  expect(output.volumes[1].stats.bounds.min[2]).toBeCloseTo(2.4, 5);
  expect(output.volumes[1].stats.bounds.max[2]).toBe(6);
});

test('advanced overlap slider follows feature height and changes the exported volume', async ({ page }) => {
  await page.goto('/'); await load(page); await advanced(page);
  const slider = page.getByRole('slider', { name: 'Adjust overlap above base' });
  await expect(slider).toBeDisabled();
  await clickSide(page);
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute('max', '14');
  await slider.focus(); await page.keyboard.press('End');
  await expect(page.locator('#overlap')).toHaveValue('14');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#overlap')).toHaveValue('13.9');
  await page.locator('#overlap').fill('15');
  await expect(page.locator('#add-target')).toBeDisabled();
  await slider.focus(); await page.keyboard.press('End');
  await expect(page.locator('#overlap')).toHaveValue('14');
  await expect(page.locator('#add-target')).toBeEnabled();
  await page.locator('#overlap').fill('1.5');
  await expect(slider).toHaveValue('1.5');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#overlap')).toHaveValue('1.6');
  await page.locator('#add-target').click();
  await expect(slider).toBeEnabled();
  await expect(page.locator('#overlap-range-hint')).toContainText('shared by all modifiers');
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const output = inspect3mf((await (await downloaded).path())!);
  expect(output.volumes[1].stats.bounds.min[2]).toBe(1);
  expect(output.volumes[1].stats.bounds.max[2]).toBeCloseTo(5.6, 5);
  await load(page, 'ten_bosses.stl');
  await expect(slider).toBeDisabled();
  await clickSide(page, tenFirst);
  await expect(slider).toHaveAttribute('max', '12');
});

test('orbiting never selects a face, including a drag returning to its start', async ({ page }) => {
  await page.goto('/'); await load(page);
  await page.mouse.move(single.x, single.y); await page.mouse.down();
  await page.mouse.move(single.x + 75, single.y + 25, { steps: 8 });
  await page.mouse.move(single.x, single.y, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('#add-target')).toBeHidden();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await clickSide(page);
  await expect(page.locator('#add-target')).toBeEnabled();
});

test('selected app text cannot start a native drag or turn the model into a drop zone', async ({ page }) => {
  let fileChoosers = 0, downloads = 0;
  page.on('filechooser', () => fileChoosers++);
  page.on('download', () => downloads++);
  await page.goto('/'); await load(page); await clickSide(page);
  await page.evaluate(() => {
    document.addEventListener('dragstart', event => {
      // Observe the final cancellation state after the app's event handlers.
      queueMicrotask(() => { document.body.dataset.dragBlocked = String(event.defaultPrevented); });
    });
  });
  for (const id of ['model-name', 'depth-range-hint']) {
    const box = (await page.locator(`#${id}`).boundingBox())!;
    await page.mouse.move(box.x + 12, box.y + box.height / 2);
    await page.evaluate(id => {
      delete document.body.dataset.dragBlocked;
      const range = document.createRange(); range.selectNodeContents(document.getElementById(id)!);
      const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    }, id);
    await page.mouse.down(); await page.mouse.move(single.x, single.y, { steps: 15 });
    await page.mouse.up();
    if (id === 'model-name') await expect(page.locator('body')).toHaveAttribute('data-drag-blocked', 'true');
    else await expect(page.locator('body')).not.toHaveAttribute('data-drag-blocked', 'false');
    await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
    await expect(page.locator('#model-name')).toHaveText('single_boss.stl');
    await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  }
  expect(fileChoosers).toBe(0); expect(downloads).toBe(0);
});

test('slider drags stay on their controls when the pointer leaves them', async ({ page }) => {
  let fileChoosers = 0, downloads = 0;
  page.on('filechooser', () => fileChoosers++);
  page.on('download', () => downloads++);
  await page.goto('/'); await load(page); await clickSide(page);
  for (const setting of ['depth', 'overlap']) {
    if (setting === 'overlap') await advanced(page);
    const slider = page.locator(`#${setting}-slider`);
    await slider.scrollIntoViewIfNeeded();
    const box = (await slider.boundingBox())!, y = box.y + box.height / 2;
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(box.x + box.width * .7, y); await page.mouse.down();
      await page.mouse.move(single.x, single.y, { steps: 10 });
      await page.mouse.move(box.x + box.width * .4, y, { steps: 10 }); await page.mouse.up();
      await expect(page.locator(`#${setting}`)).toHaveValue(await slider.inputValue());
      await expect(page.locator('#selection-title')).toHaveText('Round post selected');
      await expect(page.locator('#add-target')).toBeEnabled();
      await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
    }
  }
  expect(Number(await page.locator('#depth').inputValue())).toBeCloseTo(1.6, 1);
  expect(fileChoosers).toBe(0); expect(downloads).toBe(0);
});

test('only file drags activate STL import and a cancelled drag clears the highlight', async ({ page }) => {
  await page.goto('/'); await load(page); await clickSide(page);
  const viewport = page.locator('#viewport canvas');
  const textDrag = await page.evaluateHandle(() => {
    const data = new DataTransfer(); data.setData('text/plain', 'single_boss.stl'); return data;
  });
  await viewport.dispatchEvent('dragover', { dataTransfer: textDrag });
  await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
  await viewport.dispatchEvent('drop', { dataTransfer: textDrag });
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await textDrag.dispose();
  const fileDrag = await page.evaluateHandle(bytes => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], 'straight_wall.stl', { type: 'model/stl' }));
    return data;
  }, Array.from(await readFile(resolve('fixtures/straight_wall.stl'))));
  await viewport.dispatchEvent('dragover', { dataTransfer: fileDrag });
  await expect(page.locator('.workspace')).toHaveClass(/drag-over/);
  await page.locator('body').dispatchEvent('dragend', { dataTransfer: fileDrag });
  await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
  await viewport.dispatchEvent('dragover', { dataTransfer: fileDrag });
  await expect(page.locator('.workspace')).toHaveClass(/drag-over/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
  await viewport.dispatchEvent('dragover', { dataTransfer: fileDrag });
  await viewport.dispatchEvent('drop', { dataTransfer: fileDrag });
  await expect(page.locator('#model-name')).toHaveText('straight_wall.stl');
  await expect(page.locator('#confirm')).not.toBeChecked();
  await expect(page.locator('#target-count')).toHaveText('0');
  await expect(page.locator('.workspace')).not.toHaveClass(/drag-over/);
  await fileDrag.dispose();
});

test('checks depth, adds two features, prevents duplicates, removes/undoes and exports unchanged geometry', async ({ page }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/') && !request.url().startsWith('data:')) external.push(request.url()); });
  await page.goto('/'); await load(page, 'ten_bosses.stl');
  await page.mouse.move(tenFirst.x, tenFirst.y);
  await expect(page.locator('#viewport')).toHaveAttribute('data-hover', 'side');
  await clickSide(page, tenFirst);
  await page.getByRole('spinbutton', { name: 'Depth into base mm' }).fill('5');
  await expect(page.locator('#add-target')).toBeDisabled();
  await expect(page.locator('#selection-info')).toContainText('at most 4.000 mm');
  await page.getByRole('spinbutton', { name: 'Depth into base mm' }).fill('2');
  await page.getByLabel('Walls in modifier').fill('5');
  await page.locator('#add-target').click();
  await expect(page.locator('#target-count')).toHaveText('1');
  await clickSide(page, tenFirst);
  await expect(page.locator('#selection-title')).toHaveText('This feature is already added');
  await expect(page.locator('#add-target')).toBeDisabled();
  await clickSide(page, tenSecond); await page.locator('#add-target').click();
  await expect(page.locator('#target-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Remove modifier 1', exact: true }).click();
  await expect(page.locator('#target-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('#target-count')).toHaveText('2');
  await page.getByLabel('See inside').check();
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  await expect(page.locator('#view-top')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('ten_bosses_modifiers.3mf');
  const path = (await download.path())!;
  const files = unzipSync(await readFile(path));
  const config = new XMLParser({ ignoreAttributes: false }).parse(strFromU8(files['Metadata/model_settings.config']));
  const parts = config.config.object.part;
  expect(parts.filter((p: any) => p['@_subtype'] === 'modifier_part')).toHaveLength(2);
  for (const part of parts.slice(1)) expect(part.metadata.find((m: any) => m['@_key'] === 'wall_loops')['@_value']).toBe('5');
  const output = inspect3mf(path);
  const source = await readFile(resolve('fixtures/ten_bosses.stl'));
  expect(output.volumes[0].mesh).toEqual(parseStl(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)));
  for (const part of output.volumes.slice(1)) {
    expect(part.stats.bounds.min[2]).toBe(2);
    expect(part.stats.bounds.max[2]).toBe(6);
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('default export needs no settings file, optional custom settings can be restored', async ({ page }) => {
  await page.goto('/'); await load(page); await clickSide(page); await page.locator('#add-target').click();
  await expect(page.locator('#export')).toBeEnabled();
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const files = unzipSync(await readFile((await (await downloaded).path())!));
  const settings = JSON.parse(strFromU8(files['Metadata/project_settings.config']));
  expect(settings.printer_model).toBe('Bambu Lab P1S');
  expect(settings.filament_settings_id).toHaveLength(1);
  await customSettings(page);
  await page.getByLabel('Bambu settings project').setInputFiles({ name: 'invalid.3mf', mimeType: 'model/3mf', buffer: Buffer.from(zipSync({})) });
  await expect(page.locator('#profile-info')).toContainText('saved by Bambu Studio');
  await expect(page.locator('#export')).toBeDisabled();
  await page.getByRole('button', { name: 'Use built-in default' }).click();
  await expect(page.locator('#export')).toBeEnabled();
  await page.getByLabel('Bambu settings project').setInputFiles({ name: 'settings.3mf', mimeType: 'model/3mf', buffer: Buffer.from(settingsProject()) });
  await expect(page.locator('#profile-info')).toContainText('Unit-test printer');
  await page.getByRole('button', { name: 'Use built-in default' }).click();
  await expect(page.locator('#profile-info')).toHaveAttribute('data-source', 'default');
});

test('new or invalid models clear targets and reset dimension confirmation', async ({ page }) => {
  await page.goto('/'); await load(page); await clickSide(page); await page.locator('#add-target').click();
  await page.getByLabel('Walls in modifier').fill('2.5');
  await expect(page.locator('#status')).toContainText('whole number');
  await expect(page.locator('#export')).toBeDisabled();
  await page.getByLabel('Walls in modifier').fill('4');
  await expect(page.locator('#export')).toBeEnabled();
  await page.getByLabel('Load your STL').setInputFiles(resolve('fixtures/straight_wall.stl'));
  await expect(page.locator('#target-count')).toHaveText('0');
  await expect(page.locator('#confirm')).not.toBeChecked();
  await expect(page.locator('#export')).toBeDisabled();
  await page.getByLabel('Load your STL').setInputFiles({ name: 'broken.stl', mimeType: 'model/stl', buffer: Buffer.from('broken') });
  await expect(page.locator('#status')).toContainText('truncated');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#view-tools')).toBeHidden();
});

test('bore selection requests a base click and recovers from clicking a top face', async ({ page }) => {
  await page.goto('/'); await load(page);
  // Looking into the bore from above hits its inner side, which extends below
  // the feature root. The flat base then establishes the correct starting plane.
  await page.mouse.click(880, 405);
  await expect(page.locator('#selection-title')).toHaveText('Where does this feature meet the base?');
  await expect(page.locator('#choose-root')).toBeVisible();
  await page.locator('#choose-root').click();
  await page.mouse.click(800, 360);
  await expect(page.locator('#selection-card')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#add-target')).toBeHidden();
  await page.mouse.move(1050, 700);
  await expect(page.locator('#viewport')).toHaveAttribute('data-hover', 'base');
  await page.mouse.click(1050, 700);
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await expect(page.locator('#selection-facts')).toContainText('Base at 4 mm');
});

test('small screens keep model controls and export usable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('#empty-open')).toBeVisible();
  await page.getByRole('button', { name: 'Or try a sample' }).click();
  await expect(page.locator('#confirm-row')).toBeVisible();
  await page.locator('#confirm').check();
  await page.locator('#view-top').click();
  await expect(page.locator('#view-top')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('#export')).toBeDisabled();
});
