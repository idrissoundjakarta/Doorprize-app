import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Adegan 3D "Kado kejutan" (Three.js di atas WebGL).
 * Semua bentuk dibuat dari kode (tanpa file 3D), warna mengikuti palet KV.
 * Timeline dikendalikan dari luar lewat update(p): p = 0..1 sepanjang durasi undi.
 */
export type GiftOptions = { box: string; ribbon: string; glow: string; hemat: boolean };

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
function bounce(x: number) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

export function createGiftScene(canvas: HTMLCanvasElement, o: GiftOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !o.hemat, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.hemat ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 2.2, 11);
  camera.lookAt(0, 2.15, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(o.glow), 2.5);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  // ---------- Bahan ----------
  const boxMat = new THREE.MeshPhysicalMaterial({ color: o.box, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.18 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: o.ribbon, metalness: 1, roughness: 0.22 });
  const insideMat = new THREE.MeshBasicMaterial({ color: o.glow });

  // ---------- Kotak kado ----------
  const gift = new THREE.Group();
  scene.add(gift);
  const W = 2.2, H = 1.7;
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, H, W, 4, 0.12), boxMat);
  base.position.y = H / 2;
  gift.add(base);
  const band = (w: number, h: number, d: number, y: number, parent: THREE.Object3D) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ribbonMat);
    m.position.y = y;
    parent.add(m);
    return m;
  };
  band(0.36, H + 0.02, W + 0.03, H / 2, gift);
  band(W + 0.03, H + 0.02, 0.36, H / 2, gift);
  // Isi kotak yang menyala (terlihat saat tutup terbuka)
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, W - 0.2), insideMat);
  inside.rotation.x = -Math.PI / 2;
  inside.position.y = H - 0.02;
  gift.add(inside);

  // Tutup + pita + simpul
  const lid = new THREE.Group();
  lid.position.y = H;
  gift.add(lid);
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(W + 0.2, 0.42, W + 0.2, 4, 0.1), boxMat);
  lidMesh.position.y = 0.21;
  lid.add(lidMesh);
  band(0.38, 0.44, W + 0.23, 0.21, lid);
  band(W + 0.23, 0.44, 0.38, 0.21, lid);
  const loopGeo = new THREE.TorusGeometry(0.42, 0.1, 14, 40);
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(loopGeo, ribbonMat);
    loop.position.set(s * 0.36, 0.72, 0);
    loop.rotation.set(0, s * 0.35, s * 0.55);
    loop.scale.set(1, 0.72, 1);
    lid.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), ribbonMat);
  knot.position.y = 0.5;
  lid.add(knot);

  // Berkas cahaya dari dalam kotak
  // Gradien: terang di dasar (mulut kotak), memudar ke atas.
  const beamAlpha = (() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, "#fff");
    gr.addColorStop(0.35, "#888");
    gr.addColorStop(1, "#000");
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  })();
  const beamMat = new THREE.MeshBasicMaterial({ color: o.glow, alphaMap: beamAlpha, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.9, 7, 40, 1, true), beamMat);
  beam.position.y = H + 3.5;
  gift.add(beam);
  const glowLight = new THREE.PointLight(new THREE.Color(o.glow), 0, 12, 1.5);
  glowLight.position.y = H + 0.6;
  gift.add(glowLight);

  // Bayangan lembut di lantai
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,.55)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  scene.add(shadow);

  // ---------- Serpihan confetti 3D saat tutup terbuka ----------
  const N = o.hemat ? 90 : 220;
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.02, 0.16), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3 }), N);
  const palette = [new THREE.Color(o.ribbon), new THREE.Color(o.glow), new THREE.Color("#ffffff")];
  const P = Array.from({ length: N }, (_, i) => {
    bits.setColorAt(i, palette[i % 3]);
    const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4;
    return { v: new THREE.Vector3(Math.cos(a) * sp * 0.5, 4 + Math.random() * 6, Math.sin(a) * sp * 0.5), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), spin: (Math.random() - 0.5) * 12 };
  });
  bits.visible = false;
  scene.add(bits);
  const dummy = new THREE.Object3D();

  let w = 1, h = 1;
  const resize = (cw: number, ch: number) => {
    w = cw;
    h = ch;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Layar sempit (HP berdiri): kamera mundur supaya kado tetap utuh.
    camera.position.z = 11 * Math.max(1, 1.5 / camera.aspect);
    camera.updateProjectionMatrix();
  };

  const update = (p: number, t: number) => {
    // 1. Kado jatuh dan memantul
    const drop = seg(p, 0, 0.14);
    gift.position.y = (1 - bounce(drop)) * 7;
    // 2. Bergoyang makin kencang
    const shake = Math.pow(seg(p, 0.16, 0.7), 1.6);
    const f = 10 + shake * 26;
    gift.rotation.z = Math.sin(t * f) * 0.1 * shake;
    gift.rotation.x = Math.cos(t * f * 0.9) * 0.06 * shake;
    gift.rotation.y = -0.55 + Math.sin(t * 0.6) * 0.12 + seg(p, 0, 0.7) * 0.3;
    const sq = 1 + Math.sin(t * f * 1.3) * 0.035 * shake;
    gift.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    // 3. Tutup terlempar, cahaya menyembur
    const pop = seg(p, 0.7, 0.86);
    const e = easeOut(pop);
    lid.position.set(e * 2.2, H + e * 5.5 - pop * pop * 1.5, -e * 1.2);
    lid.rotation.set(e * 0.8, e * 0.5, -e * 1.6);
    lid.visible = p < 0.95;
    beamMat.opacity = seg(p, 0.7, 0.78) * (0.3 + Math.sin(t * 3) * 0.04);
    glowLight.intensity = seg(p, 0.69, 0.76) * 60;
    insideMat.color.set(o.glow).multiplyScalar(0.4 + seg(p, 0.69, 0.76) * 1.2);
    // 4. Kamera mendekat perlahan
    camera.position.y = 2.2 + p * 0.3;
    camera.lookAt(0, 2.15 + seg(p, 0.7, 1) * 0.35, 0);
    // Serpihan
    if (p >= 0.7) {
      bits.visible = true;
      const tt = (p - 0.7) * 6;
      P.forEach((q, i) => {
        dummy.position.set(q.v.x * tt, H + q.v.y * tt - 4.9 * tt * tt * 0.9, q.v.z * tt);
        dummy.rotation.set(q.r.x + q.spin * tt, q.r.y + q.spin * tt * 0.7, 0);
        dummy.updateMatrix();
        bits.setMatrixAt(i, dummy.matrix);
      });
      bits.instanceMatrix.needsUpdate = true;
    } else bits.visible = false;
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
