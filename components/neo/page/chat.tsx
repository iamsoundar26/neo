import { NEO_USER } from "@/config/pages/neo/user";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  FileSpreadsheet,
  Hourglass,
  Lock,
  Receipt,
  Search,
  Settings2,
  Sparkles,
  Upload,
} from "lucide-react";
import { ArrowRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { actor, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useComposer } from "@/hooks/pages/neo/use-composer";
import {
  todayFor,
  unavailableFor,
  type TodayItem,
} from "@/config/pages/neo/suggestions";
import Shortcuts from "@/components/neo/common/shortcuts";
import Canvas from "@/components/neo/common/canvas";
import Composer from "@/components/neo/common/composer";
import ContextChip from "@/components/neo/common/context-chip";
import DropZone from "@/components/neo/common/drop-zone";
import Thread, { useLiveMessage } from "@/components/neo/common/thread";
import { NeoMenuButton, useNeoColumnHidden } from "./index";
import ChatTitle from "./chat-title";
import { agentById } from "@/config/pages/neo/mock-agents";
import { useMyAgents } from "@/hooks/pages/neo/use-my-agents";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const NOTE =
  "Neo prepares; you approve. Nothing reaches your books without your click.";

/** The home's starter prompts. */
const PROMPTS = [
  { text: "Find unpaid invoices", Glyph: Search },
  { text: "Upload purchase bills", Glyph: Upload },
  { text: "Create an invoice", Glyph: Receipt },
  { text: "Create an agent", Glyph: Sparkles },
];

/** The row's tile: its tone, and a glyph for where the work stands. */
const GLYPH: Record<TodayItem["kind"], typeof Lock> = {
  setup: Settings2,
  "not-run": CalendarClock,
  waiting: Hourglass,
  review: FileSearch,
  pending: ClipboardCheck,
  done: FileSpreadsheet,
  save: BookmarkPlus,
};

/** The chip's glyph colour: notice is the next thing the books need. */
const TONE: Record<TodayItem["tone"], string> = {
  negative: "text-pi-danger-dot",
  notice: "text-pi-warning-dot",
  neutral: "text-pi-faint",
};

/**
 * Neo › Chat. Empty, it is a home that leads with where three-way
 * reconciliation stands at this client — "September reconciled, not
 * closed" — each one a job Neo runs. A client without POS sales is told
 * why there's nothing here.
 * Once something is asked, the conversation runs down the middle with the
 * box pinned beneath; a document Neo makes opens beside it.
 */
const NeoChat = () => {
  const neo = useNeo();
  const mineAgents = useMyAgents();
  // The agent this chat is with: a suggested one, or one of your own.
  const agentInfo = useMemo(() => {
    const id = neo.agentId;
    if (!id) return null;
    const profile = agentById(id);
    if (profile) return { profile, mine: undefined };
    const mine = mineAgents.find((a) => a.id === id);
    return mine ? { mine, profile: undefined } : null;
  }, [neo.agentId, mineAgents]);
  const state = useStore();
  const box = useComposer(neo);
  const live = useLiveMessage(neo);
  const input = useRef<HTMLTextAreaElement>(null);
  const empty = !neo.messages.length;
  const columnHidden = useNeoColumnHidden();
  const company = state.companies.find((c) => c.id === state.company);

  useEffect(() => {
    input.current?.focus();
  }, [neo.chatId]);

  // What the books say needs doing here, as requests Neo answers.
  const unavailable = unavailableFor(state.company);
  const today = useMemo(
    () => todayFor(state.company),
    // The store is a dependency: today's work follows the books.
    [state]
  );

  // Digits answer the open question, Esc stops a run — as in the panel.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.defaultPrevented) return;
    const typing = (e.target as HTMLElement).closest(
      "input, textarea, select, [contenteditable=true]"
    );
    if (e.key === "Escape" && neo.busy) {
      e.preventDefault();
      neo.stop();
      return;
    }
    if (
      live?.ask &&
      !live.ask.input &&
      !typing &&
      !box.draft &&
      /^[1-9]$/.test(e.key)
    ) {
      const option = live.ask.options[Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        neo.answer(live.id, option.id);
      }
    }
  };

  // Expanded from the panel: what the panel was looking at comes along.
  const ctx = neo.runContext || neo.context;
  const carried = !!(ctx.itemId || ctx.selectedIds.length);

  const composer = (
    <Composer
      ref={input}
      variant="page"
      menuBelow={empty}
      placeholder={empty ? "Ask a question or give a command" : undefined}
      value={box.draft}
      busy={!!neo.busy}
      attachments={box.attachments}
      onChange={box.setDraft}
      onSend={() => box.send()}
      onStop={neo.stop}
      onAttachFiles={box.attachFiles}
      onRemoveAttachment={box.removeAttachment}
      context={
        carried ? (
          <ContextChip
            variant="pill"
            context={ctx}
            onClear={neo.detach}
            locked={!!neo.runContext}
          />
        ) : undefined
      }
    />
  );

  return (
    <section
      aria-label="Neo chat"
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1"
    >
      <DropZone
        onFiles={box.attachFiles}
        disabled={!!neo.busy}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {/* The chat's own bar: its title menu once there's a conversation.
            On the empty home only the column button shows, below 1024px. */}
        <header
          className={cn(
            "relative flex h-12 flex-none items-center gap-1 px-2 lg:px-4",
            !empty && "border-b border-pi-line",
            // The home has no bar on a wide screen: it only brings the menu
            // back when the menu is hidden, or on a small screen.
            empty && !columnHidden && "lg:hidden"
          )}
        >
          <div>
            <NeoMenuButton />
          </div>
          {!empty && <ChatTitle compact />}
          {/* Only a chat with an agent offers that agent's details. */}
          {agentInfo && (
            <Button
              variant="outline"
              data-testid="view-details"
              aria-pressed={neo.agentDetails}
              onClick={() => neo.setAgentDetails(!neo.agentDetails)}
              className="ml-auto h-8 rounded-lg px-3 text-[14px] font-medium"
            >
              <Info className="h-4 w-4" />
              View details
            </Button>
          )}
        </header>

        {empty ? (
          // my-auto centres the home in the page and still lets it scroll
          // from the top when the window is shorter than it.
          <div className="neo-home relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-10 sm:px-6 [@media(max-height:700px)]:py-5">
            <div className="neo-home-backdrop" aria-hidden="true" />
            <div className="relative my-auto flex w-full flex-col items-center">
              <svg
                role="img"
                aria-label="Neo"
                viewBox="0 0 40 40"
                className="neo-home-rise relative h-8 w-8 text-pi-brand [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6"
              >
                <path
                  fill="currentColor"
                  d="M20 1c1.6 10.6 8.4 17.4 19 19-10.6 1.6-17.4 8.4-19 19-1.6-10.6-8.4-17.4-19-19 10.6-1.6 17.4-8.4 19-19z"
                />
              </svg>
              <h2 className="neo-home-rise relative mt-[26px] text-center text-[20px] [@media(max-height:700px)]:mt-4 font-semibold leading-[1.2] tracking-[-0.01em] text-pi-ink [animation-delay:60ms] [text-wrap:balance] sm:text-[24px]">
                <span className="text-pi-brand">Hi {NEO_USER.firstName},</span>{" "}
                what can I help you with?
              </h2>
              <p className="neo-home-rise relative mt-3 text-center text-body-2 leading-[22px] text-pi-body [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:text-[14px] [animation-delay:90ms]">
                Ask questions, find records, and get your accounting work done,
                all in one place.
              </p>
              <div className="neo-home-prompt neo-home-rise relative mt-10 w-full max-w-[672px] [animation-delay:120ms] [@media(max-height:700px)]:mt-6">
                {composer}
              </div>

              {unavailable && (
                <p className="relative mt-6 w-full max-w-[640px] text-center text-body-3 leading-5 text-pi-body">
                  Neo reconciles POS sales, settlements and the bank in this
                  phase, and {company?.name} doesn&apos;t sell through POS or
                  platforms. To try it, switch to Nandhini Deluxe in the top
                  bar.
                </p>
              )}

              <section
                aria-labelledby="neo-prompts"
                className="neo-home-rise relative mt-7 flex w-full max-w-[672px] flex-col items-center [animation-delay:180ms] [@media(max-height:700px)]:mt-5"
              >
                <h3
                  id="neo-prompts"
                  className="text-[14px] font-normal leading-5 text-pi-faint"
                >
                  Try one of these prompts:
                </h3>
                <ul className="mt-3 flex flex-wrap justify-center gap-2.5">
                  {PROMPTS.map(({ text, Glyph }) => (
                    <li key={text}>
                      <button
                        type="button"
                        onClick={() => box.send(text)}
                        className="neo-home-chip group flex h-9 items-center gap-3 whitespace-nowrap rounded-full border border-pi-line-2 bg-background pl-4 pr-[15px] text-[14px] font-medium text-pi-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                      >
                        <Glyph
                          aria-hidden
                          className="h-4 w-4 flex-none text-pi-body"
                        />
                        {text}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-center text-body-4 leading-4 text-pi-faint [@media(max-height:700px)]:mt-3">
                  Neo asks for your confirmation before creating any accounting
                  record.
                </p>
              </section>
            </div>
          </div>
        ) : (
          <>
            <Thread
              variant="page"
              onPrompt={(t) => box.send(t)}
              onOpenScope={(id) =>
                neo.goTo({ label: "", itemId: id, target: "open" })
              }
            />
            {/* The same column as the thread (720px less its 24px sides), so
                what you type and what Neo asks line up with what is said. */}
            <div className="flex-none bg-background px-4 pb-3 pt-2 sm:px-6 sm:pb-4">
              <div className="mx-auto max-w-[672px]">
                {composer}
                {!neo.signedOff && (
                  <p className="mt-2 text-center text-body-4 text-pi-faint max-sm:hidden">
                    {NOTE}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DropZone>
      <Canvas variant="page" />
    </section>
  );
};

export default NeoChat;
