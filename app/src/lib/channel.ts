import type { ShowState } from "@/engine/types";

/**
 * Jalur komunikasi jendela operator ↔ jendela show (di laptop yang sama).
 * Jendela operator memegang engine & data; jendela show hanya menampilkan
 * dan meneruskan tombol keyboard/clicker.
 */
export type Command = "next" | "back" | "hangus" | "blank";

export type Message =
  | { t: "state"; state: ShowState; hangusArmed: boolean }
  | { t: "hello" } // jendela show baru dibuka / di-refresh, minta state
  | { t: "alive" } // detak jantung dari jendela show
  | { t: "cmd"; cmd: Command };

export const CHANNEL = "doorprize-show";

export function openChannel(onMessage: (m: Message) => void): { send: (m: Message) => void; close: () => void } {
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (e) => onMessage(e.data as Message);
  return { send: (m) => ch.postMessage(m), close: () => ch.close() };
}
