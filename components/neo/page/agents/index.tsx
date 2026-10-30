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
import { Sparkles } from "@/components/icons";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { useMyAgents } from "@/hooks/pages/neo/use-my-agents";
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

const Directory = ({
  company,
  open,
  onClose,
}: Props & { open?: AgentProfile; onClose: () => void }) => {
  useRecon();
  const startChat = useStartChat();
  const mine = useMyAgents();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const run = latestRun(company, "sep");
  const v = run && currentVersion(run);
  const lastRun =
    run && v
      ? {
          period: run.period.label,
          version: v.n,
          exceptions: v.exceptions.length,
          review: REVIEW_LABEL[v.review],
        }
      : undefined;
  const shown = useMemo(
    () => MOCK_AGENTS.filter((a) => filter === "All" || a.category === filter),
    [filter]
  );
  const featured = shown.filter((a) => a.status === "live");
  const upNext = shown.filter((a) => a.status !== "live");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentsBar />
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-10 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0">
                <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.02em] text-pi-ink">
                  Agents
                </h2>
                <p className="mt-1.5 max-w-[520px] text-[14px] leading-[22px] text-pi-body">
                  Neo&apos;s agents take on whole accounting jobs. They
                  prepare the work; you review and approve it.
                </p>
              </div>
              <div
                role="group"
                aria-label="Filter agents"
                className="flex rounded-lg bg-pi-fill p-0.5"
              >
                {FILTERS.map((f) => {
                  const on = f === filter;
                  const n =
                    f === "All"
                      ? MOCK_AGENTS.length
                      : MOCK_AGENTS.filter((a) => a.category === f).length;
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-body-3 font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                        on
                          ? "bg-background text-pi-ink shadow-pi-1"
                          : "text-pi-body hover:text-pi-ink"
                      )}
                    >
                      {f}
                      <span className="tabular-nums text-pi-faint">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Your own agents, and the way to make one. */}
            <section aria-labelledby="my-agents" className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="my-agents"
                  className="text-[16px] font-semibold text-pi-ink"
                >
                  My agents
                </h3>
                <button
                  type="button"
                  data-testid="create-agent"
                  onClick={() => void startChat("Create an agent")}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-pi-line-2 bg-background px-4 text-[14px] font-medium text-pi-ink transition-colors hover:border-pi-brand-border hover:bg-pi-brand-tint hover:text-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  <Sparkles className="h-4 w-4" />
                  Create agent
                </button>
              </div>
              {mine.length === 0 ? (
                <p className="mt-3 text-[14px] leading-5 text-pi-body">
                  You haven&apos;t made an agent yet. Create one and Neo will
                  ask what it should do.
                </p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
                  {mine.map((a) => (
                    <li
                      key={a.id}
                      data-testid="my-agent"
                      title={`${a.goal} · ${a.data} · ${a.schedule}`}
                      className="flex items-center gap-3"
                    >
                      <span
                        aria-hidden
                        className="grid h-9 w-9 place-items-center rounded-xl border border-pi-line-2 bg-pi-head-bg text-pi-brand"
                      >
                        <Sparkles className="h-[18px] w-[18px]" />
                      </span>
                      <span className="text-[14px] font-medium text-pi-ink">
                        {a.name}
                      </span>
                      <span className="inline-flex h-5 items-center rounded-full bg-pi-fill px-2 text-[12px] font-medium text-pi-body">
                        {a.status === "draft" ? "Draft" : "On"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {featured.length > 0 && (
              <section aria-label="Available now" className="mt-8 flex flex-col gap-5">
                {featured.map((a) => (
                  <FeaturedAgent
                    key={a.id}
                    agent={a}
                    selected={open?.id === a.id}
                    lastRun={a.id === RECON_AGENT_ID ? lastRun : undefined}
                    unavailable={
                      a.id === RECON_AGENT_ID
                        ? JOBS[0].onlyFor?.(company)
                        : undefined
                    }
                  />
                ))}
              </section>
            )}

            {upNext.length > 0 && (
              <section aria-labelledby="agents-next" className="mt-12">
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h3
                    id="agents-next"
                    className="text-[16px] font-semibold text-pi-ink"
                  >
                    Up next
                  </h3>
                  <span className="text-[12px] text-pi-faint">
                    Open a card to see the plan
                  </span>
                </div>
                <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                  {upNext.map((a, i) => (
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
            )}
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

export default NeoAgents;
