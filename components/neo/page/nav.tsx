import React, { useMemo, useState } from "react";
import {
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Ellipsis,
  NeoAgents,
  NeoChat as NeoChatIcon,
  NeoStar,
  Pencil,
  Plus,
  Search,
  SquarePen,
  Star,
  Trash2,
  X,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader } from "lucide-react";
import type { NeoChat } from "@/types/pages/neo";
import { exportChat } from "./chat-title";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { cn } from "@/lib/utils";
import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";
import type { NeoPageId } from "./index";

type Props = {
  page: NeoPageId;
  onPage: (page: NeoPageId) => void;
  /** Folded to a strip of icons, for small screens. */
  folded?: boolean;
  /** Fold or unfold; absent in the phone sheet, which closes instead. */
  onToggle?: () => void;
  /** Puts the column away on a wide screen; absent in the phone sheet. */
  onHide?: () => void;
};

const ICON_BTN =
  "relative grid h-9 w-9 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";

const ITEMS: { id: NeoPageId; label: string; icon: typeof NeoStar }[] = [
  { id: "chat", label: "Chat", icon: NeoChatIcon },
  { id: "agents", label: "Agents", icon: NeoAgents },
];

const ROW =
  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-3 transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border";
/**
 * Colour in the column, balanced (23 Oct 2026): brand blue marks only the
 * place you're on; New chat is a neutral tertiary button, and everything
 * else is ink on white, with a neutral fill for hover and the open chat.
 */
const ON = "bg-pi-brand-tint font-semibold text-pi-brand";
const OFF = "font-medium text-pi-ink-2 hover:bg-pi-fill hover:text-pi-ink";

/**
 * Today, Yesterday, Previous 7 days, Older — as the chat apps file them,
 * counted from the prototype's one clock (DEMO_TODAY), the same day the
 * brief and the overdue days are counted from. A chat started now is later
 * than that, so it files under Today.
 */
const groupOf = (iso: string, now = DEMO_TODAY) => {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((start.getTime() - d.getTime()) / 86400000) + 1;
  if (d >= start) return "Today";
  if (days <= 1) return "Yesterday";
  if (days <= 7) return "Previous 7 days";
  return "Older";
};
const GROUPS = ["Starred", "Today", "Yesterday", "Previous 7 days", "Older"];

/**
 * Neo's own column, beside the app's icon rail: a new chat, Neo's two
 * places, and the conversations so far — starred first, then by day, with a
 * search over titles and messages. Each chat has a ⋯ menu on hover: Star,
 * Rename, Export, Delete. Opening one carries it on.
 */
const NeoNav = ({ page, onPage, folded, onToggle, onHide }: Props) => {
  const neo = useNeo();
  const busy = !!neo.busy;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = neo.chats.filter(
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
  }, [neo.chats, query]);

  // Folded (small screens, 20 Oct 2026): a 52px strip with the same
  // places as icons, recent chats behind one button, and unfold at the foot.
  if (folded)
    return (
      <nav
        aria-label="Neo"
        className="flex w-[52px] flex-none flex-col items-center gap-1 border-r border-pi-line bg-background py-2"
      >
        <button
          type="button"
          disabled={busy}
          title="New chat"
          aria-label="New chat"
          onClick={() => {
            neo.reset();
            onPage("chat");
          }}
          className={cn(
            ICON_BTN,
            "border border-pi-line-2 text-pi-ink shadow-pi-1 hover:bg-pi-fill"
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="my-1 h-px w-6 bg-pi-line" />
        {ITEMS.map((it) => {
          const active = page === it.id;
          return (
            <button
              key={it.id}
              type="button"
              title={it.label}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              onClick={() => onPage(it.id)}
              className={cn(
                ICON_BTN,
                active
                  ? "bg-pi-brand-tint text-pi-brand"
                  : "text-pi-body hover:bg-pi-fill hover:text-pi-ink"
              )}
            >
              <it.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Recent chats"
              aria-label="Recent chats"
              className={cn(
                ICON_BTN,
                "text-pi-body hover:bg-pi-fill hover:text-pi-ink"
              )}
            >
              <History className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64">
            {neo.chats.length === 0 && (
              <p className="px-2 py-1.5 text-body-3 text-pi-faint">
                No chats yet
              </p>
            )}
            {neo.chats.slice(0, 12).map((c) => (
              <DropdownMenuItem
                key={c.id}
                disabled={busy && c.id !== neo.chatId}
                onSelect={() => {
                  neo.openChat(c.id);
                  onPage("chat");
                }}
                className={cn(
                  "text-body-3",
                  c.id === neo.chatId && "font-medium"
                )}
              >
                <span className="truncate">{c.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {onToggle && (
          <button
            type="button"
            title="Show chats"
            aria-label="Show chats"
            onClick={onToggle}
            className={cn(
              ICON_BTN,
              "mt-auto text-pi-body hover:bg-pi-fill hover:text-pi-ink"
            )}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </nav>
    );

  // The column as the app's own sidebar draws it: a title, three places
  // (New Chat, Search, Agents), then Recents as one flat list.
  const flat = grouped.flatMap(([, list]) => list);
  const ITEM =
    "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-body-3 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";
  const idle = "text-pi-body hover:bg-pi-fill hover:text-pi-ink";
  return (
    <nav
      aria-label="Neo"
      className="flex w-[260px] flex-none flex-col border-r border-pi-line bg-background"
    >
      <div className="flex h-14 flex-none items-center justify-between border-b border-pi-line pl-4 pr-2">
        <h1 className="text-[20px] font-medium leading-7 text-pi-ink">Neo</h1>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide Neo menu"
            title="Hide menu"
            className={cn(
              ICON_BTN,
              "flex-none text-pi-body hover:bg-pi-fill hover:text-pi-ink"
            )}
          >
            <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <ul className="flex flex-none flex-col gap-0.5 px-2 pb-2 pt-3">
        <li>
          <button
            type="button"
            data-testid="nav-new-chat"
            disabled={busy}
            title={busy ? "Neo is working on the current chat" : undefined}
            onClick={() => {
              neo.reset();
              onPage("chat");
            }}
            className={cn(ITEM, idle)}
          >
            <SquarePen className="h-5 w-5 flex-none" strokeWidth={1.5} />
            New Chat
          </button>
        </li>
        <li>
          {searching ? (
            <label className="flex h-10 items-center gap-3 rounded-lg bg-pi-fill px-3 text-pi-body ring-1 ring-inset ring-pi-brand-border">
              <Search className="h-5 w-5 flex-none" strokeWidth={1.5} />
              <span className="sr-only">Search chats</span>
              <input
                autoFocus
                data-testid="nav-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearching(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    setSearching(false);
                  }
                }}
                placeholder="Search chats"
                className="min-w-0 flex-1 border-0 !bg-transparent p-0 text-body-3 text-pi-ink shadow-none placeholder:text-pi-faint focus:ring-0 focus-visible:outline-none"
              />
              <button
                type="button"
                aria-label="Close search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setSearching(false);
                }}
                className="grid h-5 w-5 place-items-center rounded-sm text-pi-faint hover:text-pi-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </label>
          ) : (
            <button
              type="button"
              data-testid="nav-search"
              onClick={() => setSearching(true)}
              className={cn(ITEM, idle)}
            >
              <Search className="h-5 w-5 flex-none" strokeWidth={1.5} />
              Search
            </button>
          )}
        </li>
        <li>
          <button
            type="button"
            data-testid="nav-agents"
            aria-current={page === "agents" ? "page" : undefined}
            onClick={() => onPage("agents")}
            className={cn(
              ITEM,
              page === "agents"
                ? "bg-pi-brand-tint font-semibold text-pi-brand"
                : idle
            )}
          >
            <NeoAgents className="h-5 w-5 flex-none" strokeWidth={1.5} />
            Agents
          </button>
        </li>
      </ul>

      <div className="mx-4 border-t border-pi-line" />
      <h2 className="px-5 pb-1.5 pt-4 text-body-3 font-medium text-pi-faint">
        Recents
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {flat.length === 0 && (
          <p className="flex items-center gap-2 truncate px-3 py-2 text-body-3 text-pi-faint">
            {query ? "No chats match" : "No chats yet"}
          </p>
        )}
        <ul>
          {flat.map((c) => (
            <ChatRow
              key={c.id}
              chat={c}
              current={page === "chat" && c.id === neo.chatId}
              disabled={busy && c.id !== neo.chatId}
              renaming={renaming === c.id}
              onRenaming={(on) => setRenaming(on ? c.id : null)}
              onOpen={() => {
                neo.openChat(c.id);
                onPage("chat");
              }}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default NeoNav;

type RowProps = {
  chat: NeoChat;
  current: boolean;
  disabled: boolean;
  renaming: boolean;
  onRenaming: (on: boolean) => void;
  onOpen: () => void;
};

/** One chat in the list, with its ⋯ menu and in-place rename. */
const ChatRow = ({
  chat: c,
  current,
  disabled,
  renaming,
  onRenaming,
  onOpen,
}: RowProps) => {
  const neo = useNeo();
  const [draft, setDraft] = useState(c.title);
  if (renaming)
    return (
      <li>
        <input
          autoFocus
          aria-label="Chat name"
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            neo.renameChat(c.id, draft);
            onRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(c.title);
              onRenaming(false);
            }
          }}
          className="h-9 w-full rounded-md border border-primary bg-background px-2.5 text-[14px] text-pi-ink focus-visible:outline-none"
        />
      </li>
    );
  return (
    <li className="group/chat relative">
      {/* Neo is working in this chat: a quiet pulse where the ⋯ will be. */}
      {current && neo.busy && (
        <Loader
          aria-label="Neo is working"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-pi-brand transition-opacity group-hover/chat:opacity-0"
          strokeWidth={1.75}
        />
      )}
      <button
        type="button"
        disabled={disabled}
        title={c.title}
        aria-current={current ? "true" : undefined}
        onClick={onOpen}
        className={cn(
          ROW,
          "h-10 gap-3 px-3 pr-9 text-body-3 disabled:opacity-50",
          current
            ? "bg-pi-brand-tint font-medium text-pi-ink"
            : "text-pi-ink-2 hover:bg-pi-fill hover:text-pi-ink"
        )}
      >
        <span
          key={c.title}
          className="truncate duration-500 animate-in fade-in-0"
        >
          {c.title}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Options for ${c.title}`}
            className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-pi-body opacity-0 transition-opacity hover:bg-pi-fill hover:text-pi-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border group-hover/chat:opacity-100 data-[state=open]:opacity-100"
          >
            <Ellipsis className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onSelect={() => neo.toggleStar(c.id)}>
            <Star className={cn("mr-2 h-4 w-4", c.starred && "fill-current")} />
            {c.starred ? "Unstar" : "Star"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setDraft(c.title);
              window.setTimeout(() => onRenaming(true), 0);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              exportChat(
                c.id === neo.chatId ? { ...c, messages: neo.messages } : c
              )
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!!neo.busy && c.id === neo.chatId}
            onSelect={() => neo.deleteChat(c.id)}
            className="text-status-error focus:text-status-error"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};
