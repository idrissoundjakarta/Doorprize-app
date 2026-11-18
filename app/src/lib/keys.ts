import type { Command } from "./channel";

export type KeyCommand = Command | "fullscreen" | "panel";

/**
 * Tombol keyboard & clicker presentasi.
 * Clicker umumnya mengirim PageDown/PageUp, panah, dan B atau titik (layar hitam).
 */
export function keyToCommand(e: KeyboardEvent): KeyCommand | null {
  const el = e.target as HTMLElement | null;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case "PageDown":
    case "ArrowRight":
    case "ArrowDown":
    case " ":
    case "Enter":
      return "next";
    case "PageUp":
    case "ArrowLeft":
    case "ArrowUp":
      return "back";
    case "b":
    case "B":
    case ".":
      return "blank";
    case "h":
    case "H":
      return "hangus";
    case "f":
    case "F":
      return "fullscreen";
    case "m":
    case "M":
      return "panel";
    default:
      return null;
  }
}

export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}
