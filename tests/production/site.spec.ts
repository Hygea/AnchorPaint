import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspect3mf } from '../../tools/inspect-3mf';
import { parseStl } from '../../src/core/mesh';
import { settingsProject } from '../settings-project';
import { unzipSync } from 'fflate';
import { createHash } from 'node:crypto';

test('production subpath loads local assets, previews a modifier and exports without model uploads', async ({ page }) => {
  const errors: string[] = [], unexpectedRequests: string[] = [], failedResponses: string[] = [];
  const loadedAssets = new Set<string>();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol === 'blob:' || url.protocol === 'data:') return;
    if (url.origin !== 'http://127.0.0.1:4174' || !url.pathname.startsWith('/AnchorPaint/') || request.method() !== 'GET') {
      unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    else loadedAssets.add(new URL(response.url()).pathname);
  });
  await page.goto('./');
  await expect(page).toHaveTitle('AnchorPaint');
  await expect(page.locator('#viewport canvas')).toBeVisible();
  await expect(page.locator('#profile-info')).toHaveAttribute('data-source', 'default');
  await page.locator('#sample').click();
  await expect(page.locator('#dimensions')).toHaveText('30.0 × 30.0 × 18.0 mm');
  await page.mouse.click(790, 500);
  await page.locator('#confirm-dimensions').click();
  await expect(page.locator('#selection-title')).toHaveText('Round post selected');
  await page.locator('#depth').fill('1.5');
  await page.locator('#overlap').fill('1.2');
  await expect(page.locator('#depth-slider')).toHaveValue('1.5');
  await expect(page.locator('#overlap-slider')).toHaveValue('1.2');
  await expect(page.locator('#add-target')).toBeEnabled();
  await page.mouse.move(600, 850);
  const png = await page.screenshot({ clip: { x: 790, y: 450, width: 190, height: 160 } });
  const orangePixels = await page.evaluate(async base64 => {
    const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const context = canvas.getContext('2d')!; context.drawImage(img, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > data[i + 1] + 18 && data[i + 1] > data[i + 2] + 25) count++;
    return count;
  }, png.toString('base64'));
  expect(orangePixels).toBeGreaterThan(500);
  await page.locator('#add-target').click();
  await expect(page.locator('#target-count')).toHaveText('1');
  const downloaded = page.waitForEvent('download'); await page.locator('#export').click();
  const outputPath = (await (await downloaded).path())!;
  const output = inspect3mf(outputPath);
  expect(output.volumes).toHaveLength(2);
  expect(output.volumes[1].stats.bounds.min[2]).toBeCloseTo(2.5, 5);
  expect(output.volumes[1].stats.bounds.max[2]).toBeCloseTo(5.2, 5);
  const source = await readFile(resolve('fixtures/single_boss.stl'));
  expect(output.volumes[0].mesh).toEqual(parseStl(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)));
  const paths = [...loadedAssets];
  for (const suffix of ['.js', '.css', '.stl', '.3mf']) expect(paths.some(path => path.endsWith(suffix))).toBe(true);
  const notices = await page.request.get('./THIRD_PARTY_NOTICES.txt');
  expect(notices.ok()).toBe(true); expect(await notices.text()).toContain('Mapbox');
  await expect(page.getByRole('link', { name: 'Licenses & credits' })).toHaveAttribute('href', './THIRD_PARTY_NOTICES.txt');
  const license = await page.request.get('./licenses/BambuStudio-AGPL-3.0.txt');
  expect(license.ok()).toBe(true); expect(await license.text()).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
  const mit = await page.request.get('./licenses/AnchorPaint-MIT.txt');
  expect(mit.ok()).toBe(true); expect(await mit.text()).toContain('Copyright (c) 2026 Hygea');
  const manifestResponse = await page.request.get('./preset-source/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.sources).toHaveLength(17);
  const editable = await page.request.get('./preset-source/default-settings.json');
  expect(editable.ok()).toBe(true);
  expect(unzipSync(await readFile(outputPath))['Metadata/project_settings.config']).toEqual(new Uint8Array(await editable.body()));
  for (const source of manifest.sources) {
    const resource = await page.request.get(`./preset-source/${source.path}`);
    expect(resource.ok()).toBe(true);
    expect(createHash('sha256').update(await resource.body()).digest('hex')).toBe(source.sha256);
  }

  // Selecting private files must not add a network transfer. The existing UI
  // suite tests their full export behavior; here we check the built app's boundary.
  await page.locator('#stl').setInputFiles({ name: 'private-test-model.stl', mimeType: 'model/stl', buffer: source });
  await expect(page.locator('#model-name')).toHaveText('private-test-model.stl');
  await expect(page.locator('#advanced')).not.toHaveAttribute('open');
  await page.locator('#advanced > summary').click();
  await page.locator('#custom-settings > summary').click();
  await page.locator('#profile').setInputFiles({ name: 'private-settings.3mf', mimeType: 'model/3mf', buffer: Buffer.from(settingsProject()) });
  await expect(page.locator('#profile-info')).toContainText('Unit-test printer');
  expect(unexpectedRequests).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(errors).toEqual([]);
});
