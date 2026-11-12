import { expect, test } from '@playwright/test';

test('inicia, ajusta la escena y permite repetirla', async ({ page, hasTouch }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Toca para iniciar' });
  const heading = page.getByRole('heading', { name: 'Feliz Día de las Flores Amarillas' });
  const pause = page.getByRole('button', { name: 'Pausar' });
  const restart = page.getByRole('button', { name: 'Volver al inicio' });

  await expect(start).toBeVisible();
  if (hasTouch) {
    await start.tap();
  } else {
    await page.keyboard.press('Tab');
    await expect(start).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(heading).toBeFocused();
  await expect(pause).toBeInViewport();
  await expect(restart).toBeInViewport();
  await expect(heading).toBeInViewport({ ratio: 1 });

  const layout = await page.locator('.experience').evaluate((element) => {
    const planet = element.querySelector('.planet-css')!.getBoundingClientRect();
    const title = element.querySelector('h1')!.getBoundingClientRect();
    const controls = element.querySelector('.scene-controls')!.getBoundingClientRect();
    return { left: planet.left, right: planet.right, top: planet.top, bottom: planet.bottom,
      titleBottom: title.bottom, controlsTop: controls.top, viewportWidth: window.innerWidth };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.top).toBeGreaterThan(layout.titleBottom);
  expect(layout.bottom).toBeLessThan(layout.controlsTop);
  const messages = await page.locator('.message:visible').evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }),
  );
  expect(messages.every(({ top, bottom }) => top >= layout.titleBottom && bottom <= layout.controlsTop)).toBe(true);

  for (let attempt = 0; attempt < 2; attempt++) {
    await pause.click();
    await expect(page.locator('.experience')).toHaveAttribute('data-running', 'false');
    await page.getByRole('button', { name: 'Reanudar' }).click();
    await expect(page.locator('.experience')).toHaveAttribute('data-running', 'true');
    await restart.click();
    await expect(start).toBeFocused();
    await start.click();
    await expect(heading).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test('mantiene la dedicatoria sin WebGL y con movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply: (target, receiver, args) => args[0] === 'webgl2' ? null : Reflect.apply(target, receiver, args),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Toca para iniciar' }).click();
  await expect(page.getByRole('heading')).toBeVisible();
  await expect(page.locator('.planet-css')).toBeVisible();
  await expect(page.locator('.space')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pausar' })).toHaveCount(0);
  await expect(page.locator('.message:visible')).toHaveCount(4);
  await expect(page.locator('.message:visible').first()).toHaveCSS('animation-name', 'none');
});

test('detiene el movimiento en segundo plano y recupera la escena si pierde WebGL', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'El contexto WebGL se verifica en Chromium de escritorio');
  const root = page.locator('.experience');
  await page.goto('/');
  await page.getByRole('button', { name: 'Toca para iniciar' }).click();
  await expect(root).toHaveAttribute('data-webgl', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(root).toHaveAttribute('data-running', 'false');
  await expect(page.locator('.dedication')).toHaveCSS('opacity', '1');
  const canvas = page.locator('canvas');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(root).toHaveAttribute('data-running', 'true');

  const lost = await canvas.evaluate((element) => {
    const extension = (element as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(lost).toBe(true);
  await expect(root).toHaveAttribute('data-webgl', 'false');
  await expect(page.locator('.planet-css')).toBeVisible();
  await expect(page.getByRole('heading')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acercar' })).toBeHidden();
  const phrase = page.locator('.orbiting-message:visible').first();
  const pose = () => phrase.evaluate((element) => (element as HTMLElement).style.transform);
  const initial = await pose();
  await expect.poll(pose).not.toBe(initial);
});

test('permite girar y acercar el universo incluso en pausa', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'La cámara WebGL se verifica en Chromium de escritorio');
  await page.goto('/');
  await page.getByRole('button', { name: 'Toca para iniciar' }).click();
  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.locator('.dedication')).toHaveCSS('opacity', '1');
  const scene = page.locator('.space');
  await expect(scene).toBeVisible();
  const clip = { x: 483, y: 254, width: 400, height: 260 };
  const frame = () => page.screenshot({ clip, timeout: 6000 });
  const initial = await frame();

  await page.mouse.move(680, 380);
  await page.mouse.down();
  await page.mouse.move(850, 475, { steps: 9 });
  await page.mouse.up();
  const rotated = await frame();
  expect(rotated.equals(initial)).toBe(false);

  await page.mouse.wheel(0, -440);
  const zoomed = await frame();
  expect(zoomed.equals(rotated)).toBe(false);

  await page.getByRole('button', { name: 'Centrar vista' }).click();
  expect((await frame()).equals(initial)).toBe(true);
});
