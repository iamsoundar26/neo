import React, { useEffect, useMemo, useState } from "react";
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
import { Kbd } from "@/components/ui/kbd";
import type { NeoChat } from "@/types/pages/neo";
import { exportChat } from "./chat-title";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { cn } from "@/lib/utils";
import NeoSearch from "./nav-search";
import { awaitingYou, useUnread } from "@/hooks/pages/neo/use-unread";
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
 * Neo's own column, beside the app's icon rail: a new chat, Neo's two
 * places, and the conversations so far — starred first, then by day, with a
 * search over titles and messages. Each chat has a ⋯ menu on hover: Star,
 * Rename, Export, Delete. Opening one carries it on.
 */
const NeoNav = ({ page, onPage, folded, onToggle, onHide }: Props) => {
  const neo = useNeo();
  const busy = !!neo.busy;
  const [searchOpen, setSearchOpen] = useState(false);
  // Cmd/Ctrl+K opens the search from anywhere in Neo.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Starred first, then the most recent.
  const flat = useMemo(
    () =>
      neo.chats
        .slice()
        .sort(
          (a, b) =>
            Number(!!b.starred) - Number(!!a.starred) ||
            b.updatedAt.localeCompare(a.updatedAt)
        ),
    [neo.chats]
  );

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

  // The column in the app's own sidebar language: the same 36px rows, 14px
  // text, 16px icons and colours as the menu on its left.
  const ITEM =
    "flex h-9 w-full items-center gap-2 rounded-md p-2 text-left text-label-2 font-normal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  const idle = "text-secondary-foreground hover:bg-accent hover:text-foreground";
  const on = "bg-accent text-foreground [&>svg]:text-primary";
  // A chat with nothing said yet is the New Chat page: that is where you are.
  const onNew = page === "chat" && neo.messages.length === 0;
  return (
    <nav
      aria-label="Neo"
      className="flex w-[200px] flex-none flex-col border-r border-pi-line bg-background"
    >
      <div className="flex h-12 flex-none items-center justify-between border-b border-pi-line pl-4 pr-2">
        <h1 className="text-label-1 font-semibold text-foreground">Neo</h1>
        {onHide && (
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide Neo menu"
            title="Hide menu"
            className="grid h-8 w-8 flex-none place-items-center rounded-md text-secondary-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <ul className="flex flex-none flex-col gap-1 px-3 pb-2 pt-3">
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
            aria-current={onNew ? "page" : undefined}
            className={cn(ITEM, onNew ? on : idle)}
          >
            <SquarePen className="h-4 w-4 flex-none" />
            New Chat
          </button>
        </li>
        <li>
          <button
            type="button"
            data-testid="nav-search"
            onClick={() => setSearchOpen(true)}
            className={cn(ITEM, idle)}
          >
            <Search className="h-4 w-4 flex-none" />
            Search
            <Kbd className="ml-auto bg-transparent text-pi-faint">⌘K</Kbd>
          </button>
        </li>
        <li>
          <button
            type="button"
            data-testid="nav-agents"
            aria-current={page === "agents" ? "page" : undefined}
            onClick={() => onPage("agents")}
            className={cn(
              ITEM,
              page === "agents" ? on : idle
            )}
          >
            <NeoAgents className="h-4 w-4 flex-none" />
            Agents
          </button>
        </li>
      </ul>

      <div className="mx-4 border-t border-pi-line" />
      <h2 className="px-5 pb-1 pt-3 text-label-3 font-medium text-secondary-foreground">
        Recents
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {flat.length === 0 && (
          <p className="px-2 py-2 text-label-2 text-pi-faint">No chats yet</p>
        )}
        <ul className="flex flex-col gap-0.5">
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
      <NeoSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        chats={neo.chats}
        onNewChat={() => {
          if (busy) return;
          neo.reset();
          onPage("chat");
        }}
        onOpenChat={(id) => {
          if (busy && id !== neo.chatId) return;
          neo.openChat(id);
          onPage("chat");
        }}
      />
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
  const unread = useUnread();
  const [draft, setDraft] = useState(c.title);
  const running = c.id === neo.chatId && !!neo.busy && !awaitingYou(neo);
  const isUnread = unread.has(c.id);
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
      {/* Neo is working in this chat: it spins, wherever you are in Neo. When
          it has finished, or needs you, and you are elsewhere: a dot. */}
      {running && (
        <Loader
          aria-label="Neo is working"
          data-testid="chat-working"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary transition-opacity group-hover/chat:opacity-0"
          strokeWidth={2}
        />
      )}
      {!running && isUnread && (
        <span
          role="img"
          aria-label="New activity"
          data-testid="chat-unread"
          className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary transition-opacity group-hover/chat:opacity-0"
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
          "h-9 gap-2 rounded-md p-2 pr-8 text-label-2 font-normal disabled:opacity-50",
          current
            ? "bg-accent text-foreground"
            : "text-secondary-foreground hover:bg-accent hover:text-foreground"
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
