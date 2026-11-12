import './style.css';
import { addMessages, phrases } from './frases';
import type { IPlanetScene } from './scene';

const root = document.querySelector<HTMLElement>('.experience')!;
const dedication = document.querySelector<HTMLElement>('.dedication')!;
const welcome = document.querySelector<HTMLElement>('.welcome')!;
const startButton = document.querySelector<HTMLButtonElement>('.start')!;
const title = document.querySelector<HTMLHeadingElement>('#dedication-title')!;
const toggle = document.querySelector<HTMLButtonElement>('#toggle-motion')!;
const toggleLabel = toggle.lastElementChild!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const heading = title.parentElement!;
const controls = restart.parentElement!;
const cameraTools = document.querySelector<HTMLElement>('#camera-controls')!;
const cameraHint = document.querySelector<HTMLElement>('#camera-hint')!;
const canvas = document.querySelector<HTMLCanvasElement>('.space')!;
const fallback = document.querySelector<HTMLElement>('.planet-css')!;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const messages = addMessages(
  document.querySelector<HTMLElement>('.floating-messages')!,
  document.querySelector<HTMLElement>('.message-list')!,
);

const sky = document.querySelector<HTMLElement>('.sky')!;
for (let index = 1; index <= 120; index++) {
  const star = document.createElement('span');
  const size = 1 + (index * .41421356 % 1) ** 4 * 2;
  star.className = 'star';
  star.style.setProperty('--x', `${index * 61.803398875 % 100}%`);
  star.style.setProperty('--y', `${index * 75.4877666 % 100}%`);
  star.style.setProperty('--size', `${size}px`);
  star.style.setProperty('--alpha', String(.19 + (index * .21356237 % 1) * .72));
  sky.append(star);
}

let _started = false;
let _paused = false;
let _rendererAttempted = false;
let _scene: IPlanetScene | undefined;
let _frame: number | undefined;
let _previousTime: number | undefined;
let _elapsed = 0;

const sceneModule = import('./scene').catch(() => undefined);
const labelFont = document.fonts.load('650 60px "Quicksand Variable"').catch(() => []);

function canAnimate(): boolean {
  return _started && !_paused && !reducedMotion.matches && !document.hidden;
}

function render(time: number): void {
  _frame = undefined;
  if (!canAnimate()) return;
  if (_previousTime !== undefined) {
    _elapsed += Math.min((time - _previousTime) / 1000, .1);
  }
  _previousTime = time;
  drawScene();
  _frame = requestAnimationFrame(render);
}

function syncPlayback(): void {
  const animate = canAnimate();
  root.dataset.running = String(animate);
  root.dataset.hidden = String(document.hidden);
  root.dataset.paused = String(_paused);
  toggle.hidden = reducedMotion.matches;
  toggleLabel.textContent = _paused ? 'Reanudar' : 'Pausar';

  if (animate) {
    _frame ??= requestAnimationFrame(render);
    return;
  }
  if (_frame !== undefined) cancelAnimationFrame(_frame);
  _frame = undefined;
  _previousTime = undefined;
}

function drawScene(): void {
  if (_scene) {
    _scene.draw(reducedMotion.matches ? 0 : _elapsed, !reducedMotion.matches);
  } else if (!reducedMotion.matches) {
    messages.draw(_elapsed);
  }
}

function redrawCamera(): void {
  if (_started && !canAnimate() && !document.hidden) drawScene();
}

function fitScene(): void {
  if (!_started) return;
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (!_scene && !reducedMotion.matches) {
    messages.resize(width, height, heading.offsetTop + heading.offsetHeight, controls.offsetTop);
  }
  _scene?.resize(width, height, fallback.offsetWidth);
  drawScene();
}

function showCamera(enabled: boolean): void {
  root.dataset.webgl = String(enabled);
  canvas.hidden = !enabled;
  cameraTools.hidden = !enabled;
  cameraHint.hidden = !enabled;
}

function useCssScene(): void {
  const hadCanvasFocus = document.activeElement === canvas;
  showCamera(false);
  const scene = _scene;
  _scene = undefined;
  syncPlayback();
  scene?.dispose();
  fitScene();
  if (hadCanvasFocus) title.focus({ preventScroll: true });
}

async function enableWebGL(): Promise<void> {
  const [module] = await Promise.all([sceneModule, labelFont]);
  if (!module || _rendererAttempted || !_started) return;
  _rendererAttempted = true;
  try {
    _scene = module.createPlanetScene(canvas, phrases, redrawCamera);
    if (!_scene) return;
    showCamera(true);
    fitScene();
    syncPlayback();
  } catch {
    useCssScene();
  }
}

function start(): void {
  if (_started) return;
  _started = true;
  root.dataset.view = 'dedication';
  welcome.inert = true;
  dedication.inert = false;
  showCamera(Boolean(_scene));
  title.focus({ preventScroll: true });
  fitScene();
  syncPlayback();
  void enableWebGL();
}

function returnToWelcome(): void {
  _started = false;
  _paused = false;
  _elapsed = 0;
  root.dataset.view = 'welcome';
  showCamera(false);
  _scene?.resetView();
  dedication.inert = true;
  welcome.inert = false;
  startButton.focus({ preventScroll: true });
  syncPlayback();
}

startButton.addEventListener('click', start);
restart.addEventListener('click', returnToWelcome);
toggle.addEventListener('click', () => {
  _paused = !_paused;
  syncPlayback();
});
document.querySelector('#zoom-in')!.addEventListener('click', () => _scene?.zoom(.88));
document.querySelector('#zoom-out')!.addEventListener('click', () => _scene?.zoom(1.14));
document.querySelector('#center-view')!.addEventListener('click', () => _scene?.resetView());

canvas.addEventListener('keydown', (event) => {
  if (!_scene) return;
  const step = Math.PI / 15;
  switch (event.key) {
    case 'ArrowLeft': _scene.moveCamera(-step, 0); break;
    case 'ArrowRight': _scene.moveCamera(step, 0); break;
    case 'ArrowUp': _scene.moveCamera(0, -step); break;
    case 'ArrowDown': _scene.moveCamera(0, step); break;
    case '+':
    case '=': _scene.zoom(.88); break;
    case '-': _scene.zoom(1.14); break;
    case 'Home': _scene.resetView(); break;
    default: return;
  }
  event.preventDefault();
});
canvas.addEventListener('webglcontextlost', useCssScene);
document.addEventListener('visibilitychange', syncPlayback);
reducedMotion.addEventListener('change', () => {
  syncPlayback();
  fitScene();
});
const layoutObserver = new ResizeObserver(fitScene);
layoutObserver.observe(root);
layoutObserver.observe(heading);
layoutObserver.observe(controls);
syncPlayback();
