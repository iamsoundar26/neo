import React, { useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgePercent,
  Ban,
  FileSearch,
  Landmark,
  Lock,
  PenLine,
  Play,
  Receipt,
  ScanText,
  X,
} from "lucide-react";
import { NeoAgents as SeamIcon } from "@/components/icons";
import type { AgentProfile } from "@/types/pages/neo/agents";
import { RECON_AGENT_ID } from "@/config/pages/neo/mock-agents";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { JOBS } from "@/config/pages/neo/skills";
import { agentPageHref } from "./bar";
import { Button } from "@/components/ui/button";
import {
  removeMyAgent,
  setMyAgentStatus,
  type MyAgent,
} from "@/hooks/pages/neo/use-my-agents";
import { cn } from "@/lib/utils";

type Props = {
  agent: AgentProfile;
  company: string;
  onClose: () => void;
};

/** Each agent's mark, by what it works on. */
export const AGENT_ICON: Record<string, typeof Lock> = {
  [RECON_AGENT_ID]: SeamIcon as unknown as typeof Lock,
  "gstr-2b-itc": BadgePercent,
  "bank-book": Landmark,
  "vendor-statement": FileSearch,
  "tds-26as": Receipt,
  "bill-processing": ScanText,
};

const HEAD =
  "text-[12px] font-semibold uppercase tracking-[0.06em] text-pi-faint";

/**
 * An agent's details beside the directory (21 Oct 2026, after the AIA
 * 2.0 agents page): what it does, what it can do, what it needs, and
 * what it never does, under one Run button. The live recon agent also
 * links to its full page; a planned one says when it comes instead.
 */
const AgentPanel = ({ agent, company, onClose }: Props) => {
  const chat = useStartChat();
  const live = agent.status === "live";
  const unavailable = live ? JOBS[0].onlyFor?.(company) : undefined;
  const Icon = AGENT_ICON[agent.id] || FileSearch;
  const Access = agent.access === "Read-only" ? Lock : PenLine;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      aria-label={agent.name}
      className="flex min-h-0 w-full flex-none flex-col border-l border-pi-line bg-background duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-[420px] max-lg:shadow-popover-shadow lg:w-[400px]"
    >
      <header className="flex h-16 flex-none items-center gap-3 border-b border-pi-line px-5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-pi-line bg-pi-fill text-pi-brand">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-pi-ink">
          {agent.name}
        </h2>
        <button
          type="button"
          aria-label="Close"
          title="Close (Esc)"
          onClick={onClose}
          className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-none border-b border-pi-line px-5 py-4">
        {live ? (
          <button
            type="button"
            disabled={!!unavailable}
            title={unavailable}
            onClick={() => void chat("Reconcile September")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run agent
          </button>
        ) : (
          <p className="flex h-11 w-full items-center justify-center rounded-md border border-dashed border-pi-line-2 text-[14px] font-medium text-pi-body">
            {agent.eta || "Coming soon"}
          </p>
        )}
        {live && (
          <Link
            href={agentPageHref(agent.id)}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md text-body-3 font-medium text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            How it works, step by step
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6">
        <section>
          <h3 className={HEAD}>What this agent does</h3>
          <p className="mt-2 text-[14px] leading-[23px] text-pi-ink">
            {agent.goal}
          </p>
        </section>

        <section className="mt-7">
          <h3 className={HEAD}>What it can do</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {agent.does.map((d) => (
              <li
                key={d}
                className="flex gap-2.5 text-[14px] leading-[21px] text-pi-ink"
              >
                <span
                  aria-hidden
                  className="mt-[9px] h-1 w-1 flex-none rounded-full bg-pi-ink-2"
                />
                {d}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7">
          <h3 className={HEAD}>What it needs</h3>
          <ul className="mt-2.5 overflow-hidden rounded-lg border border-pi-line">
            {agent.sources.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between gap-3 border-t border-pi-line px-3 py-2 text-[14px] first:border-t-0"
              >
                <span className="font-medium text-pi-ink">{s.label}</span>
                <span className="text-body-4 text-pi-faint">{s.from}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex items-center gap-1.5 text-body-3 text-pi-body">
            <Access className="h-3.5 w-3.5" />
            {agent.access === "Read-only"
              ? "Read-only. It never changes your books."
              : "It prepares; nothing reaches your books without your approval."}
          </p>
        </section>

        <section className="mt-7">
          <h3 className={HEAD}>It never</h3>
          <ul className="mt-2.5 flex flex-col gap-2">
            {agent.never.map((n) => (
              <li
                key={n}
                className="flex gap-2.5 text-[14px] leading-5 text-pi-ink-2"
              >
                <Ban className="mt-[3px] h-3.5 w-3.5 flex-none text-pi-danger" />
                {n.charAt(0).toUpperCase() + n.slice(1)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
};

const STATUS_NOTE = {
  active: "Switched on and ready to run.",
  draft: "Saved, but not switched on yet. A draft won't run.",
  paused: "Stopped for now. Resume it when you want it back.",
} as const;
const STATUS_TAG = {
  active: "bg-pi-success-bg text-pi-success",
  draft: "bg-pi-fill text-pi-body",
  paused: "bg-pi-warning-bg text-pi-warning",
} as const;

/**
 * One of your own agents, beside the list (24 Oct 2026). It says what the
 * agent does and how it was set up. Agents run in the chat only, so the
 * main button starts a chat; a draft or paused agent offers to switch on
 * first.
 */
export const MyAgentPanel = ({
  agent: a,
  onClose,
}: {
  agent: MyAgent;
  onClose: () => void;
}) => {
  const chat = useStartChat();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const Access = a.access === "Read only" ? Lock : PenLine;
  const run = () =>
    void chat(a.fromId ? "Reconcile September" : `Run my agent: ${a.name}`);
  return (
    <aside
      aria-label={a.name}
      data-testid="my-agent-panel"
      className="flex min-h-0 w-full flex-none flex-col border-l border-pi-line bg-background duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:max-w-[420px] max-lg:shadow-popover-shadow lg:w-[400px]"
    >
      <header className="flex h-16 flex-none items-center gap-3 border-b border-pi-line px-5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-pi-line bg-pi-fill text-pi-brand">
          <FileSearch className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-pi-ink">
          {a.name}
        </h2>
        <button
          type="button"
          aria-label="Close"
          title="Close (Esc)"
          onClick={onClose}
          className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-none border-b border-pi-line px-5 py-4">
        {a.status === "active" ? (
          <Button
            data-testid="my-agent-run"
            onClick={run}
            className="h-11 w-full rounded-md text-[14px] font-semibold"
          >
            <Play className="h-4 w-4" />
            Run in chat
          </Button>
        ) : (
          <Button
            data-testid="my-agent-switch"
            onClick={() => setMyAgentStatus(a.id, "active")}
            className="h-11 w-full rounded-md text-[14px] font-semibold"
          >
            {a.status === "paused" ? "Resume" : "Switch on"}
          </Button>
        )}
        <p className="mt-2 text-[12px] leading-4 text-pi-body">
          Agents run in the chat. You&apos;ll see its progress there and answer
          anything it asks.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6">
        <section>
          <h3 className={HEAD}>Status</h3>
          <p className="mt-2 flex items-start gap-2.5 text-[14px] leading-5 text-pi-ink">
            <span
              className={cn(
                "inline-flex h-6 flex-none items-center rounded-full px-2.5 text-[12px] font-medium leading-4",
                STATUS_TAG[a.status]
              )}
            >
              {a.status === "active"
                ? "Active"
                : a.status === "draft"
                  ? "Draft"
                  : "Paused"}
            </span>
            <span className="pt-0.5 text-pi-body">{STATUS_NOTE[a.status]}</span>
          </p>
        </section>

        <section className="mt-7">
          <h3 className={HEAD}>What this agent does</h3>
          <p className="mt-2 text-[14px] leading-[23px] text-pi-ink">{a.goal}</p>
        </section>

        <section className="mt-7">
          <h3 className={HEAD}>How it is set up</h3>
          <ul className="mt-2.5 overflow-hidden rounded-lg border border-pi-line">
            {[
              ["Data from", a.data],
              ["Runs", a.schedule],
              ["Last changed", new Date(a.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
            ].map(([k, v]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-3 border-t border-pi-line px-3 py-2 text-[14px] first:border-t-0"
              >
                <span className="font-medium text-pi-ink">{k}</span>
                <span className="text-pi-body">{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex items-center gap-1.5 text-body-3 text-pi-body">
            <Access className="h-3.5 w-3.5" />
            {a.access === "Read only"
              ? "Read only. It never changes your books."
              : "It prepares; nothing reaches your books without your approval."}
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          {a.status === "active" && (
            <Button
              variant="outline"
              onClick={() => setMyAgentStatus(a.id, "paused")}
              className="h-9 rounded-lg px-4 text-[14px] font-medium"
            >
              Pause
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              removeMyAgent(a.id);
              onClose();
            }}
            className="h-9 rounded-lg px-4 text-[14px] font-medium text-status-error hover:bg-pi-danger-bg"
          >
            Delete agent
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default AgentPanel;
