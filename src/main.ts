import './style.css';
import { addMessages } from './frases';
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
  messages.draw(_elapsed);
  _scene?.draw(_elapsed);
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

function fitScene(): void {
  if (!_started) return;
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (!reducedMotion.matches) {
    messages.resize(width, height, heading.offsetTop + heading.offsetHeight, controls.offsetTop);
    messages.draw(_elapsed);
  }
  _scene?.resize(width, height, fallback.offsetWidth);
  _scene?.draw(reducedMotion.matches ? 0 : _elapsed);
}

function useCssScene(): void {
  root.dataset.webgl = 'false';
  canvas.hidden = true;
  const scene = _scene;
  _scene = undefined;
  syncPlayback();
  scene?.dispose();
}

async function enableWebGL(): Promise<void> {
  const module = await sceneModule;
  if (!module || _rendererAttempted || !_started) return;
  _rendererAttempted = true;
  try {
    _scene = module.createPlanetScene(canvas);
    if (!_scene) return;
    fitScene();
    root.dataset.webgl = 'true';
    canvas.hidden = false;
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
  root.dataset.webgl = String(Boolean(_scene));
  canvas.hidden = !_scene;
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
  root.dataset.webgl = 'false';
  canvas.hidden = true;
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
