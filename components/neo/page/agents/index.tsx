import React, { useMemo, useState } from "react";
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
  Ellipsis,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNeoColumnHidden } from "@/components/neo/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="my-agents"
                  className="text-[20px] font-semibold leading-7 text-pi-ink"
                >
                  My agents
                </h2>
                <div className="flex items-center gap-2">
                  <Select
                    value={filter}
                    onValueChange={(v) => setFilter(v as StatusFilter)}
                  >
                    <SelectTrigger
                      aria-label="Filter my agents by status"
                      data-testid="status-filter"
                      className="h-9 w-[168px] rounded-lg border-pi-line-2 bg-background px-3 text-[14px] font-medium text-pi-ink focus:ring-2 focus:ring-pi-brand"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTERS.map((f) => (
                        <SelectItem key={f} value={f} className="text-[14px]">
                          {f === "All" ? "All statuses" : f}
                          <span className="ml-2 tabular-nums text-pi-faint">
                            {count(f)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <p className="text-[14px] font-medium leading-5 text-pi-ink">
                    {mine.length === 0
                      ? "You haven't made an agent yet"
                      : `No ${filter.toLowerCase()} agents`}
                  </p>
                  <p className="mt-1 text-[14px] leading-5 text-pi-body">
                    {mine.length === 0
                      ? "Create one and Neo will ask what it should do."
                      : "Agents with that status will show here."}
                  </p>
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
                className="text-[20px] font-semibold leading-7 text-pi-ink"
              >
                Suggested agents
              </h2>
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
        {a.goal} · {a.data} · {a.schedule}
      </span>
    </span>
    <span
      data-testid="my-agent-status"
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium",
        STATUS_STYLE[a.status]
      )}
    >
      {a.status === "active" && (
        <span className="h-1.5 w-1.5 rounded-full bg-pi-success-dot" />
      )}
      {STATUS_LABEL[a.status]}
    </span>
    <span className="hidden w-[88px] flex-none text-right text-[14px] text-pi-body sm:block">
      {ago(a.updatedAt)}
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
