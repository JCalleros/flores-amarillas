const phrases = [
  'Contigo florecen mis días',
  'Ojalá hoy te encuentre algo bonito',
  'Un poquito de sol para ti',
  'Tu risa hace más cálida la tarde',
  'Qué suerte coincidir contigo',
  'Hasta el cielo se pone amarillo',
  'Que siempre tengas motivos para sonreír',
  'Te guardé este pedacito de cielo',
  'Donde estás, las cosas florecen',
  'Gracias por ser luz en mi vida',
  'Por las tardes que se quedan contigo',
  'Si el día pesa, aquí tienes un abrazo',
  'Qué bonito que existas',
  'Hay días que empiezan con tu sonrisa',
  'Un girasol para tus días nublados',
  'Que la vida te devuelva toda tu luz',
];

const depths = [
  { size: 10, alpha: .48, duration: 17, drift: 8 },
  { size: 12, alpha: .72, duration: 13, drift: 13 },
  { size: 15, alpha: .91, duration: 10, drift: 18 },
];

const positions = [
  [5, 21, 2], [55, 23, 1], [13, 27, 0], [63, 29, 2],
  [6, 34, 1], [52, 35, 0], [21, 40, 1], [67, 40, 0],
  [8, 57, 0], [63, 57, 1], [15, 63, 2], [56, 65, 0],
  [5, 70, 1], [56, 72, 2], [11, 78, 0], [58, 80, 1],
  [24, 86, 1], [65, 87, 0], [9, 46, 0], [80, 46, 0],
  [11, 52, 0], [80, 52, 0], [12, 17, 0], [74, 18, 0],
  [3, 13, 2], [77, 13, 1], [33, 20, 0], [40, 30, 0],
  [82, 33, 1], [5, 39, 2], [81, 43, 2], [2, 49, 1],
  [84, 55, 0], [2, 59, 1], [80, 60, 2], [33, 69, 0],
  [83, 77, 0], [3, 83, 2], [39, 77, 1], [41, 87, 0],
];

const still = new Set([0, 5, 10, 13]);

export function addMessages(field: HTMLElement, list: HTMLElement): void {
  const readingCopy = document.createDocumentFragment();
  for (const phrase of phrases) {
    const item = document.createElement('li');
    item.textContent = phrase;
    readingCopy.append(item);
  }
  list.append(readingCopy);

  const fieldCopy = document.createDocumentFragment();
  for (const [index, [x, y, layer]] of positions.entries()) {
    const depth = depths[layer];
    const message = document.createElement('span');
    message.className = 'message';
    message.textContent = phrases[index % phrases.length];
    if (index >= 24) message.dataset.desktop = '';
    if (still.has(index)) message.dataset.still = '';
    message.style.setProperty('--x', `${x}%`);
    message.style.setProperty('--y', `${y}%`);
    message.style.setProperty('--max-width', `${Math.min(43, 97 - x)}%`);
    message.style.setProperty('--font', `clamp(${depth.size - 1}px, ${depth.size * .21}vmin, ${depth.size + 2}px)`);
    message.style.setProperty('--alpha', String(depth.alpha));
    message.style.setProperty('--duration', `${depth.duration}s`);
    message.style.setProperty('--delay', `-${(index * 2.17) % depth.duration}s`);
    message.style.setProperty('--drift-x', `${x > 58 ? -depth.drift : depth.drift}px`);
    message.style.setProperty('--drift-y', `${(index % 2 ? 1 : -1) * depth.drift * .65}px`);
    fieldCopy.append(message);
  }
  field.append(fieldCopy);
}
