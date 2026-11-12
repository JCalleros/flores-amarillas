const phrases = [
  'Contigo florecen mis días',
  'Ojalá hoy te encuentre algo bonito',
  'Un poquito de sol para ti',
  'Tu risa calienta la tarde',
  'Qué suerte coincidir contigo',
  'Hasta el cielo se pone amarillo',
  'Que siempre tengas ganas de sonreír',
  'Te guardé un pedacito de cielo',
  'Donde estás, las cosas florecen',
  'Gracias por ser luz en mi vida',
  'Por las tardes que se quedan contigo',
  'Si el día pesa, aquí va un abrazo',
  'Qué bonito que existas',
  'El día empieza con tu sonrisa',
  'Un girasol para tus días nublados',
  'Que la vida te devuelva tu luz',
];

const depths = [
  { size: 10, alpha: .50, duration: 17, drift: 4 },
  { size: 12, alpha: .72, duration: 13, drift: 6 },
  { size: 15, alpha: .93, duration: 10, drift: 8 },
];

const banks = [
  { area: 'top', count: 8, start: 0 },
  { area: 'bottom', count: 12, start: 8 },
  { area: 'left', count: 8, start: 12 },
  { area: 'right', count: 8, start: 4 },
];

export function addMessages(field: HTMLElement, list: HTMLElement): void {
  const readingCopy = document.createDocumentFragment();
  for (const phrase of phrases) {
    const item = document.createElement('li');
    item.textContent = phrase;
    readingCopy.append(item);
  }
  list.append(readingCopy);

  for (const { area, count, start } of banks) {
    const bank = document.createElement('div');
    bank.className = `message-bank message-bank-${area}`;

    for (let index = 0; index < count; index++) {
      const depth = depths[(index * 2 + start) % depths.length];
      const message = document.createElement('div');
      const copy = document.createElement('span');
      message.className = 'message';
      copy.textContent = phrases[(start + index) % phrases.length];
      message.append(copy);
      if (index < 2) message.dataset.still = '';

      message.style.setProperty('--font', `clamp(${depth.size - 1}px, ${depth.size * .21}vmin, ${depth.size + 2}px)`);
      message.style.setProperty('--alpha', String(depth.alpha));
      message.style.setProperty('--duration', `${depth.duration}s`);
      message.style.setProperty('--delay', `-${((start + index) * 2.17) % depth.duration}s`);
      message.style.setProperty('--drift-x', `${index % 2 ? -depth.drift : depth.drift}px`);
      message.style.setProperty('--drift-y', `${index % 2 ? 3 : -3}px`);
      bank.append(message);
    }
    field.append(bank);
  }
}
