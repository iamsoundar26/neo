import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  REVIEW_LABEL,
  currentVersion,
  latestRun,
  useRecon,
} from "@/hooks/pages/neo/use-recon";
import {
  MOCK_AGENTS,
  RECON_AGENT_ID,
  agentById,
} from "@/config/pages/neo/mock-agents";
import type { AgentCategory, AgentProfile } from "@/types/pages/neo/agents";
import { cn } from "@/lib/utils";
import AgentsBar from "./bar";
import { AgentTile, FeaturedAgent } from "./card";
import { JOBS } from "@/config/pages/neo/skills";
import ReconAgent from "./recon";
import {
  ChevronDown,
  Ellipsis,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useNeoColumnHidden } from "@/components/neo/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import {
  removeMyAgent,
  setMyAgentStatus,
  useMyAgents,
  type MyAgent,
  type MyAgentStatus,
} from "@/hooks/pages/neo/use-my-agents";
import AgentPanel from "./panel";
import { AGENTS_HREF } from "./bar";

type Props = { company: string };

const FILTERS: ("All" | AgentCategory)[] = [
  "All",
  "Reconciliation",
  "Bookkeeping",
  "Receivables",
  "Compliance",
];

/**
 * Neo › Agents (21 Oct 2026). The directory: one card per agent, live
 * first, each with View agent. `?agent=` opens its details in a panel
 * beside the cards; `&view=page` opens the live agent's full page.
 */
const NeoAgents = ({ company }: Props) => {
  const router = useRouter();
  const id = router.query.agent as string | undefined;
  const open = agentById(id);
  // The full page is the live agent's alone; every other view is the
  // directory with the agent's details beside it.
  if (open?.id === RECON_AGENT_ID && router.query.view === "page")
    return <ReconAgent company={company} />;
  return (
    <Directory
      company={company}
      open={open}
      onClose={() =>
        void router.push(AGENTS_HREF, undefined, { shallow: true })
      }
    />
  );
};

type StatusFilter = "All" | "Active" | "Draft" | "Paused";
const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Draft", "Paused"];
const STATUS_LABEL: Record<MyAgentStatus, string> = {
  active: "Active",
  draft: "Draft",
  paused: "Paused",
};
/** What each status means, in the words an owner would use. */
const STATUS_HELP: Record<StatusFilter, string> = {
  All: "Every agent you've created",
  Active: "Switched on and ready to run",
  Draft: "Saved, but not switched on yet",
  Paused: "Stopped for now; resume any time",
};
const STATUS_TITLE: Record<MyAgentStatus, string> = {
  active: STATUS_HELP.Active,
  draft: STATUS_HELP.Draft,
  paused: STATUS_HELP.Paused,
};
const STATUS_STYLE: Record<MyAgentStatus, string> = {
  active: "bg-pi-success-bg text-pi-success",
  draft: "bg-pi-fill text-pi-body",
  paused: "bg-pi-warning-bg text-pi-warning",
};

/** "Just now", "5 min ago", "3 days ago". */
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const Directory = ({
  company,
  open,
  onClose,
}: Props & { open?: AgentProfile; onClose: () => void }) => {
  useRecon();
  const startChat = useStartChat();
  const columnHidden = useNeoColumnHidden();
  const mine = useMyAgents();
  const [filter, setFilter] = useState<StatusFilter>("All");
  const count = (f: StatusFilter) =>
    f === "All" ? mine.length : mine.filter((a) => a.status === f.toLowerCase()).length;
  const shown = useMemo(
    () =>
      mine.filter((a) => filter === "All" || a.status === filter.toLowerCase()),
    [mine, filter]
  );
  // Ready to run first, then the ones still to come.
  const suggested = [
    ...MOCK_AGENTS.filter((a) => a.status === "live"),
    ...MOCK_AGENTS.filter((a) => a.status !== "live"),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The bar only brings back the menu: on small screens, or when it is hidden. */}
      <div className={columnHidden ? "" : "lg:hidden"}>
        <AgentsBar />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-8 sm:px-8">
            {/* Agents you have made, by where they stand. */}
            <section aria-labelledby="my-agents">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0">
                  <h2
                    id="my-agents"
                    className="text-[18px] font-semibold leading-7 text-pi-ink"
                  >
                    My agents
                  </h2>
                  <p className="mt-1 max-w-[68ch] text-[14px] leading-5 text-pi-body [text-wrap:pretty]">
                    Agents you&apos;ve created. A <strong className="font-semibold text-pi-ink">Draft</strong> won&apos;t run until you switch it on.
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Filter my agents by status. Showing ${filter === "All" ? "all statuses" : filter}`}
                        data-testid="status-filter"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-pi-line-2 bg-background px-3 text-[14px] font-medium leading-5 text-pi-ink transition-colors hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand data-[state=open]:bg-pi-fill"
                      >
                        {filter === "All" ? "All statuses" : filter}
                        <span className="tabular-nums text-pi-body">
                          {count(filter)}
                        </span>
                        <ChevronDown className="h-4 w-4 text-pi-body" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[280px]">
                      <DropdownMenuRadioGroup
                        value={filter}
                        onValueChange={(v) => setFilter(v as StatusFilter)}
                      >
                        {STATUS_FILTERS.map((f) => (
                          <DropdownMenuRadioItem
                            key={f}
                            value={f}
                            data-testid={`filter-${f}`}
                            className="items-start py-2"
                          >
                            <span className="block min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-3 text-[14px] font-medium leading-5 text-pi-ink">
                                {f === "All" ? "All statuses" : f}
                                <span className="tabular-nums text-pi-body">
                                  {count(f)}
                                </span>
                              </span>
                              <span className="block text-[12px] leading-4 text-pi-body">
                                {STATUS_HELP[f]}
                              </span>
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    data-testid="create-agent"
                    onClick={() => void startChat("Create an agent")}
                    className="h-9 rounded-lg px-4 text-[14px] font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Create agent
                  </Button>
                </div>
              </div>

              {shown.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-pi-line-2 px-4 py-8 text-center">
                  <p className="text-[16px] font-semibold leading-6 text-pi-ink">
                    {mine.length === 0
                      ? "You haven't created an agent yet"
                      : `No ${filter.toLowerCase()} agents`}
                  </p>
                  <p className="mx-auto mt-1 max-w-[52ch] text-[14px] leading-5 text-pi-body">
                    {mine.length === 0
                      ? "Start with a suggested agent below, or create your own and Neo will ask what it should do."
                      : "Agents with that status will show here."}
                  </p>
                  {mine.length === 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        onClick={() => void startChat("Create an agent")}
                        className="h-9 rounded-lg px-4 text-[14px] font-semibold"
                      >
                        <Plus className="h-4 w-4" />
                        Create agent
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          document
                            .getElementById("agents-suggested")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" })
                        }
                        className="h-9 rounded-lg px-4 text-[14px] font-medium"
                      >
                        See suggested agents
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-pi-line-2 overflow-hidden rounded-xl border border-pi-line-2">
                  {shown.map((a) => (
                    <MyAgentRow key={a.id} agent={a} />
                  ))}
                </ul>
              )}
            </section>

            {/* Agents we have built: open one for its plan. */}
            <section aria-labelledby="agents-suggested" className="mt-10">
              <h2
                id="agents-suggested"
                className="text-[18px] font-semibold leading-7 text-pi-ink"
              >
                Suggested agents
              </h2>
              <p className="mt-1 max-w-[68ch] text-[14px] leading-5 text-pi-body [text-wrap:pretty]">
                Ready-made agents. Open one to see what it does, what it needs,
                and what it never does.
              </p>
              <ul
                className={cn(
                  "mt-4 grid gap-4",
                  open ? "grid-cols-1" : "sm:grid-cols-2"
                )}
              >
                {suggested.map((a, i) => (
                  <li key={a.id}>
                    <AgentTile
                      agent={a}
                      index={i}
                      selected={open?.id === a.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        {open && (
          <AgentPanel
            key={open.id}
            agent={open}
            company={company}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

/** One of your agents: what it does, where it stands, and its menu. */
const MyAgentRow = ({ agent: a }: { agent: MyAgent }) => (
  <li
    data-testid="my-agent"
    data-status={a.status}
    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-pi-row-hover"
  >
    <span
      aria-hidden
      className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-pi-line-2 bg-pi-head-bg text-pi-brand"
    >
      <Sparkles className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[16px] font-semibold leading-6 text-pi-ink">
        {a.name}
      </span>
      <span className="block truncate text-[14px] leading-5 text-pi-body">
        {a.goal}
      </span>
      <span className="block truncate text-[12px] leading-4 text-pi-body">
        Uses {a.data} · Runs {a.schedule.toLowerCase()} · Edited {ago(a.updatedAt).toLowerCase()}
      </span>
    </span>
    <span
      data-testid="my-agent-status"
      title={STATUS_TITLE[a.status]}
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium leading-4",
        STATUS_STYLE[a.status]
      )}
    >
      {a.status === "active" && (
        <span className="h-1.5 w-1.5 rounded-full bg-pi-success-dot" />
      )}
      {STATUS_LABEL[a.status]}
    </span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Options for ${a.name}`}
          className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border data-[state=open]:bg-pi-fill"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {a.status === "active" ? (
          <DropdownMenuItem
            onSelect={() => setMyAgentStatus(a.id, "paused")}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => setMyAgentStatus(a.id, "active")}
          >
            <Play className="mr-2 h-4 w-4" />
            {a.status === "paused" ? "Resume" : "Switch on"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => removeMyAgent(a.id)}
          className="text-status-error focus:text-status-error"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </li>
);

export default NeoAgents;
