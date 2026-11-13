import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace, type Vector3 } from 'three';

const fullTurn = Math.PI * 2;
const orbitSpeed = fullTurn / 34;
const paths = [
  { radius: 3.5, altitude: -6.4, size: .38 },
  { radius: 5.7, altitude: -5.0, size: .40 },
  { radius: 7.5, altitude: -3.8, size: .42 },
  { radius: 6.5, altitude: -2.7, size: .45 },
  { radius: 4.9, altitude: -1.4, size: .48 },
  { radius: 3.8, altitude: 0, size: .44 },
  { radius: 5.4, altitude: 1.4, size: .48 },
  { radius: 7.0, altitude: 2.7, size: .45 },
  { radius: 7.7, altitude: 3.8, size: .42 },
  { radius: 5.7, altitude: 5.0, size: .40 },
  { radius: 4.1, altitude: 6.4, size: .38 },
];

function makeLabel(phrase: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const font = '650 60px "Quicksand Variable", sans-serif';
  context.font = font;
  const resolution = .65;
  const width = context.measureText(phrase).width + 110;
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(118 * resolution);
  context.scale(resolution, resolution);
  context.font = font;
  context.textBaseline = 'middle';
  context.strokeStyle = '#643307';
  context.lineWidth = 2.2;
  context.strokeText(phrase, 84, 59);
  context.shadowBlur = 16 * resolution;
  context.shadowColor = '#ffbe25';
  context.fillStyle = '#fff1ac';
  context.fillText(phrase, 84, 59);

  const x = 48;
  const y = 59;
  context.fillStyle = '#ffe45e';
  for (let index = 0; index < 9; index++) {
    const angle = index * Math.PI * 2 / 9;
    context.beginPath();
    context.arc(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 6, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.arc(x, y, 10, 0, Math.PI * 2);
  context.shadowBlur = 0;
  context.fillStyle = '#9d4912';
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return {
    ratio: canvas.width / canvas.height,
    material: new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, alphaTest: .035 }),
  };
}

export function createTextOrbits(phrases: readonly string[]) {
  const labels = Array.from(new Set(phrases), makeLabel);
  const sprites: Sprite[] = [];
  const bands = paths.map((path, bandIndex) => {
    const start = Math.floor(bandIndex * labels.length / paths.length);
    const end = Math.floor((bandIndex + 1) * labels.length / paths.length);
    const bandLabels = labels.slice(start, end);
    const members = bandLabels.map((label, index) => {
      const sprite = new Sprite(label.material);
      const height = path.size * (.84 + ((index + bandIndex) * .618 % 1) * .4);
      sprites.push(sprite);
      return { sprite, height, ratio: label.ratio, phase: index * fullTurn / bandLabels.length + bandIndex * .37 };
    });
    return { ...path, members };
  });

  return {
    sprites,
    draw(elapsed: number, visible: boolean, cameraAxis: Vector3, cameraDistance: number, heightPerDepth: number, widthPerDepth: number): void {
      for (const { members, radius, altitude } of bands) {
        for (const { sprite, phase, height, ratio } of members) {
          sprite.visible = visible;
          if (!visible) continue;
          const angle = phase + elapsed * orbitSpeed;
          sprite.position.set(radius * Math.cos(angle), altitude, radius * Math.sin(angle));
          const depth = cameraDistance - sprite.position.dot(cameraAxis);
          sprite.visible = depth > 0;
          if (sprite.visible) {
            const apparentHeight = Math.min(height, depth * heightPerDepth, depth * widthPerDepth / ratio);
            sprite.scale.set(apparentHeight * ratio, apparentHeight, 1);
          }
        }
      }
    },
    dispose(): void {
      for (const { material } of labels) {
        material.map?.dispose();
        material.dispose();
      }
    },
  };
}
