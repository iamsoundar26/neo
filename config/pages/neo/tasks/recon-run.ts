import { companyOf, getState } from "@/components/inbox/v2/store";
import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import {
  RECON_PERIODS,
  RECON_SAMPLE,
} from "@/config/pages/neo/mock-recon-sources";
import {
  KINDS,
  KIND_LABEL,
  acknowledgePartial,
  answerQuestion,
  TEMPLATE,
  cancelRun,
  configOf,
  confirmConfig,
  currentVersion,
  executeRun,
  getRun,
  liveSources,
  inr,
  readiness,
  replaceSource,
  rowOf,
  sampleCorrection,
  startRun,
} from "@/hooks/pages/neo/use-recon";
import type {
  ReconPeriodId,
  ReconRun,
  RowRef,
  RunVersion,
} from "@/types/pages/neo/recon";
import { decide } from "./shared";
import { fileOf } from "@/utils/pages/neo/attachment-files";
import { rangeLabel } from "@/utils/pages/neo/detect-file";
import { reconOnboarding } from "@/hooks/pages/neo/use-recon-onboarding";
import { GUIDE_COPY } from "@/config/pages/neo/onboarding";
import type {
  NeoCard,
  NeoTask,
  NeoTaskApi,
  NeoUploadFile,
} from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * US-02 → US-05 · Reconcile a period (aligned to the AiA 2.0 PRD, 21 Oct
 * 2026): the files are identified and validated, rejected rows are named,
 * a partial run is acknowledged or a corrected source replaces the bad
 * one, the engine matches under R1–R8, and the questions attached to
 * exceptions are answered once. Read-only (A2): nothing is posted.
 *
 * DEV: POST /api/recon/runs streams these steps; the engine is
 * hooks/pages/neo/use-recon.ts.
 */

const MONTH =
  /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|nov(ember)?|dec(ember)?)\b/i;

/** The period a request names, or why it can't be used (FR-01 AC2). */
const periodIn = (
  prompt: string
): ReconPeriodId | { invalid: string } | undefined => {
  if (/\boct(ober)?\b/i.test(prompt)) return "oct";
  if (/\bsep(t|tember)?\b/i.test(prompt)) return "sep";
  const other = prompt.match(MONTH)?.[0];
  return other ? { invalid: other } : undefined;
};

/** An exception kind as part of a row's status: "3 not in books". */
const STATUS_WORDS: Record<string, [string, string]> = {
  "two-source": ["not in books", "not in books"],
  amount: ["amount differs", "amounts differ"],
  "no-reference": ["no reference", "no reference"],
  candidates: ["has several matches", "have several matches"],
  "cross-period": ["due later", "due later"],
};

const cell = (n?: number) => (n === undefined || n === 0 ? "—" : `₹${inr(n)}`);
const paise = (run: ReconRun, rows: RowRef[], kind: RowRef["kind"]) =>
  rows
    .filter((r) => r.kind === kind)
    .reduce((n, r) => n + Math.round((rowOf(run, r)?.amount || 0) * 100), 0);

/**
 * The reconciliation in one table (step 06): one row per channel with what
 * each source holds, how much matched, what is left and why, then the bank
 * lines no settlement explains, and the totals. The rows behind every
 * figure are in the result document.
 */
export const summaryTable = (run: ReconRun, v: RunVersion) => {
  const channel = (label: string) => label.split(" · ")[0];
  const names = [
    ...new Set([...v.groups, ...v.exceptions].map((x) => channel(x.label))),
  ];
  const all = { s: 0, b: 0, k: 0, g: 0, e: 0 };
  const lines = names.map((name) => {
    const gs = v.groups.filter((g) => channel(g.label) === name);
    const es = v.exceptions.filter((e) => channel(e.label) === name);
    const rows = [...gs.flatMap((g) => g.rows), ...es.flatMap((e) => e.rows)];
    const [s, b, k] = (["settlement", "bank", "books"] as const).map((kind) =>
      paise(run, rows, kind)
    );
    all.s += s;
    all.b += b;
    all.k += k;
    all.g += gs.length;
    all.e += es.length;
    const kinds = es.reduce<Record<string, number>>(
      (m, e) => ({ ...m, [e.kind]: (m[e.kind] || 0) + 1 }),
      {}
    );
    const status = es.length
      ? Object.entries(kinds)
          .map(
            ([kind, n]) =>
              `${n} ${STATUS_WORDS[kind]?.[n === 1 ? 0 : 1] || kind}`
          )
          .join(", ")
      : "Reconciled";
    // A mark in front of the words, so status never rests on colour alone.
    const mark = es.length ? "⚠" : "✓";
    return `| ${name} | ${cell(s / 100)} | ${cell(b / 100)} | ${cell(k / 100)} | ${gs.length} | ${mark} ${status} |`;
  });
  const other = v.unmatched.filter((u) => u.kind === "bank");
  const otherP = paise(run, other, "bank");
  return [
    "| Channel | Settlement | Bank | Books | Matched | Status |",
    "|---|---:|---:|---:|---:|---|",
    ...lines,
    `| Other bank lines | — | ${cell(otherP / 100)} | — | — | ${other.length ? "✕" : "✓"} ${other.length} lines, no settlement |`,
    `| **Total** | **${cell(all.s / 100)}** | **${cell((all.b + otherP) / 100)}** | **${cell(all.k / 100)}** | **${all.g}** | **${all.e ? "⚠" : "✓"} ${all.e} exceptions** |`,
  ].join("\n");
};

/** One row per source: the counts reconcile to accepted rows (US-04 AC3). */
export const countsTable = (run: ReconRun) => {
  const v = currentVersion(run)!;
  return [
    "| Source | Accepted | Matched | Exceptions | Unmatched | Rejected |",
    "|---|---:|---:|---:|---:|---:|",
    ...KINDS.map((k) => {
      const c = v.counts[k];
      return `| ${KIND_LABEL[k]} | ${c.accepted} | ${c.matched} | ${c.exceptions} | ${c.unmatched} | ${c.rejected} |`;
    }),
  ].join("\n");
};

/**
 * Your own files (24 Oct 2026): one card, opened straight away. Neo reads
 * each file and places it (bank, payout report or sales), so the person
 * doesn't sort them into slots. The books come from the Tally connector
 * unless a sales file replaces them. The prototype reads only its own
 * files, so each placed file stands in for the sample file of its kind
 * and channel.
 *
 * `held` are files already attached (the paperclip); they open on the
 * card, unread, and are read there.
 */
const askFiles = async (
  api: NeoTaskApi,
  period: ReconPeriodId,
  held: { name: string; size?: number }[] = []
) => {
  const p = RECON_PERIODS[period];
  const company = api.context.company || getState().company;
  const card: Extract<NeoCard, { kind: "sources-upload" }> = {
    kind: "sources-upload",
    slots: [
      {
        id: "bank",
        label: "Bank statement",
        hint: "From net banking, for the whole period",
      },
      {
        id: "gateway",
        label: "Payout reports",
        hint: "Card, UPI, Zomato and Swiggy settlement reports",
        multi: true,
      },
      {
        id: "sales",
        label: "Sales report",
        hint: "Your POS or Tally export",
        connected: "From Tally, synced 2 min ago",
      },
    ],
    context: {
      client: companyOf(company)?.name || "Nandhini Deluxe",
      period: p.label,
      from: p.from,
      to: p.to,
    },
    files: held.map(
      (h): NeoUploadFile => ({
        slot: "",
        name: h.name,
        size: h.size ?? fileOf(h.name)?.size ?? 0,
      })
    ),
  };
  const sampleSet = RECON_SAMPLE[period];
  const kb = (t: string) => Math.round((parseFloat(t) || 1) * 1024);
  // The sample also holds a duplicate and a PDF, to show how those are caught.
  const sampleFiles: NeoUploadFile[] = sampleSet
    .filter((f) => f.kind !== "unsupported" && !/\(\d+\)/.test(f.name))
    .map((f) => ({
    slot: f.kind === "bank" ? "bank" : f.kind === "books" ? "sales" : "gateway",
    name: f.name,
    size: kb(f.size),
    state: "ready",
    label: `${f.provider} · ${
      f.kind === "bank"
        ? "Bank statement"
        : f.kind === "books"
          ? "Sales report"
          : "Payout report"
    }`,
    channel: f.kind === "settlement" ? f.provider.replace(/^HDFC /, "") : undefined,
    range: `${rangeLabel(p.from, p.to)}`,
    rows: f.rows.length,
  }));
  card.sample = sampleFiles;
  await api.say(
    `Add the bank statement and payout reports for **${p.label}**. Drop them in any order and I'll read each one and tell you what I found. Your sales come from Tally. No files handy? Use the sample.`
  );
  const choice = await api.card(card, [
    { id: "go", label: "Reconcile", primary: true },
    { id: "sample", label: "Use the sample files" },
    { id: "cancel", label: "Cancel" },
  ]);
  if (choice === "cancel") return null;
  const sample = RECON_SAMPLE[period];
  if (choice === "sample" || !card.files.length) return sample.map((f) => f.name);
  const ok = card.files.filter((f) => f.state === "ready" && f.slot);
  const providerOf = (channel?: string) =>
    channel && sample.find((f) => f.kind === "settlement" && f.provider.includes(channel));
  const taken = new Set<string>();
  const out: string[] = [];
  const bank = sample.find((f) => f.kind === "bank");
  if (bank && ok.some((f) => f.slot === "bank")) out.push(bank.name);
  for (const f of ok.filter((x) => x.slot === "gateway")) {
    const hit =
      providerOf(f.channel) ||
      sample.find((x) => x.kind === "settlement" && !taken.has(x.name));
    if (hit && !taken.has(hit.name)) {
      taken.add(hit.name);
      out.push(hit.name);
    }
  }
  const books = sample.find((f) => f.kind === "books");
  if (books) out.push(books.name);
  return out;
};

const reconRun: NeoTask = {
  id: "recon-run",
  title: "Reconcile bank, settlements and books",
  match: (p, _ctx, attachments = []) =>
    has(p, /\b(set ?up|configure|review|export|save)\b/i)
      ? 0
      : has(p, /\b(recon|reconcil\w*|3-way|three-way)\b/i) ||
          // Any upload starts a reconciliation (21 Oct 2026).
          attachments.length > 0
        ? 30
        : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    if (company !== NANDHINI_ID) {
      await api.say(
        `${companyOf(company)?.name} has no settlement data in this prototype. Three-way reconciliation runs for **Nandhini Deluxe**; switch to it in the top bar.`
      );
      return "No settlement data for this client";
    }

    // The guided first run follows the same steps as any other (24 Oct
    // 2026): month, then files. Asking for the sample by name skips the
    // files step.
    const guided = reconOnboarding().guided;
    const NOTE = GUIDE_COPY.notes;
    const picked: string[] | undefined = undefined;

    // 01 · Choose a template.
    api.stage(1);
    let cfg = configOf(company);
    await api.think(
      cfg
        ? `Using configuration v${cfg.version} of ${TEMPLATE.name}, confirmed by ${cfg.confirmedBy}.`
        : `${TEMPLATE.name} is the only template in this release: a bank statement, settlement reports and the books, matched three ways.`
    );

    // 02 · Select company and period (FR-01): one sheet, period first.
    api.stage(2);
    const named = periodIn(api.prompt);
    const asked = typeof named === "string" ? named : "sep";
    let periodId: ReconPeriodId = asked;
    {
      await api.checkpoint();
      const sheet = await decide(
        api,
        "Company and period",
        [
          {
            id: "period",
            header: "Period",
            question: "Which period should this run reconcile?",
            why:
              named && typeof named === "object"
                ? `“${named.invalid}” has no sources here. Nandhini Deluxe has September 2026 and 1–15 October 2026.`
                : "The run fixes its period; rows outside it are not counted (R1).",
            recommended: asked,
            options: (["sep", "oct"] as const).map((id) => ({
              id,
              label: RECON_PERIODS[id].label,
              hint: `${RECON_PERIODS[id].from} to ${RECON_PERIODS[id].to}`,
            })),
          },
          {
            id: "company",
            header: "Company",
            question: "Which company's books?",
            recommended: company,
            options: [
              { id: company, label: companyOf(company)?.name || company },
            ],
            settled: "The company in the top bar",
          },
          {
            id: "tz",
            header: "Timezone",
            question: "Which timezone sets the period's boundaries?",
            recommended: cfg?.timezone || "Asia/Kolkata",
            options: [
              {
                id: cfg?.timezone || "Asia/Kolkata",
                label: "India (IST, UTC+5:30)",
              },
            ],
            settled: "The company's timezone in AiA 1.0",
          },
          {
            id: "cur",
            header: "Currency",
            question: "Which currency does the run reconcile in?",
            recommended: cfg?.currency || "INR",
            options: [
              { id: cfg?.currency || "INR", label: "Indian rupee (INR)" },
            ],
            settled: "One currency per run; every source here is INR",
          },
        ],
        [
          {
            id: "go",
            label: cfg ? "Confirm and continue" : "Confirm configuration v1",
            primary: true,
            risk: cfg ? undefined : "draft",
          },
          { id: "cancel", label: "Cancel" },
        ]
      );
      if (sheet.choice !== "go") return "Not started";
      if (!cfg)
        cfg = confirmConfig(company, {
          timezone: sheet.picks.tz,
          currency: sheet.picks.cur,
        });
      periodId = sheet.picks.period as ReconPeriodId;
    }
    const p = RECON_PERIODS[periodId];

    // 03 · Provide three sources: what is needed, and what is here.
    api.stage(3);
    let attached: string[] = [];
    if (picked) attached = picked;
    else if (api.attachments.length) {
      // Files from the paperclip open on the card, to be read and checked.
      const own = await askFiles(api, periodId, api.attachments);
      if (!own) return "Not started";
      attached = own;
    } else if (/\bsample\b/i.test(api.prompt))
      attached = RECON_SAMPLE[periodId].map((f) => f.name);
    else {
      await api.think(
        `${p.label} needs three sources: ${TEMPLATE.sources.map((src) => src.label.toLowerCase()).join(", ")}. The books come from the Tally connector; the bank statement and payout reports aren't here yet.`
      );
      await api.checkpoint();
      const own = await askFiles(api, periodId);
      if (!own) return "Not started";
      attached = own;
    }
    api.sources(attached);
    const reading = await api.step(
      `Reading ${attached.length} files`,
      undefined,
      { skills: ["S1"], tools: ["doc.read", "doc.fingerprint"] }
    );
    await api.wait(700);
    let run = startRun(company, periodId, attached);
    const turnedAway = run.files.length;
    reading(
      `${liveSources(run).length} sources taken in${turnedAway ? ` · ${turnedAway} file${turnedAway === 1 ? "" : "s"} turned away` : ""}`
    );

    // 04 · Validate inputs (FR-03).
    api.stage(4);
    const checking = await api.step("Validating rows", undefined, {
      skills: ["S2"],
      tools: ["schema.validate"],
    });
    await api.wait(600);
    let ready = readiness(run);
    const accepted = liveSources(run).reduce(
      (n, s) => n + s.accepted.length,
      0
    );
    checking(`${accepted} rows accepted · ${ready.rejected} rejected`);
    api.show({ kind: "recon", company, runId: run.id, view: "sources" });
    api.status(`Reconciling ${p.short}`, { done: 4, total: 8 });

    // FR-02 AC3: a missing source names itself and the next action.
    if (ready.missing.length || ready.blockers.length) {
      await api.say(
        [
          ready.missing.length
            ? `Not ready: no **${ready.missing.map((k) => KIND_LABEL[k].toLowerCase()).join(" or ")}** source. Attach it as CSV and ask again.`
            : "",
          ...ready.blockers.map((b) => b.text),
        ]
          .filter(Boolean)
          .join(" ")
      );
      return "Waiting for inputs";
    }
    if (!ready.rejected)
      await api.think(
        "Every row passed: no missing fields, duplicates, unclear dates or other currencies."
      );
    else
      await api.think(
        `${ready.rejected} row${ready.rejected === 1 ? "" : "s"} can't be read. They stay out unless you replace the file or accept a partial run.`
      );

    // US-03 AC2: rejected rows are excluded only on purpose.
    if (ready.rejected) {
      const bad = liveSources(run).filter((s) => s.rejected.length);
      await api.checkpoint();
      const { choice, picks } = await decide(
        api,
        "Rejected rows",
        [
          {
            id: "rejected",
            header: "Rejected rows",
            question: `${ready.rejected} row${ready.rejected === 1 ? "" : "s"} in ${bad.map((s) => s.file).join(", ")} can't be read. What should this run do?`,
            why: bad
              .flatMap((s) =>
                s.rejected.map((r) => `Line ${r.line}: ${r.reason}.`)
              )
              .join(" "),
            recommended: "replace",
            options: [
              {
                id: "replace",
                label: "Replace with the corrected export",
                hint: `${sampleCorrection()}, a new version of the books source`,
              },
              {
                id: "partial",
                label: `Run without the ${ready.rejected} rows`,
                hint: "The result and every export say Partial",
              },
            ],
          },
        ],
        [
          { id: "go", label: "Continue", primary: true },
          { id: "cancel", label: "Cancel the run" },
        ]
      );
      if (choice !== "go") {
        cancelRun(run.id);
        await api.say(
          "Cancelled. Nothing was run, so there's no result to review."
        );
        return "Cancelled";
      }
      if (picks.rejected === "replace") {
        const fix = await api.step(`Reading ${sampleCorrection()}`, undefined, {
          skills: ["S1", "S2"],
          tools: ["schema.validate"],
        });
        await api.wait(500);
        run = replaceSource(run.id, bad[0].file, sampleCorrection());
        ready = readiness(run);
        fix(`Books v2 · ${ready.rejected} rows rejected`);
      } else run = acknowledgePartial(run.id);
    }

    // 05 · Run reconciliation (R1–R8).
    api.stage(5);
    await api.checkpoint();
    const matching = await api.step(
      "Matching across all three sources",
      undefined,
      { skills: ["S3"], tools: ["recon.match"] }
    );
    await api.wait(800);
    run = executeRun(run.id);
    let v = currentVersion(run)!;
    matching(
      `${v.groups.length} match groups · ${v.exceptions.length} exceptions`
    );
    api.status(`Reconciling ${p.short}`, { done: 5, total: 8 });

    // 06 · Inspect matches and exceptions, before anything is asked.
    api.stage(6);
    const c = v.counts;
    await api.think(
      `Checking why each of the ${v.exceptions.length} exceptions didn't match, and which questions would settle them.`
    );
    await api.say(
      [
        `**${p.label}: ${v.groups.length} match groups, ${v.exceptions.length} exceptions.** The report at the end of this run has every row behind these figures.`,
        "",
        summaryTable(run, v),
        "",
        `${c.bank.accepted} bank, ${c.settlement.accepted} settlement and ${c.books.accepted} books rows accepted${c.books.rejected ? `; ${c.books.rejected} rejected` : ""}.`,
      ].join("\n")
    );

    // 07 · Resolve and review: questions first, then links and deferrals.
    api.stage(7);
    const open = run.questions.filter((q) => !q.answer);
    if (open.length) {
      await api.checkpoint();
      const { choice, picks } = await decide(
        api,
        `Resolve ${p.short}`,
        open.map((q) => ({
          id: q.id,
          header: q.id.split(":")[1] || "Question",
          question: q.text,
          why: `${q.detail} Affects ${q.exceptionIds.length} exception${q.exceptionIds.length === 1 ? "" : "s"}.`,
          recommended: q.options[0].id,
          options: q.options,
        })),
        [
          { id: "go", label: "Submit and finish the run", primary: true },
          { id: "cancel", label: "Cancel the run" },
        ]
      );
      if (choice !== "go") {
        cancelRun(run.id);
        await api.say(
          "Cancelled. The run stays incomplete and won't show as reconciled."
        );
        return "Cancelled";
      }
      for (const q of open) run = answerQuestion(run.id, q.id, picks[q.id]);
    }

    run = getRun(run.id)!;
    v = currentVersion(run)!;
    // The report is the file (21 Oct 2026): no result panel beside the chat.
    // The guided sample run opens the report, where its hints point.
    api.show(
      { kind: "recon-report", company, runId: run.id, version: v.n },
      { open: reconOnboarding().guided || undefined }
    );
    const byYou = v.groups.filter((g) => g.origin === "human").length;
    await api.say(
      [
        `**${p.label}, version ${v.n}: ${v.groups.length} match groups${byYou ? `, ${byYou} linked by your answer` : ""}; ${v.exceptions.length} exceptions left.** ${v.completeness === "partial" ? "Partial: rejected rows were excluded. " : ""}Nothing was posted or changed in your books.`,
        "",
        v.exceptions.length
          ? `To resolve the ${v.exceptions.length} exceptions, open the report and pick an Action and a Reason in the yellow cells on its Exceptions sheet, here in Neo or in the downloaded file. Or tell me, for example “defer E1, payout file due 3 Oct”. Either way the reconciliation runs again as a new version.`
          : "Submit the run for review.",
      ].join("\n")
    );
    api.suggest([
      ...(v.exceptions.length ? ["Try an edited report"] : []),
      `Submit ${p.short} for review`,
      ...(run.questions.some((q) => q.answer === "link")
        ? ["Save the answer to the configuration"]
        : []),
    ]);
    return `${v.groups.length} groups · ${v.exceptions.length} exceptions`;
  },
};

export default reconRun;
