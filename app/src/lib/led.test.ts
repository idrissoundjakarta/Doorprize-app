import { describe, expect, it } from "vitest";
import { describeLed, sameAspect, showRect } from "./led";

describe("komposisi LED (patokan penerimaan #1)", () => {
  it("1920×1080: show mengisi kanvas", () => {
    expect(showRect(1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(describeLed(1920, 1080)).toMatch(/memenuhi/);
  });
  it("3840×1080: show 1920×1080 di tengah, frame 960 px per sisi", () => {
    expect(showRect(3840, 1080)).toEqual({ x: 960, y: 0, w: 1920, h: 1080 });
    expect(describeLed(3840, 1080)).toBe("Show 1920×1080 di tengah, frame 960 px di kiri dan 960 px di kanan.");
  });
  it("lebih sempit dari 16:9 (1440×1080): show utuh, frame atas/bawah", () => {
    const r = showRect(1440, 1080);
    expect(r).toEqual({ x: 0, y: 135, w: 1440, h: 810 });
    expect(r.y + r.h + r.y).toBe(1080);
  });
  it("LED potret 1080×1920: show utuh di tengah", () => {
    expect(showRect(1080, 1920)).toEqual({ x: 0, y: 656, w: 1080, h: 608 });
  });
  it("cek rasio sama", () => {
    expect(sameAspect(3840, 1080, 1920, 540)).toBe(true);
    expect(sameAspect(3840, 1080, 1920, 1080)).toBe(false);
  });
});
