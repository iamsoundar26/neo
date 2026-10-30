import React, { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { MessageSquare, Search, SquarePen, X } from "@/components/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";
import type { NeoChat } from "@/types/pages/neo";

/**
 * Today, Yesterday, Previous 7 days, Older: how the chat apps file a
 * history, counted from the prototype's one clock (DEMO_TODAY).
 */
export const groupOf = (iso: string, now = DEMO_TODAY) => {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((start.getTime() - d.getTime()) / 86400000) + 1;
  if (d >= start) return "Today";
  if (days <= 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  return "Older";
};
const GROUPS = ["Starred", "Today", "Yesterday", "Previous 7 days", "Older"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chats: NeoChat[];
  onOpenChat: (id: string) => void;
  onNewChat: () => void;
};

/** A line of the chat around the words that matched, when it wasn't the title. */
const snippet = (c: NeoChat, q: string) => {
  const hit = c.messages.find((m) => m.text?.toLowerCase().includes(q));
  if (!hit?.text) return "";
  const i = hit.text.toLowerCase().indexOf(q);
  const from = Math.max(0, i - 24);
  return `${from ? "…" : ""}${hit.text.slice(from, i + q.length + 48).replace(/[*_#`>\n]+/g, " ")}…`;
};

/**
 * Search chats (24 Oct 2026), the way ChatGPT does it: a centred panel over
 * a dimmed page, one field, then New chat and your chats by day, with the
 * line that matched under a title. Arrows move, Enter opens, Esc closes.
 */
const NeoSearch = ({ open, onOpenChange, chats, onOpenChat, onNewChat }: Props) => {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const hits = chats.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text?.toLowerCase().includes(q))
    );
    const by = new Map<string, NeoChat[]>();
    hits
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .forEach((c) => {
        const g = c.starred ? "Starred" : groupOf(c.updatedAt);
        by.set(g, [...(by.get(g) || []), c]);
      });
    return GROUPS.filter((g) => by.has(g)).map((g) => [g, by.get(g)!] as const);
  }, [chats, q]);

  const item =
    "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-body-3 text-pi-ink-2 outline-none data-[selected=true]:bg-pi-fill data-[selected=true]:text-pi-ink";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="neo-search"
        onOpenAutoFocus={(e) => e.stopPropagation()}
        className="top-[42%] max-w-[640px] gap-0 overflow-hidden rounded-2xl border border-pi-line-2 bg-background p-0 shadow-popover-shadow [&>button]:hidden"
      >
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <Command shouldFilter={false} loop className="flex flex-col">
          <div className="flex h-14 items-center gap-3 border-b border-pi-line px-4">
            <Search className="h-4 w-4 flex-none text-pi-faint" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search chats…"
              data-testid="neo-search-input"
              className="h-full min-w-0 flex-1 bg-transparent text-body-3 text-pi-ink outline-none placeholder:text-pi-faint"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => onOpenChange(false)}
              className="grid h-7 w-7 flex-none place-items-center rounded-md text-pi-faint transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-[min(380px,50vh)] overflow-y-auto p-2">
            {!q && (
            <Command.Item
              value="new-chat"
              onSelect={() => {
                onOpenChange(false);
                onNewChat();
              }}
              className={item}
            >
              <SquarePen className="h-4 w-4 flex-none text-pi-body" />
              New chat
            </Command.Item>
            )}
            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-body-3 text-pi-faint">
                {q ? `No chats match “${query.trim()}”` : "No chats yet"}
              </p>
            )}
            {groups.map(([g, list]) => (
              <Command.Group
                key={g}
                heading={g}
                className="mt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-label-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-pi-faint"
              >
                {list.map((c) => {
                  const line =
                    q && !c.title.toLowerCase().includes(q) ? snippet(c, q) : "";
                  return (
                    <Command.Item
                      key={c.id}
                      value={c.id}
                      onSelect={() => {
                        onOpenChange(false);
                        onOpenChat(c.id);
                      }}
                      className={cn(item, line && "h-auto min-h-10 py-1.5")}
                    >
                      <MessageSquare className="h-4 w-4 flex-none text-pi-body" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{c.title}</span>
                        {line && (
                          <span className="block truncate text-label-3 text-pi-faint">
                            {line}
                          </span>
                        )}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center gap-4 border-t border-pi-line px-4 py-2 text-label-3 text-pi-faint">
            <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> move</span>
            <span><Kbd>↵</Kbd> open</span>
            <span><Kbd>Esc</Kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default NeoSearch;
