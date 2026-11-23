"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/engine/types";
import { hexToRgb, isLightPalette } from "@/lib/color";
import { TEMPLATE_INDEX } from "./presets";

/**
 * Layer 1: background generatif WebGL. Digambar live oleh kartu grafis,
 * loop mulus tanpa batas, warna ikut palet KV, pas di rasio layar apa pun.
 * `intensity` 0 = tenang, 1 = intens (transisi halus).
 */
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uInt, uDim, uLight;
uniform int uTpl;
uniform vec3 uBg1, uBg2, uP, uP2;
float h(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float asp = uRes.x / uRes.y;
  float r = length(p * vec2(0.75, 1.0));
  vec3 col = mix(uBg1, uBg2, smoothstep(0.05, 1.05, r));
  float calm = smoothstep(0.12, 0.6, length(p * vec2(0.8, 1.2)));
  vec3 g = vec3(0.0);
  float sp = 0.6 + 1.4 * uInt;
  if (uTpl == 0) {
    for (int i = 0; i < 30; i++) {
      float f = float(i);
      vec2 c = vec2((h(f * 1.7) * 2.0 - 1.0) * asp * 0.55, (h(f * 2.3) * 2.0 - 1.0) * 0.55);
      c += vec2(sin(uTime * 0.05 * sp + f), cos(uTime * 0.043 * sp + f * 1.3)) * 0.12;
      float s = 0.025 + h(f * 5.1) * 0.085;
      float dd = length(p - c);
      float b = (smoothstep(s, s * 0.7, dd) * 0.75 + smoothstep(s * 1.8, 0.0, dd) * 0.35) * (0.35 + 0.65 * h(f * 9.7));
      b *= 0.55 + 0.45 * sin(uTime * (0.4 + h(f) * 1.2) + f);
      g += mix(uP, uP2, h(f * 3.3)) * b * 0.8;
    }
    float d = p.y * 0.96 + p.x * 0.28 - sin(uTime * 0.09 * sp) * 0.5;
    g += uP * exp(-d * d * 40.0) * 0.16;
  } else if (uTpl == 1) {
    for (int i = 0; i < 6; i++) {
      float f = float(i);
      vec2 o = vec2((f / 5.0 - 0.5) * asp * 1.2, -0.65);
      float a = sin(uTime * (0.12 + 0.05 * f) * sp + f * 1.7) * 0.55;
      vec2 dir = vec2(sin(a), cos(a));
      vec2 q = p - o;
      float al = dot(q, dir);
      float pe = abs(q.x * dir.y - q.y * dir.x);
      float beam = smoothstep(0.03 + al * 0.07, 0.0, pe) * smoothstep(0.0, 0.25, al) * exp(-al * 0.9);
      g += mix(uP, uP2, mod(f, 2.0)) * beam * 0.55;
    }
    g += uP * 0.10 * (0.5 + 0.5 * sin(p.x * 3.0 + uTime * 0.25)) * (1.0 - uv.y);
    g += uP2 * 0.06 * (0.5 + 0.5 * sin(p.y * 4.0 - uTime * 0.2)) * uv.y;
  } else {
    vec2 gr = p * 9.0;
    vec2 gf = abs(fract(gr) - 0.5);
    float line = smoothstep(0.47, 0.5, max(gf.x, gf.y));
    float wave = 0.5 + 0.5 * sin(length(p) * 6.0 - uTime * 0.5 * sp);
    g += uP * line * 0.12 * wave;
    float gl = fract((p.x + p.y) * 0.5 - uTime * 0.04 * sp) - 0.5;
    g += uP2 * exp(-gl * gl * 160.0) * 0.12;
  }
  g *= mix(0.3, 1.0, calm) * (0.75 + 0.6 * uInt);
  // Cahaya menggantikan warna dasar (bukan sekadar ditambah) supaya warnanya tetap emas/sesuai palet, tidak pudar jadi abu.
  float gl = clamp(max(g.r, max(g.g, g.b)) * 1.2, 0.0, 0.9);
  vec3 dark = col * (1.0 - gl) + g * 1.1;
  vec3 lite = mix(col, col * 0.88 + g * 0.9, 0.85);
  col = mix(dark, lite, uLight);
  col *= mix(1.0, 0.78, smoothstep(0.55, 1.25, r) * (1.0 - uLight));
  col = mix(col, uBg2 * (1.0 - uLight) + uBg1 * uLight, uDim * 0.55);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export function Background({ theme, intensity }: { theme: Theme; intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ theme, intensity });
  useEffect(() => {
    live.current = { theme, intensity };
  }, [theme, intensity]);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return; // tanpa WebGL: gradien CSS di belakang canvas tetap tampil
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = { res: u("uRes"), time: u("uTime"), int: u("uInt"), dim: u("uDim"), light: u("uLight"), tpl: u("uTpl"), bg1: u("uBg1"), bg2: u("uBg2"), p: u("uP"), p2: u("uP2") };
    const vec = (hex: string) => hexToRgb(hex).map((v) => v / 255) as [number, number, number];

    // HP/tablet: otomatis hemat (resolusi & fps lebih rendah) supaya tidak panas & boros baterai.
    const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900;
    let raf = 0, cur = live.current.intensity, last = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const { theme: th, intensity: target } = live.current;
      const hemat = th.quality === "hemat" || mobile;
      if (hemat && now - last < 33) return; // ±30 fps
      last = now;
      const scale = (hemat ? 0.5 : Math.min(window.devicePixelRatio, 1.5)) * 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * scale)), hh = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
      cur += (target - cur) * 0.03; // transisi tenang ↔ intens ±1,5 dtk
      const p = th.palette;
      gl.viewport(0, 0, w, hh);
      gl.uniform2f(U.res, w, hh);
      gl.uniform1f(U.time, (now - t0) / 1000);
      gl.uniform1f(U.int, cur);
      gl.uniform1f(U.dim, th.dim);
      gl.uniform1f(U.light, isLightPalette(p) ? 1 : 0);
      gl.uniform1i(U.tpl, TEMPLATE_INDEX[th.template]);
      gl.uniform3fv(U.bg1, vec(p.bg1));
      gl.uniform3fv(U.bg2, vec(p.bg2));
      gl.uniform3fv(U.p, vec(p.primary));
      gl.uniform3fv(U.p2, vec(p.primary2));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const p = theme.palette;
  return (
    <canvas
      ref={ref}
      className="bg-canvas"
      style={{ background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${p.bg1}, ${p.bg2})` }}
    />
  );
}
