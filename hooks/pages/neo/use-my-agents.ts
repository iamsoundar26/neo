import { useSyncExternalStore } from "react";

/**
 * The agents a person has made themselves (24 Oct 2026): what Create agent
 * leaves behind. A new agent is a draft until it is switched on; nothing it
 * is told to do runs before then. Kept on this device.
 *
 * DEV: GET/POST /api/neo/agents?scope=mine.
 */
export type MyAgentStatus = "active" | "draft" | "paused";

export type MyAgent = {
  id: string;
  name: string;
  /** What it was asked to do, in the person's words or a picked job. */
  goal: string;
  data: string;
  schedule: string;
  access: string;
  status: MyAgentStatus;
  /** Set when it came from a suggested agent: that agent's id. */
  fromId?: string;
  createdAt: string;
  updatedAt: string;
};

const KEY = "neo.myAgents";
let list: MyAgent[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const load = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    list = (JSON.parse(localStorage.getItem(KEY) || "[]") as MyAgent[]).map(
      (a) => ({ ...a, updatedAt: a.updatedAt || a.createdAt })
    );
  } catch {
    list = [];
  }
};
const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  listeners.forEach((f) => f());
};

export const addMyAgent = (
  a: Omit<MyAgent, "id" | "createdAt" | "updatedAt" | "status">
) => {
  load();
  const made: MyAgent = {
    ...a,
    id: `mine-${Date.now().toString(36)}`,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list = [made, ...list];
  emit();
  return made;
};

/** Switch on, pause or resume. A draft only runs once it is switched on. */
/**
 * Chatting with a suggested agent makes it yours (24 Oct 2026): it joins My
 * agents, switched on, the first time you work with it. Once only.
 */
export const adoptSuggestedAgent = (a: {
  id: string;
  name: string;
  goal: string;
  data: string;
  schedule: string;
  access: string;
}) => {
  load();
  if (list.some((x) => x.fromId === a.id)) return;
  const { id, ...rest } = a;
  const now = new Date().toISOString();
  list = [
    {
      ...rest,
      id: `mine-${Date.now().toString(36)}`,
      fromId: id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    ...list,
  ];
  emit();
};

export const setMyAgentStatus = (id: string, status: MyAgentStatus) => {
  load();
  list = list.map((a) =>
    a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
  );
  emit();
};

export const removeMyAgent = (id: string) => {
  load();
  list = list.filter((a) => a.id !== id);
  emit();
};

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => {
  load();
  return list;
};
const server: MyAgent[] = [];

/** The agents now, for code that isn't a component (a task running one). */
export const getMyAgents = () => snapshot();

export const useMyAgents = () =>
  useSyncExternalStore(subscribe, snapshot, () => server);
