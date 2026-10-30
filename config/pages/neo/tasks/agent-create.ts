import { addMyAgent } from "@/hooks/pages/neo/use-my-agents";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * Create an agent (24 Oct 2026). Neo asks what the agent is for, where it
 * gets its data, when it runs and what it may do on its own, with Neo's
 * pick filled in where there is a sensible one, then saves it as a draft
 * in My agents. A draft never runs: switching it on is a separate step.
 *
 * DEV: POST /api/neo/agents with the answers; the server returns the draft.
 */
/** The Agents page (components/neo/page/agents/bar.tsx), spelled out here so the task doesn't import a screen. */
const AGENTS_HREF = "/inbox?module=NEO&page=agents";

const GOALS = [
  { id: "recon", label: "Reconcile bank, payouts and books", name: "Reconciliation Assistant" },
  { id: "follow", label: "Follow up on overdue invoices", name: "Receivables Follow-up" },
  { id: "bills", label: "Check bills before they are paid", name: "Payables Review" },
  { id: "gst", label: "Review GST on invoices", name: "GST Review" },
];

const agentCreate: NeoTask = {
  id: "agent-create",
  title: "Create an agent",
  match: (p) =>
    has(p, /\b(create|build|make|new|set ?up)\b/i) && has(p, /\bagents?\b/i)
      ? 80
      : 0,
  run: async (api) => {
    api.stage(1);
    await api.say(
      "Let's set up your agent. I'll ask a few short questions, then save it as a **draft** in My agents. A draft doesn't run until you switch it on."
    );
    const { choice, picks, notes } = await decide(
      api,
      "Create an agent",
      [
        {
          id: "goal",
          question: "What should this agent do?",
          why: "Pick the job closest to it, or describe it in your own words.",
          recommended: "",
          options: GOALS.map((g) => ({ id: g.id, label: g.label })),
          other: { fallback: "custom", placeholder: "Describe the job in your own words" },
        },
        {
          id: "data",
          question: "Where should it get its data?",
          recommended: "tally",
          options: [
            { id: "tally", label: "Tally, through the connector", hint: "Always up to date" },
            { id: "files", label: "Files I upload each time", hint: "CSV, Excel or PDF" },
            { id: "inbox", label: "Documents in my Inbox" },
          ],
        },
        {
          id: "when",
          question: "When should it run?",
          recommended: "ask",
          options: [
            { id: "ask", label: "When I ask it" },
            { id: "month", label: "Every month end" },
            { id: "week", label: "Every week" },
          ],
        },
        {
          id: "access",
          question: "What may it do on its own?",
          why: "You can change this later.",
          recommended: "prepare",
          options: [
            { id: "prepare", label: "Prepare the work; I approve it", hint: "Nothing reaches your books without your click" },
            { id: "read", label: "Read only", hint: "It can look, never change" },
          ],
        },
      ],
      [
        { id: "create", label: "Create agent", primary: true, risk: "draft" },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (choice !== "create") return "Not created";

    const goal = GOALS.find((g) => g.id === picks.goal);
    const said = notes.goal?.trim();
    const name =
      goal?.name ||
      (said ? said.replace(/^./, (c) => c.toUpperCase()).slice(0, 32) : "My agent");
    const label = (id: string, map: Record<string, string>) => map[id] || id;
    const made = addMyAgent({
      name,
      goal: goal?.label || said || "Custom job",
      data: label(picks.data, {
        tally: "Tally",
        files: "Uploaded files",
        inbox: "Inbox documents",
      }),
      schedule: label(picks.when, {
        ask: "When asked",
        month: "Every month end",
        week: "Every week",
      }),
      access: label(picks.access, {
        prepare: "Prepares, you approve",
        read: "Read only",
      }),
    });
    await api.say(
      `**${made.name}** is saved as a draft in My agents. It will ${made.goal.toLowerCase()}, using ${made.data.toLowerCase()}, ${made.schedule.toLowerCase()}. It won't run until you switch it on.`,
      [{ label: "Open My agents", href: AGENTS_HREF }]
    );
    return "Agent created";
  },
};

export default agentCreate;
