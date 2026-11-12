import {
  BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, MathUtils, Mesh, PerspectiveCamera,
  Points, RingGeometry, Scene, ShaderMaterial, SphereGeometry, Spherical, Sprite, SpriteMaterial, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTextOrbits } from './text-orbits';

const ringRadius = 2.47;
const ringInnerRadius = 1.12;

const sphereMaterial = new ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(mat3(viewMatrix) * vec3(-0.62, 0.76, 0.78));
      float lightness = max(dot(normal, light), 0.0);
      float terminator = smoothstep(0.0, 1.0, lightness);
      vec3 color = mix(vec3(0.145, 0.044, 0.006), vec3(1.0, 0.63, 0.066), terminator);
      color = mix(color, vec3(1.0, 0.95, 0.48), pow(lightness, 4.0) * 0.82);
      float rim = pow(1.0 - max(normal.z, 0.0), 3.0);
      color += vec3(0.25, 0.082, 0.005) * rim;
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }`,
});

function createRingMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uInner: { value: ringInnerRadius },
      uOuter: { value: ringRadius },
    },
    vertexShader: `
      varying vec2 vRing;
      void main() {
        vRing = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uInner;
      uniform float uOuter;
      varying vec2 vRing;
      void main() {
        float band = (length(vRing) - uInner) / (uOuter - uInner);
        float streaks = sin(band * 210.0) * 0.025 + sin(band * 82.0) * 0.045;
        float innerGap = (band - 0.61) * 34.0;
        float outerGap = (band - 0.84) * 43.0;
        float gaps = exp(-innerGap * innerGap) * 0.23 + exp(-outerGap * outerGap) * 0.14;
        float innerGlow = exp(-band * 5.8);
        float edge = smoothstep(0.88, 0.99, band);
        float shade = 0.86 + 0.14 * dot(normalize(vRing), normalize(vec2(-0.8, -0.6)));
        vec3 amber = vec3(1.0, 0.66, 0.055);
        vec3 color = mix(amber, vec3(1.0, 0.97, 0.52), innerGlow * 0.86 + edge * 0.36);
        color *= shade * (1.0 + streaks - gaps);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

function createStars() {
  const positions: number[] = [];
  const seeds: number[] = [];
  const count = 1000;
  for (let index = 1; index <= count; index++) {
    const z = 1 - 2 * (index - .5) / count;
    const spread = Math.sqrt(1 - z * z);
    const angle = index * 2.39996323;
    const radius = 25 + (index * .61803398875 % 1) * 49;
    positions.push(radius * spread * Math.cos(angle), radius * spread * Math.sin(angle), radius * z);
    seeds.push(index * .41421356237 % 1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 } },
    vertexShader: `
      uniform float uTime;
      uniform float uDpr;
      attribute float aSeed;
      varying float vLight;
      void main() {
        vLight = (0.28 + aSeed * 0.61) * (0.77 + 0.23 * sin(aSeed * 44.0 + uTime * 1.1));
        gl_PointSize = (1.25 + pow(aSeed, 5.0) * 2.5) * uDpr;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float vLight;
      void main() {
        float softness = 1.0 - smoothstep(0.04, 0.5, length(gl_PointCoord - vec2(0.5)));
        gl_FragColor = vec4(1.0, 0.86, 0.54, vLight * softness);
      }`,
  });
  const stars = new Points(geometry, material);
  stars.renderOrder = -2;
  return stars;
}

function createHalo() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(96, 96, 0, 96, 96, 96);
  gradient.addColorStop(0, '#ffd02ddd');
  gradient.addColorStop(.22, '#ffb819a8');
  gradient.addColorStop(.46, '#fca21062');
  gradient.addColorStop(.71, '#ee800525');
  gradient.addColorStop(1, '#d7740000');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 192, 192);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const halo = new Sprite(new SpriteMaterial({ map: texture, depthWrite: false, transparent: true }));
  halo.scale.set(9.3, 9.3, 1);
  halo.renderOrder = -1;
  return halo;
}

export interface IPlanetScene {
  resize(width: number, height: number, planetWidth: number): void;
  draw(elapsedSeconds: number, animateText: boolean): void;
  moveCamera(horizontal: number, vertical: number): void;
  zoom(multiplier: number): void;
  resetView(): void;
  dispose(): void;
}

export function createPlanetScene(canvas: HTMLCanvasElement, phrases: readonly string[], onViewChange: () => void): IPlanetScene | undefined {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) return;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, .12, 150);
  const initialDirection = new Vector3(.04, .22, 1).normalize();
  const angles = new Spherical();
  const cameraAxis = new Vector3();
  let heightPerDepth = .06;
  let fitDistance = 14;
  camera.position.copy(initialDirection).multiplyScalar(fitDistance);

  const cameraControls = new OrbitControls(camera, canvas);
  cameraControls.enablePan = false;
  cameraControls.zoomToCursor = false;
  cameraControls.minPolarAngle = .05;
  cameraControls.maxPolarAngle = Math.PI - .05;
  cameraControls.rotateSpeed = .65;
  cameraControls.zoomSpeed = .75;
  cameraControls.addEventListener('change', onViewChange);

  const sphere = new Mesh(new SphereGeometry(.96, 48, 32), sphereMaterial.clone());
  const ring = new Mesh(new RingGeometry(ringInnerRadius, ringRadius, 120, 1), createRingMaterial());
  ring.rotation.x = -Math.PI / 2;
  const stars = createStars();
  const halo = createHalo();
  const text = createTextOrbits(phrases);
  scene.add(stars, halo, sphere, ring, ...text.sprites);

  return {
    resize(width, height, planetWidth) {
      if (!width || !height || !planetWidth) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
      const desiredWidth = planetWidth * .84;
      const halfFov = Math.tan(Math.PI * camera.fov / 360);
      const nextDistance = ringRadius * height / (desiredWidth * halfFov);
      heightPerDepth = (width <= 680 ? 40 : 63) * 2 * halfFov / height;
      camera.position.multiplyScalar(nextDistance / fitDistance);
      fitDistance = nextDistance;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      cameraControls.minDistance = Math.max(6, fitDistance * .74);
      cameraControls.maxDistance = fitDistance * 1.92;
      stars.material.uniforms.uDpr.value = pixelRatio;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      cameraControls.update();
    },
    draw(elapsedSeconds, animateText) {
      cameraAxis.copy(camera.position).normalize();
      halo.position.copy(cameraAxis).multiplyScalar(-1.15);
      stars.material.uniforms.uTime.value = elapsedSeconds;
      text.draw(elapsedSeconds, animateText, cameraAxis, camera.position.length(), heightPerDepth);
      renderer.render(scene, camera);
    },
    moveCamera(horizontal, vertical) {
      angles.setFromVector3(camera.position);
      angles.theta += horizontal;
      angles.phi = MathUtils.clamp(angles.phi + vertical, cameraControls.minPolarAngle, cameraControls.maxPolarAngle);
      camera.position.setFromSpherical(angles);
      cameraControls.update();
    },
    zoom(multiplier) {
      camera.position.setLength(MathUtils.clamp(camera.position.length() * multiplier,
        cameraControls.minDistance, cameraControls.maxDistance));
      cameraControls.update();
    },
    resetView() {
      camera.position.copy(initialDirection).multiplyScalar(fitDistance);
      cameraControls.update();
    },
    dispose() {
      cameraControls.dispose();
      text.dispose();
      halo.material.map?.dispose();
      halo.material.dispose();
      for (const item of [sphere, ring, stars]) {
        item.geometry.dispose();
        item.material.dispose();
      }
      renderer.dispose();
    },
  };
}
