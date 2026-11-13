export const phrases = [
  'Que hoy sea un día para florecer',
  'Ojalá hoy te encuentre algo bonito',
  'Un poquito de sol para ti',
  'Que no falten risas en la tarde',
  'Qué suerte coincidir contigo',
  'Hasta el cielo se pone amarillo',
  'Que siempre tengas ganas de sonreír',
  'Un pedacito de cielo entre las nubes',
  'Donde estás, las cosas florecen',
  'Gracias por compartir tu alegría',
  'Por las tardes que merecen repetirse',
  'Si el día pesa, aquí va un abrazo',
  'Qué bonito encontrar motivos para celebrar',
  'Una buena noticia para empezar el día',
  'Un girasol para tus días nublados',
  'Que la vida te devuelva tu luz',
  'Un color alegre para esta mañana',
  'Tu alegría contagia al cielo',
  'Un abrazo hecho de luz',
  'Que hoy te acompañe el sol',
  'Una sonrisa cambia el ambiente',
  'Me alegra que estés aquí',
  'Flores para tus días grises',
  'Hasta una chispa ilumina el camino',
  'El sol sale para todos',
  'Por las risas que llegan sin aviso',
  'Un girasol siempre encuentra el sol',
  'Una charla a tiempo alegra el día',
  'La amabilidad hace más cálido el mundo',
  'Siempre queda algo bueno por descubrir',
  'Que esta luz te dé un respiro',
  'Hasta las nubes te dejan pasar',
  'El cielo cambia de color a cada rato',
  'Que encuentres buena compañía',
  'Un saludo que viaja lejos',
  'Mereces mañanas tranquilas',
  'Que siempre encuentres un rincón de sol',
  'Que la próxima risa te tome por sorpresa',
  'Por si te faltaba un rayito de luz',
  'Cada flor tiene su momento',
  'El sol se cuela entre las ramas',
  'Que siempre haya un lugar donde descansar',
  'Date permiso de ir más despacio',
  'Todavía queda tiempo para un buen día',
  'Te mando un cielo despejado',
  'Ojalá sonrías al ver esto',
  'Un gesto amable cambia el día',
  'Que el reloj dé tregua por un rato',
  'Hoy hasta las macetas están de fiesta',
  'Qué gusto compartir este momento',
  'Que nunca te falten flores',
  'Hay luz incluso en los días grises',
  'Celebra algo pequeño hoy',
  'Hay estrellas para pedir deseos',
  'Un cielo entero para desearte bien',
  'Te mereces lo bonito que das',
  'Que el viento te traiga buenas noticias',
  'Adonde vayas, que te siga el sol',
  'A veces basta con respirar hondo',
  'El amarillo también es un color de fiesta',
  'Una flor para cada buena noticia',
  'Da gusto mirar el cielo sin prisa',
  'Hasta el atardecer tiene sus sorpresas',
  'Que hoy tengas algo bueno que contar',
  'Que mañana haya tiempo para un café',
  'Hasta un lunes puede empezar bien',
  'Haz una pausa para mirar las estrellas',
  'Si miras arriba, piensa en algo feliz',
  'Guarda un poquito de esta luz',
  'Buenos deseos desde este rincón del mundo',
  'Que este día te trate con cariño',
  'Ojalá veas algo que te dé curiosidad',
  'Aquí tienes un jardín de estrellas',
  'Ojalá encuentres calma esta noche',
  'Que hoy encuentres un rato para ti',
  'Por las cosas sencillas que hacen bien',
  'Que tus planes salgan mejor de lo esperado',
  'Que la tarde te encuentre sonriendo',
  'Si te pierdes, busca la luz',
  'Te mando un campo lleno de sol',
];

const fullTurn = Math.PI * 2;

const paths = [
  { count: 10, compactCount: 6, seconds: 34, width: 1, height: 1, tilt: -.25, size: 17, start: 0 },
  { count: 8, compactCount: 4, seconds: 34, width: .77, height: .73, tilt: .35, size: 15, start: 10 },
  { count: 6, compactCount: 3, seconds: 34, width: .54, height: .47, tilt: -.31, size: 13, start: 18 },
];

function makeMessage(phrase: string, orbiting = false): HTMLDivElement {
  const message = document.createElement('div');
  const copy = document.createElement('span');
  message.className = orbiting ? 'message orbiting-message' : 'message';
  copy.textContent = phrase;
  message.append(copy);
  return message;
}

export function addMessages(field: HTMLElement, list: HTMLElement) {
  const readingCopy = document.createDocumentFragment();
  for (const phrase of phrases) {
    const item = document.createElement('li');
    item.textContent = phrase;
    readingCopy.append(item);
  }
  list.append(readingCopy);

  for (const [index, area] of ['top', 'bottom', 'left', 'right'].entries()) {
    const bank = document.createElement('div');
    bank.className = `message-bank message-bank-${area}`;
    bank.append(makeMessage(phrases[index * 2]), makeMessage(phrases[index * 2 + 1]));
    field.append(bank);
  }

  const orbits = paths.map((path, index) => {
    const labels = Array.from({ length: path.count }, (_, offset) => {
      const element = makeMessage(phrases[(path.start + offset) % phrases.length], true);
      element.style.setProperty('--size', `${path.size}px`);
      field.append(element);
      return { element, inFront: false };
    });
    return {
      path, labels, count: path.count, offset: .18 + index * .47,
      cosTilt: Math.cos(path.tilt), sinTilt: Math.sin(path.tilt),
    };
  });

  let centerX = 0;
  let centerY = 0;
  let radiusX = 0;
  let radiusY = 0;

  return {
    resize(width: number, height: number, headingBottom: number, controlsTop: number): void {
      const landscape = height <= 460 && width > height;
      const compact = width <= 680 || landscape;
      centerX = width / 2;
      centerY = height / 2;
      radiusX = width * (landscape ? .34 : compact ? .27 : .38);
      radiusY = Math.max(0, Math.min(centerY - headingBottom, controlsTop - centerY) - 39);

      for (const orbit of orbits) {
        orbit.count = compact ? orbit.path.compactCount - Number(landscape) : orbit.path.count;
        for (const [index, { element }] of orbit.labels.entries()) {
          element.hidden = index >= orbit.count;
        }
      }
    },
    draw(elapsed: number): void {
      for (const { path, labels, count, offset, cosTilt, sinTilt } of orbits) {
        const phase = elapsed * fullTurn / path.seconds + offset;
        for (let index = 0; index < count; index++) {
          const label = labels[index];
          const angle = phase + index * fullTurn / count;
          const horizontal = Math.cos(angle);
          const vertical = Math.sin(angle);

          const x = centerX + radiusX * path.width * (horizontal * cosTilt - vertical * sinTilt * .46);
          const y = centerY + radiusY * path.height * (vertical * cosTilt + horizontal * sinTilt * .46);
          const depth = .86 * vertical + .28 * horizontal;
          const scale = 1 + .30 * depth;
          const yaw = 35 * horizontal;
          const roll = 19 * horizontal + 13 * sinTilt;
          const inFront = depth > 0;

          if (inFront !== label.inFront) {
            label.inFront = inFront;
            label.element.classList.toggle('in-front', inFront);
          }
          label.element.style.opacity = (.61 + .38 * depth).toFixed(2);
          label.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)
            perspective(420px) rotateY(${yaw.toFixed(1)}deg) rotateZ(${roll.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        }
      }
    },
  };
}
