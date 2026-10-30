import { useSyncExternalStore } from "react";
import type { NeoRuntime } from "@/hooks/pages/neo/use-neo-runtime";

/**
 * Which chats have something new for you (24 Oct 2026), the way ChatGPT
 * marks it: while Neo works in a chat its row spins; when the work is done,
 * or waits on an answer, and you are somewhere else (another chat, the
 * Agents page, another menu), the row gets a dot. Opening the chat clears it.
 *
 * DEV: the server keeps `lastReadAt` per chat and says which are newer.
 */
let unread = new Set<string>();
let viewing: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const markUnread = (id: string) => {
  if (unread.has(id) || viewing === id) return;
  unread = new Set(unread).add(id);
  emit();
};
export const clearUnread = (id: string) => {
  if (!unread.has(id)) return;
  unread = new Set(unread);
  unread.delete(id);
  emit();
};
/** The chat on screen now, or none when Neo's chat isn't what you're looking at. */
export const setViewing = (id: string | null) => {
  viewing = id;
  if (id) clearUnread(id);
};
export const isViewing = (id: string) => viewing === id;

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
export const useUnread = () =>
  useSyncExternalStore(
    subscribe,
    () => unread,
    () => unread
  );

/** The run is stopped on a question or a sign-off: Neo needs you. */
export const awaitingYou = (neo: NeoRuntime) =>
  !!neo.busy &&
  neo.messages.some(
    (m) =>
      m.runId === neo.busy &&
      ((m.ask && !m.ask.answer) || (m.actions?.length && !m.chosen))
  );
