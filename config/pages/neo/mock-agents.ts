import type { AgentProfile } from "@/types/pages/neo/agents";
import { NEO_AGENT, SKILLS } from "@/config/pages/neo/skills";

/**
 * Neo's agents (21 Oct 2026). The first is the live Three Way Recon agent
 * (config/pages/neo/skills.ts); the others are planned, drawn from the
 * product's modules — GST reconciliation, bank, vendor statements, TDS,
 * bills and receivables — so the directory shows where Neo is going.
 *
 * DEV: replace with GET /api/neo/agents?company=…
 */
export const RECON_AGENT_ID = NEO_AGENT.id;

export const MOCK_AGENTS: AgentProfile[] = [
  {
    id: NEO_AGENT.id,
    name: "Three-way reconciliation",
    category: "Reconciliation",
    status: "live",
    goal: NEO_AGENT.goal,
    output: "Match groups",
    sources: [
      { label: "Bank", from: "CSV" },
      { label: "Settlements", from: "CSV" },
      { label: "Books", from: "Tally" },
    ],
    access: "Read-only",
    skills: SKILLS.length,
    does: NEO_AGENT.may.slice(0, 3),
    never: NEO_AGENT.never.map((n) => n.text),
  },
  {
    id: "invoice-assistant",
    name: "Invoice Assistant",
    category: "Bookkeeping",
    status: "coming-soon",
    goal: "Drafts sales invoices from plain language and posts them after your confirmation.",
    output: "Sales invoices",
    sources: [
      { label: "Your request", from: "Chat" },
      { label: "Masters", from: "Tally" },
    ],
    access: "Prepares, you approve",
    skills: 4,
    does: [
      "Turns a sentence into a draft invoice with party, items and tax",
      "Picks ledgers, rates and GST from your history",
      "Shows the draft for your check before anything is posted",
    ],
    never: [
      "Post an invoice without your confirmation",
    ],
    eta: "Upcoming",
  },
  {
    id: "payables-review",
    name: "Payables Review",
    category: "Reconciliation",
    status: "coming-soon",
    goal: "Checks purchase bills against purchase orders and goods receipts before they are paid.",
    output: "Review list",
    sources: [
      { label: "Purchase bills", from: "Tally" },
      { label: "Purchase orders", from: "Tally" },
      { label: "Goods receipts", from: "Tally" },
    ],
    access: "Read-only",
    skills: 4,
    does: [
      "Matches each bill to its order and receipt",
      "Flags quantity, rate and tax differences",
      "Lists bills that are safe to pay",
    ],
    never: [
      "Approve or pay a bill",
    ],
    eta: "Upcoming",
  },
  {
    id: "receivables-followup",
    name: "Receivables Follow-up",
    category: "Receivables",
    status: "coming-soon",
    goal: "Finds overdue and unpaid customer invoices and prepares a follow-up list for you.",
    output: "Follow-up list",
    sources: [
      { label: "Sales invoices", from: "Tally" },
      { label: "Receipts", from: "Bank" },
    ],
    access: "Prepares, you approve",
    skills: 3,
    does: [
      "Lists overdue invoices by customer and age",
      "Drafts a reminder for each customer",
      "Shows what is already paid but not yet matched",
    ],
    never: [
      "Send a reminder without your click",
    ],
    eta: "Upcoming",
  },
  {
    id: "ledger-voucher-search",
    name: "Ledger and Voucher Search",
    category: "Bookkeeping",
    status: "coming-soon",
    goal: "Finds ledgers, groups, items and vouchers, and opens their details.",
    output: "Records",
    sources: [
      { label: "Masters", from: "Tally" },
      { label: "Vouchers", from: "Tally" },
    ],
    access: "Read-only",
    skills: 2,
    does: [
      "Searches by name, code, amount or date",
      "Opens the full detail of a ledger or voucher",
      "Keeps your last searches handy",
    ],
    never: [
      "Change a ledger or a voucher",
    ],
    eta: "Upcoming",
  },
  {
    id: "gst-review",
    name: "GST Review",
    category: "Compliance",
    status: "coming-soon",
    goal: "Checks tax treatment on invoices and flags missing or inconsistent GST details.",
    output: "GST exceptions",
    sources: [
      { label: "Sales invoices", from: "Tally" },
      { label: "Purchase bills", from: "Tally" },
    ],
    access: "Read-only",
    skills: 4,
    does: [
      "Checks GSTIN, place of supply and rate on each invoice",
      "Flags missing or inconsistent GST details",
      "Groups the issues by invoice for you to fix",
    ],
    never: [
      "File a return or change a tax entry",
    ],
    eta: "Upcoming",
  },
  {
    id: "month-end-close",
    name: "Month-End Close Assistant",
    category: "Bookkeeping",
    status: "coming-soon",
    goal: "Lists what is still open before the period can be closed and tracks it to completion.",
    output: "Close checklist",
    sources: [
      { label: "Books", from: "Tally" },
      { label: "Reconciliations", from: "Neo" },
    ],
    access: "Read-only",
    skills: 4,
    does: [
      "Lists open items: unreconciled, unposted, unreviewed",
      "Tracks each item to done",
      "Tells you when the period is ready to close",
    ],
    never: [
      "Lock or close a period",
    ],
    eta: "Upcoming",
  },
];

export const agentById = (id?: string) => MOCK_AGENTS.find((a) => a.id === id);
