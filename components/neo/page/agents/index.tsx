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
  // Ready first, then the ones still to come.
  const catalogue = [
    ...MOCK_AGENTS.filter((a) => a.status === "live"),
    ...MOCK_AGENTS.filter((a) => a.status !== "live"),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentsBar />
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-8 sm:px-8">
            {/* Your own agents, and the way to make one. */}
            <section aria-labelledby="my-agents">
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="my-agents"
                  className="text-[20px] font-semibold leading-7 text-pi-ink"
                >
                  My agents
                </h2>
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
                <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
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

            {/* What AI Accountant has built: open one for its plan. */}
            <section aria-labelledby="agents-built" className="mt-10">
              <h2
                id="agents-built"
                className="text-[20px] font-semibold leading-7 text-pi-ink"
              >
                Built by AI Accountant
              </h2>
              <ul
                className={cn(
                  "mt-4 grid gap-4 sm:grid-cols-2",
                  open ? "" : "xl:grid-cols-3"
                )}
              >
                {catalogue.map((a, i) => (
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

export default NeoAgents;
