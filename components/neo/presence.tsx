import React, { useEffect } from "react";
import { useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";

/**
 * Neo, visible in the screens it is working in — not only in its panel.
 *
 * Rows it is on are marked in whatever list is showing (working, done, held),
 * (The strip that used to say what the run was doing has been removed.)
 *
 * Rows are marked by attribute rather than by prop so no list has to know Neo
 * exists: any row carrying `data-item-id` takes part. The marks are re-applied
 * after every store change, because a list re-rendering its rows is exactly
 * what happens while Neo works.
 *
 * DEV: production would render the mark from the row's own state (a
 * `neoState` field on the list item); delete the effect below on transplant.
 */
const NeoPresence = () => {
  const neo = useNeo();
  const state = useStore();

  useEffect(() => {
    const apply = () =>
      document
        .querySelectorAll<HTMLElement>("[data-item-id]")
        .forEach((row) => {
          const mark = neo.presence[row.dataset.itemId || ""];
          if (mark) row.dataset.neo = mark;
          else delete row.dataset.neo;
        });
    apply();
    const frame = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(frame);
  }, [neo.presence, state]);

  // The floating progress strip is gone (24 Oct 2026): the run is shown in
  // the chat and by the spinner on its row in Recents. Only the row marks stay.
  return null;
};

export default NeoPresence;
