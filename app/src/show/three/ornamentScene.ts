import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Ornamen 3D di layar pemenang:
 * - Buket balon kiri & kanan (lateks mengilap + balon foil bintang), talinya berkumpul ke satu ikatan.
 * - Meriam confetti foil 3D (berkilau kena cahaya, melayang jatuh sambil berputar).
 * - Pita serpentin & kado kecil yang muncul memantul.
 * Tengah layar dikosongkan untuk nomor & nama. Semua gerak dihitung dari waktu (t),
 * jadi jendela LED dan pratinjau sama persis dan tetap halus di laptop lambat.
 */
export type OrnamentOptions = {
  /** Warna balon per buket (diulang kiri & kanan); awali "metal:" untuk balon foil/krom. */
  balloons: string[];
  /** Jumlah balon foil bintang per sisi. */
  stars: number;
  starColor: string;
  gift: string;
  ribbon: string;
  gifts: number;
  curls: number;
  /** Warna confetti (foil). */
  confetti: string[];
  confettiCount: number;
  hemat: boolean;
};

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** Memantul sedikit melewati target lalu kembali (seperti balon/kado yang "pop" masuk). */
const easeOutBack = (x: number) => {
  const c1 = 1.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const rnd = (i: number, k: number) => (Math.sin(i * 91.7 + k * 13.13) * 43758.5453) % 1 + (Math.sin(i * 91.7 + k * 13.13) < 0 ? 1 : 0);

type Balloon = { g: THREE.Group; side: number; home: THREE.Vector2; z: number; delay: number; ph: number; scale: number; string: THREE.Line; star: boolean };
type Piece = { obj: THREE.Object3D; side: number; home: THREE.Vector2; z: number; delay: number; ph: number; spin: number };

export function createOrnamentScene(canvas: HTMLCanvasElement, o: OrnamentOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !o.hemat });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.hemat ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Pencahayaan panggung: lampu utama hangat, isi dingin, dan lampu belakang (rim) supaya tepi balon bercahaya.
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x202040, 0.6));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.4);
  key.position.set(4, 7, 9);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 0.7);
  fill.position.set(-6, -2, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(0, 3, -10);
  scene.add(rim);

  // ---------- Bahan ----------
  const latex = (color: string) => {
    const c = new THREE.Color(color);
    return new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 1,
      sheenRoughness: 0.4,
      sheenColor: c.clone().lerp(new THREE.Color(0xffffff), 0.5),
      envMapIntensity: 1.1,
    });
  };
  const foil = (color: string) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.14, envMapIntensity: 1.6 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: o.ribbon, metalness: 1, roughness: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide });
  const giftMat = new THREE.MeshPhysicalMaterial({ color: o.gift, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
  const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });

  // ---------- Bentuk ----------
  // Balon lateks: tetesan air terbalik (lebar di atas, meruncing ke bawah) + leher & simpul.
  const prof: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI; // 0 = bawah, PI = atas
    const u = (1 - Math.cos(a)) / 2; // 0 bawah → 1 atas
    const r = Math.sin(a) * (0.7 + 0.3 * Math.pow(u, 0.6)) * 0.95;
    prof.push(new THREE.Vector2(Math.max(0.0001, r), -Math.cos(a) * 1.18 - (1 - u) * 0.08));
  }
  const balloonGeo = new THREE.LatheGeometry(prof, o.hemat ? 28 : 48);
  const neckGeo = new THREE.CylinderGeometry(0.05, 0.11, 0.16, 14);
  const knotGeo = new THREE.TorusGeometry(0.08, 0.04, 8, 16);

  // Balon foil bintang: bentuk bintang yang "menggembung" (bevel tebal).
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1.15 : 0.52;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.2, bevelSegments: o.hemat ? 4 : 8, curveSegments: 4 });
  starGeo.center();

  const giftGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.06);

  const makeBalloon = (col: string) => {
    const metal = col.startsWith("metal:");
    const color = metal ? col.slice(6) : col;
    const mat = metal ? foil(color) : latex(color);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(balloonGeo, mat));
    const neck = new THREE.Mesh(neckGeo, mat);
    neck.position.y = -1.32;
    g.add(neck);
    const knot = new THREE.Mesh(knotGeo, mat);
    knot.position.y = -1.42;
    knot.rotation.x = Math.PI / 2;
    g.add(knot);
    return g;
  };
  const makeStar = () => {
    const g = new THREE.Group();
    const mat = foil(o.starColor);
    mat.roughness = 0.22;
    mat.emissive = new THREE.Color(o.starColor).multiplyScalar(0.18);
    const m = new THREE.Mesh(starGeo, mat);
    g.add(m);
    return g;
  };
  const makeGift = (i: number) => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(giftGeo, giftMat);
    g.add(box);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.22, 1.08, 2, 0.04), giftMat);
    lid.position.y = 0.45;
    g.add(lid);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 1.1), ribbonMat));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.18), ribbonMat));
    // Pita kupu-kupu: dua lengkung pipih + dua ekor.
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 28), ribbonMat);
      loop.scale.set(1.25, 1, 0.45);
      loop.position.set(s * 0.22, 0.7, 0);
      loop.rotation.set(0, 0, s * 0.45);
      g.add(loop);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.02), ribbonMat);
      tail.position.set(s * 0.12, 0.5, 0.56);
      tail.rotation.z = s * 0.5;
      g.add(tail);
    }
    const knotB = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), ribbonMat);
    knotB.position.y = 0.66;
    g.add(knotB);
    g.rotation.y = rnd(i, 3) * 0.8 - 0.4;
    return g;
  };
  const makeCurl = (i: number) => {
    // Pita serpentin: spiral pipih yang menjuntai.
    const pts: THREE.Vector3[] = [];
    const turns = 5 + Math.floor(rnd(i, 4) * 3);
    for (let k = 0; k <= turns * 20; k++) {
      const a = k * ((Math.PI * 2) / 20);
      const r = 0.28 - k * 0.0008;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -k * 0.022, Math.sin(a) * r));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 40, 0.03, 5, false);
    const m = new THREE.Mesh(geo, ribbonMat);
    m.scale.set(1, 1, 1);
    return m;
  };

  // ---------- Buket balon ----------
  const balloons: Balloon[] = [];
  const perSide = o.balloons.length;
  for (const side of [-1, 1]) {
    for (let j = 0; j < perSide + o.stars; j++) {
      const i = j + (side > 0 ? 50 : 0);
      const star = j >= perSide;
      const g = star ? makeStar() : makeBalloon(o.balloons[(j + (side > 0 ? 1 : 0)) % perSide]);
      const scale = star ? 0.9 : 0.82 + rnd(i, 1) * 0.3;
      g.scale.setScalar(scale);
      scene.add(g);
      // Posisi relatif (dikali setengah lebar/tinggi layar): buket di pinggir, sedikit menyebar.
      const ring = star ? 0.15 : j / Math.max(1, perSide - 1);
      const hx = side * (0.66 + ring * 0.2 + (rnd(i, 2) - 0.5) * 0.06 + (star ? 0.06 : 0));
      const hy = -0.02 + (star ? 0.22 : 0.42 * (1 - Math.abs(ring - 0.5) * 1.4)) + (rnd(i, 5) - 0.5) * 0.12;
      const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new THREE.Vector3())), stringMat);
      str.frustumCulled = false;
      scene.add(str);
      balloons.push({ g, side, home: new THREE.Vector2(hx, hy), z: star ? 1.2 : -1.2 + rnd(i, 6) * 2.2, delay: 0.05 + j * 0.07 + rnd(i, 7) * 0.15, ph: rnd(i, 8) * 6.28, scale, string: str, star });
    }
  }

  // ---------- Kado & pita ----------
  const pieces: Piece[] = [];
  for (let i = 0; i < o.gifts; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const obj = makeGift(i);
    obj.scale.setScalar(0.85 + rnd(i, 9) * 0.35);
    scene.add(obj);
    const k = Math.floor(i / 2);
    pieces.push({ obj, side, home: new THREE.Vector2(side * (0.8 - k * 0.15), -0.78 + k * 0.05), z: 1 + k * 0.6, delay: 0.35 + i * 0.12, ph: rnd(i, 10) * 6, spin: 0 });
  }
  const curls: Piece[] = [];
  for (let i = 0; i < o.curls; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const obj = makeCurl(i);
    scene.add(obj);
    curls.push({ obj, side, home: new THREE.Vector2(side * (0.34 + rnd(i, 11) * 0.3), 1.15), z: -0.5 + rnd(i, 12) * 2, delay: 0.25 + rnd(i, 13) * 0.9, ph: rnd(i, 14) * 6, spin: (rnd(i, 15) - 0.5) * 3 });
  }

  // ---------- Confetti foil (instanced = satu gambar untuk ratusan keping) ----------
  const nC = o.confettiCount;
  const cGeo = new THREE.PlaneGeometry(0.16, 0.09);
  const cMat = new THREE.MeshStandardMaterial({ metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.8 });
  const conf = new THREE.InstancedMesh(cGeo, cMat, nC);
  conf.frustumCulled = false;
  const cData = Array.from({ length: nC }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const wave = i % 5 === 4 ? 1 : 0; // sebagian kecil: gelombang kedua
    const ang = (side < 0 ? 62 : 118) * (Math.PI / 180) + (rnd(i, 20) - 0.5) * 0.7;
    const sp = 13 + rnd(i, 21) * 9;
    conf.setColorAt(i, new THREE.Color(o.confetti[i % o.confetti.length]));
    return { side, t0: 0.05 + wave * 0.9 + rnd(i, 22) * 0.12, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, z: -2 + rnd(i, 23) * 5, ax: rnd(i, 24) * 6, ay: rnd(i, 25) * 6, wr: 4 + rnd(i, 26) * 8, sway: 0.4 + rnd(i, 27) * 0.8, s: 0.7 + rnd(i, 28) * 0.7 };
  });
  if (conf.instanceColor) conf.instanceColor.needsUpdate = true;
  scene.add(conf);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const K = 1.6; // hambatan udara
  const G = -9.5; // gravitasi
  const VT = G / K; // kecepatan jatuh maksimum

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
    // Balon: naik dari bawah memantul, lalu bergoyang pelan seperti tertiup AC ruangan.
    balloons.forEach((b) => {
      const e = easeOutBack(clamp((t - b.delay) / 1.6));
      const anchorX = b.side * 0.78 * halfW, anchorY = -1.08 * halfH;
      const hx = b.home.x * halfW, hy = b.home.y * halfH;
      const sway = Math.sin(t * 0.8 + b.ph) * 0.22 + Math.sin(t * 1.9 + b.ph * 2) * 0.05;
      const x = anchorX + (hx - anchorX) * clamp(e, 0, 1.2) + sway;
      const y = anchorY - 2 + (hy - anchorY + 2) * e + Math.sin(t * 1.1 + b.ph) * 0.12;
      b.g.position.set(x, y, b.z);
      const lean = Math.atan2(x - anchorX, y - anchorY) * 0.5;
      b.g.rotation.set(Math.sin(t * 0.7 + b.ph) * 0.08, b.star ? Math.sin(t * 0.6 + b.ph) * 0.5 : t * 0.25 + b.ph, -lean);
      // Tali: lengkung lembut dari simpul ke ikatan di bawah layar.
      const pos = b.string.geometry.attributes.position as THREE.BufferAttribute;
      const knotOff = (b.star ? 1.25 : 1.5) * b.scale;
      const kx = x + Math.sin(lean) * knotOff, ky = y - Math.cos(lean) * knotOff;
      for (let k = 0; k < 12; k++) {
        const f = k / 11;
        const bend = Math.sin(f * Math.PI) * (0.35 * b.side + Math.sin(t * 1.3 + b.ph + f * 3) * 0.12);
        pos.setXYZ(k, kx + (anchorX - kx) * f + bend, ky + (anchorY - ky) * f, b.z + (0 - b.z) * f);
      }
      pos.needsUpdate = true;
    });

    // Kado: muncul memantul dari bawah, lalu bergoyang kecil.
    pieces.forEach((p) => {
      const e = easeOutBack(clamp((t - p.delay) / 0.9));
      p.obj.position.set(p.home.x * halfW, (p.home.y - 0.6 * (1 - clamp(e))) * halfH + Math.sin(t * 1.2 + p.ph) * 0.06, p.z);
      p.obj.scale.setScalar(Math.max(0.001, e) * (0.85 + (p.ph % 1) * 0.3));
      p.obj.rotation.x = Math.sin(t * 0.9 + p.ph) * 0.06 + 0.15;
      p.obj.rotation.z = Math.sin(t * 0.8 + p.ph) * 0.05;
    });

    // Pita serpentin: jatuh dari atas sambil berputar, lalu menggantung bergoyang.
    curls.forEach((c) => {
      const e = easeOut(clamp((t - c.delay) / 2.2));
      c.obj.position.set(c.home.x * halfW + Math.sin(t * 0.7 + c.ph) * 0.3, (c.home.y + 0.25 - e * 0.32) * halfH, c.z);
      c.obj.rotation.set(Math.sin(t + c.ph) * 0.15, t * c.spin * (1 - e * 0.7) + c.ph, Math.sin(t * 0.6 + c.ph) * 0.2);
    });

    // Confetti: rumus jatuh dengan hambatan udara (bukan simulasi per frame), jadi selalu konsisten.
    for (let i = 0; i < nC; i++) {
      const d = cData[i];
      const tt = t - d.t0;
      if (tt <= 0) {
        s3.set(0, 0, 0);
        m4.compose(v3.set(0, -100, 0), q.identity(), s3);
        conf.setMatrixAt(i, m4);
        continue;
      }
      const ex = (1 - Math.exp(-K * tt)) / K;
      const x0 = d.side * 1.02 * halfW, y0 = -1.02 * halfH;
      const x = x0 + d.vx * ex + Math.sin(tt * 2.2 + d.ax) * d.sway * clamp(tt - 0.6);
      const y = y0 + VT * tt + (d.vy - VT) * ex;
      v3.set(x, y, d.z);
      eul.set(d.ax + tt * d.wr, d.ay + tt * d.wr * 0.7, tt * 2 + d.ax);
      q.setFromEuler(eul);
      s3.setScalar(d.s);
      m4.compose(v3, q, s3);
      conf.setMatrixAt(i, m4);
    }
    conf.instanceMatrix.needsUpdate = true;

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
