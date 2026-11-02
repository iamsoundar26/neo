import React, { useEffect, useRef } from "react";

/**
 * The home's backdrop (24 Oct 2026): the soft tint is always there; the dot
 * grid is not. The dots appear only around the pointer while it moves, as a
 * soft pool that glides after it and fades a moment after it stops. Touch
 * and reduced motion never show them.
 */
const IDLE_MS = 700;

const HomeBackdrop = () => {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    const host = node?.parentElement;
    if (!node || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let idle = 0;
    let seen = false;
    const draw = () => {
      // The pool glides after the pointer instead of snapping to it.
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      node.style.setProperty("--mx", `${x.toFixed(1)}px`);
      node.style.setProperty("--my", `${y.toFixed(1)}px`);
      frame =
        Math.abs(tx - x) + Math.abs(ty - y) > 0.5
          ? window.requestAnimationFrame(draw)
          : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = node.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!seen) {
        x = tx;
        y = ty;
        seen = true;
      }
      node.style.setProperty("--dots", "1");
      window.clearTimeout(idle);
      idle = window.setTimeout(
        () => node.style.setProperty("--dots", "0"),
        IDLE_MS
      );
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const leave = () => {
      window.clearTimeout(idle);
      node.style.setProperty("--dots", "0");
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      window.clearTimeout(idle);
      window.cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={el} className="neo-home-backdrop" aria-hidden="true" />;
};

export default HomeBackdrop;
