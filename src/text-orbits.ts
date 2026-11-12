import { CanvasTexture, Euler, Quaternion, Sprite, SpriteMaterial, SRGBColorSpace, type Vector3 } from 'three';

const paths = [
  { radius: 2.2, count: 8, tilt: .92, node: .38, slant: .4 },
  { radius: 3.3, count: 10, tilt: -.75, node: -.55, slant: -.3 },
  { radius: 4.4, count: 12, tilt: 1.04, node: .8, slant: .58 },
  { radius: 5.6, count: 13, tilt: -.57, node: -.31, slant: -.5 },
  { radius: 7, count: 15, tilt: .86, node: -.84, slant: -.25 },
  { radius: 8.6, count: 16, tilt: -.91, node: .52, slant: .2 },
];

function makeLabel(phrase: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const font = '650 60px "Quicksand Variable", sans-serif';
  context.font = font;
  canvas.width = Math.ceil(context.measureText(phrase).width + 110);
  canvas.height = 118;
  context.font = font;
  context.textBaseline = 'middle';
  context.strokeStyle = '#643307';
  context.lineWidth = 2.2;
  context.strokeText(phrase, 84, 59);
  context.shadowBlur = 16;
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
  const labels = phrases.map(makeLabel);
  const sprites: Sprite[] = [];
  const bands = paths.map((path, bandIndex) => {
    const plane = new Quaternion().setFromEuler(new Euler(path.tilt, path.node, path.slant, 'YXZ'));
    const members = Array.from({ length: path.count }, (_, index) => {
      const label = labels[(bandIndex * 11 + index) % labels.length];
      const sprite = new Sprite(label.material);
      const height = (.35 + (index * .618 % 1) * .23) * (bandIndex === 0 ? .85 : 1);
      sprites.push(sprite);
      return { sprite, height, ratio: label.ratio, phase: (index + bandIndex * .29) * Math.PI * 2 / path.count };
    });
    return { plane, members, radius: path.radius, speed: .35 / Math.pow(path.radius / 2.2, .9) };
  });

  return {
    sprites,
    draw(elapsed: number, visible: boolean, cameraAxis: Vector3, cameraDistance: number, heightPerDepth: number): void {
      for (const { plane, members, radius, speed } of bands) {
        for (const { sprite, phase, height, ratio } of members) {
          sprite.visible = visible;
          if (!visible) continue;
          const angle = phase + elapsed * speed;
          sprite.position.set(radius * Math.cos(angle), radius * Math.sin(angle), 0).applyQuaternion(plane);
          const depth = cameraDistance - sprite.position.dot(cameraAxis);
          sprite.visible = depth > 0;
          if (sprite.visible) {
            const apparentHeight = Math.min(height, depth * heightPerDepth);
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
