import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, OrthographicCamera,
  Points, RingGeometry, Scene, ShaderMaterial, SphereGeometry, WebGLRenderer,
} from 'three';

const ringRadius = 2.47;
const ringInnerRadius = 1.12;
const cycleSeconds = 14;

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
      vec3 light = normalize(vec3(-0.62, 0.76, 0.78));
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
        vec3 amber = vec3(1.0, 0.51, 0.039);
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
  for (let index = 1; index <= 240; index++) {
    positions.push((index * .61803398875 % 1) * 2 - 1, (index * .754877666 % 1) * 2 - 1, 0);
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
  stars.position.z = -4;
  stars.renderOrder = -1;
  return stars;
}

export interface IPlanetScene {
  resize(width: number, height: number, planetWidth: number): void;
  draw(elapsedSeconds: number): void;
  dispose(): void;
}

export function createPlanetScene(canvas: HTMLCanvasElement): IPlanetScene | undefined {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) return;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 40);
  camera.position.z = 10;

  const sphere = new Mesh(new SphereGeometry(.96, 48, 32), sphereMaterial.clone());
  const ring = new Mesh(new RingGeometry(ringInnerRadius, ringRadius, 120, 1), createRingMaterial());
  ring.rotation.order = 'ZYX';
  ring.rotation.z = .105;
  const stars = createStars();
  scene.add(stars, sphere, ring);

  return {
    resize(width, height, planetWidth) {
      if (!width || !height || !planetWidth) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
      const pixelsPerUnit = planetWidth / (ringRadius * 2);
      camera.left = -width / (2 * pixelsPerUnit);
      camera.right = -camera.left;
      camera.top = height / (2 * pixelsPerUnit);
      camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      stars.scale.set(camera.right, camera.top, 1);
      stars.material.uniforms.uDpr.value = pixelRatio;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    draw(elapsedSeconds) {
      const phase = elapsedSeconds * (2 * Math.PI / cycleSeconds);
      ring.rotation.x = Math.PI / 2 - .54 * Math.cos(phase);
      stars.material.uniforms.uTime.value = elapsedSeconds;
      renderer.render(scene, camera);
    },
    dispose() {
      for (const item of [sphere, ring, stars]) {
        item.geometry.dispose();
        item.material.dispose();
      }
      renderer.dispose();
    },
  };
}
