import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Podium 3D bertingkat + sorot lampu + kilau turun (Showcase hadiah).
 * Dibuat dari kode, warna mengikuti palet KV. t = detik sejak adegan mulai.
 */
export type PodiumOptions = { metal: string; glow: string; light: boolean; hemat: boolean; sparkles: number };

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function gradientTexture(stops: [number, string][], w = 4, h = 256, vertical = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const gr = vertical ? g.createLinearGradient(0, h, 0, 0) : g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(c);
}

export function createPodiumScene(canvas: HTMLCanvasElement, o: PodiumOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !o.hemat });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.hemat ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const spot = new THREE.SpotLight(0xffffff, 120, 30, 0.42, 0.6, 1.4);
  spot.position.set(0, 12, 1.5);
  spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(new THREE.Color(o.glow), 1.5);
  rim.position.set(-4, 2, -5);
  scene.add(rim);

  // Podium 3 tingkat
  const metal = new THREE.MeshStandardMaterial({ color: o.metal, metalness: 1, roughness: 0.28 });
  const edge = new THREE.MeshStandardMaterial({ color: o.glow, metalness: 1, roughness: 0.15, emissive: new THREE.Color(o.glow), emissiveIntensity: 0.25 });
  const podium = new THREE.Group();
  scene.add(podium);
  const tiers: [number, number][] = [[3.4, 0.42], [2.7, 0.38], [2.0, 0.34]];
  let y = 0;
  tiers.forEach(([r, h]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 72), metal);
    t.position.y = y + h / 2;
    podium.add(t);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, 0.035, 10, 96), edge);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y + h;
    podium.add(ring);
    y += h;
  });
  const topY = y;

  // Cahaya bulat di lantai
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ map: gradientTexture([[0, o.light ? "rgba(255,255,255,.7)" : "rgba(255,240,210,.55)"], [1, "rgba(0,0,0,0)"]], 256, 256, false), transparent: true, depthWrite: false, blending: o.light ? THREE.NormalBlending : THREE.AdditiveBlending }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.005;
  scene.add(floorGlow);

  // Kerucut sorot lampu (terang di atas, memudar ke bawah)
  const beamMat = new THREE.MeshBasicMaterial({ color: o.glow, alphaMap: gradientTexture([[0, "#000"], [0.25, "#444"], [1, "#fff"]]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.8, 13, 48, 1, true), beamMat);
  beam.position.y = 6.5;
  scene.add(beam);

  // Kilau yang turun pelan
  const N = o.sparkles;
  const pos = new Float32Array(N * 3);
  const seed = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 3, y: Math.random() * 11, s: 0.3 + Math.random() * 0.7, ph: Math.random() * 6 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const star = gradientTexture([[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,.6)"], [1, "rgba(255,255,255,0)"]], 64, 64, false);
  const sparkMat = new THREE.PointsMaterial({ color: o.light ? o.metal : "#FFF6DC", size: 0.16, map: star, transparent: true, depthWrite: false, blending: o.light ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: 0 });
  const sparks = new THREE.Points(geo, sparkMat);
  scene.add(sparks);

  let w = 1, h = 1;
  const resize = (cw: number, ch: number) => {
    w = cw;
    h = ch;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const back = Math.max(1, 1.45 / camera.aspect);
    camera.position.set(0, 4.8 * back, 21 * back);
    camera.lookAt(0, 3.5, 0);
    camera.updateProjectionMatrix();
  };

  const update = (t: number) => {
    const rise = easeOut(clamp(t / 1.1));
    podium.position.y = (1 - rise) * -4;
    const light = clamp((t - 0.4) / 0.8);
    beamMat.opacity = light * (0.32 + Math.sin(t * 1.3) * 0.04);
    spot.intensity = 30 + light * 90;
    sparkMat.opacity = light;
    floorGlow.material.opacity = light;
    podium.rotation.y = t * 0.15;
    seed.forEach((q, i) => {
      const yy = ((q.y - t * 0.45 * q.s) % 11 + 11) % 11;
      pos[i * 3] = q.x * (0.35 + yy / 14) + Math.sin(t * 0.8 + q.ph) * 0.15;
      pos[i * 3 + 1] = yy + topY * 0.5;
      pos[i * 3 + 2] = q.z;
    });
    geo.attributes.position.needsUpdate = true;
    sparkMat.size = 0.12 + Math.sin(t * 6) * 0.02;
    renderer.render(scene, camera);
  };

  const dispose = () => {
    renderer.dispose();
    pmrem.dispose();
    env.dispose();
    scene.traverse((ob) => {
      const m = ob as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
  };
  return { resize, update, dispose, size: () => [w, h] };
}
