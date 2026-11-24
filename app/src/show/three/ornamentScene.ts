import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Ornamen 3D di layar pemenang: balon, kado kecil, pita spiral.
 * Ditaruh di kiri-kanan (tengah dikosongkan untuk nomor & nama), masuk dari pinggir lalu melayang.
 */
export type OrnamentOptions = {
  balloons: string[]; // warna balon; awali "metal:" untuk balon metalik
  gift: string;
  ribbon: string;
  gifts: number;
  curls: number;
  hemat: boolean;
};

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

type Item = { obj: THREE.Object3D; home: THREE.Vector3; from: THREE.Vector3; delay: number; ph: number; spin: number; kind: "balloon" | "gift" | "curl" };

export function createOrnamentScene(canvas: HTMLCanvasElement, o: OrnamentOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !o.hemat });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.hemat ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(3, 6, 8);
  scene.add(key);

  // ---------- Bentuk ----------
  // Profil balon (diputar jadi bentuk 3D): bulat dengan ujung bawah meruncing.
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI; // 0 = bawah, PI = atas
    const taper = a < 0.9 ? 0.35 + (a / 0.9) * 0.65 : 1; // ujung bawah meruncing
    prof.push(new THREE.Vector2(Math.sin(a) * 0.9 * taper, -Math.cos(a) * 1.15));
  }
  const balloonGeo = new THREE.LatheGeometry(prof, o.hemat ? 24 : 40);
  const knotGeo = new THREE.ConeGeometry(0.12, 0.18, 12);
  const giftGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.08);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: o.ribbon, metalness: 1, roughness: 0.25 });
  const giftMat = new THREE.MeshPhysicalMaterial({ color: o.gift, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });
  const stringMat = new THREE.LineBasicMaterial({ color: o.ribbon, transparent: true, opacity: 0.6 });

  const makeBalloon = (col: string) => {
    const metal = col.startsWith("metal:");
    const color = metal ? col.slice(6) : col;
    const mat = metal ? new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.18 }) : new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.3 });
    const g = new THREE.Group();
    const b = new THREE.Mesh(balloonGeo, mat);
    g.add(b);
    const k = new THREE.Mesh(knotGeo, mat);
    k.position.y = -1.22;
    g.add(k);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.6) * 0.08, -1.3 - i * 0.13, 0));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), stringMat));
    return g;
  };
  const makeGift = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(giftGeo, giftMat));
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.02, 1.02), ribbonMat);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 0.2), ribbonMat);
    g.add(b1, b2);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 24), ribbonMat);
      loop.position.set(s * 0.17, 0.62, 0);
      loop.rotation.set(0, 0, s * 0.6);
      g.add(loop);
    }
    return g;
  };
  const makeCurl = () => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = i * 0.32;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.32, -i * 0.045, Math.sin(a) * 0.32));
    }
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.045, 6, false), ribbonMat);
  };

  // ---------- Penempatan: kiri & kanan, tengah kosong ----------
  const items: Item[] = [];
  const list: ("balloon" | "gift" | "curl")[] = [...o.balloons.map(() => "balloon" as const), ...Array(o.gifts).fill("gift"), ...Array(o.curls).fill("curl")];
  let bi = 0;
  list.forEach((kind, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const obj = kind === "balloon" ? makeBalloon(o.balloons[bi++]) : kind === "gift" ? makeGift() : makeCurl();
    const sc = kind === "balloon" ? 0.85 + ((i * 37) % 10) / 25 : kind === "gift" ? 0.75 + ((i * 13) % 10) / 30 : 1.1;
    obj.scale.setScalar(sc);
    scene.add(obj);
    const r = (k: number) => ((Math.sin(i * 91.7 + k * 13.1) + 1) / 2);
    items.push({
      obj,
      kind,
      // Di bawah area logo (kiri atas) & tidak terpotong tepi layar
      home: new THREE.Vector3(side * (0.6 + r(1) * 0.24), kind === "balloon" ? -0.1 + r(2) * 0.45 : -0.75 + r(3) * 0.75, -1.5 + r(4) * 2.5),
      from: new THREE.Vector3(side * 1.6, kind === "balloon" ? -1.6 : 1.4 - r(5) * 2.4, 0),
      delay: r(6) * 0.5,
      ph: r(7) * 6,
      spin: (r(8) - 0.5) * 0.8,
    });
  });

  let w = 1, h = 1, halfW = 1, halfH = 1;
  const resize = (cw: number, ch: number) => {
    w = cw;
    h = ch;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
  };

  const update = (t: number) => {
    items.forEach((it) => {
      const e = easeOut(clamp((t - it.delay) / 1.4));
      const hx = it.home.x * halfW, hy = it.home.y * halfH;
      const fx = it.from.x * halfW, fy = it.from.y * halfH;
      const bob = Math.sin(t * 0.9 + it.ph) * 0.25;
      it.obj.position.set(fx + (hx - fx) * e + Math.sin(t * 0.5 + it.ph) * 0.15, fy + (hy - fy) * e + bob, it.home.z);
      if (it.kind === "balloon") it.obj.rotation.set(0, t * 0.3 + it.ph, Math.sin(t * 0.7 + it.ph) * 0.12);
      else it.obj.rotation.set(Math.sin(t * 0.6 + it.ph) * 0.3 + it.ph, t * it.spin + it.ph, Math.cos(t * 0.5 + it.ph) * 0.25);
    });
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
