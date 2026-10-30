import React, { createContext, ReactNode, useEffect, useRef } from "react";
import { useSourceWatcher } from "@/hooks/pages/inbox/use-source-watcher";
import { awaitingYou, markUnread } from "@/hooks/pages/neo/use-unread";
import {
  useNeoRuntime,
  type NeoRuntime,
} from "@/hooks/pages/neo/use-neo-runtime";

export const NeoContext = createContext<NeoRuntime | null>(null);

type Props = { children: ReactNode };

/**
 * Neo lives above the routes, like the guide: a run started on the queue has
 * to survive opening the document it created.
 *
 * DEV: mount in production's pages/_app.tsx beside GuideProvider.
 */
const NeoProvider = ({ children }: Props) => {
  useSourceWatcher();
  const runtime = useNeoRuntime();
  // Something new in a chat you are not looking at: finished, or waiting on
  // you. The row in Recents shows a dot until you open it.
  const was = useRef({ busy: false, waiting: false, chat: "" });
  const waiting = awaitingYou(runtime);
  useEffect(() => {
    const prev = was.current;
    const busy = !!runtime.busy;
    if (prev.busy && !busy) markUnread(prev.chat);
    if (waiting && !prev.waiting) markUnread(runtime.chatId);
    was.current = {
      busy,
      waiting,
      chat: busy ? runtime.chatId : prev.chat,
    };
  }, [runtime.busy, runtime.chatId, waiting]);
  return <NeoContext.Provider value={runtime}>{children}</NeoContext.Provider>;
};

export default NeoProvider;
