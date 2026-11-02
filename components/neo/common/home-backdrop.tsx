import React, { useEffect, useRef } from "react";

/**
 * The home's backdrop: the soft tint is always there; the dot grid is not.
 * Inside the tinted area at the top, dots appear around the pointer while it
 * moves, and each one is pulled a little toward it, with a spring, so the
 * grid leans and settles like iron filings round a magnet. A moment after
 * the pointer stops the dots let go and fade. Below the tint, on touch and
 * with reduced motion, nothing happens.
 */
const SPACING = 26;
const RADIUS = 190; // how far the pointer reaches
const PULL = 15; // the most a dot leans toward it, px
const IDLE_MS = 650;
/** The tinted area, as a share of the home's height. */
const AREA = 0.4;

type Dot = { x: number; y: number; ox: number; oy: number; vx: number; vy: number };

const HomeBackdrop = () => {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const wrap = box.current;
    const host = wrap?.parentElement;
    if (!el || !wrap || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const brand =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--palette-blue-500")
        .trim() || "#3146b0";
    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width;
      h = r.height * AREA;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.height = `${h}px`;
      dots = [];
      for (let y = SPACING / 2; y < h; y += SPACING)
        for (let x = SPACING / 2; x < w; x += SPACING)
          dots.push({ x, y, ox: 0, oy: 0, vx: 0, vy: 0 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    let px = -9999;
    let py = -9999;
    let level = 0; // 0..1: how much the dots are shown
    let target = 0;
    let idle = 0;
    let frame = 0;

    const step = () => {
      level += (target - level) * 0.1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let moving = false;
      for (const d of dots) {
        const dx = px - d.x;
        const dy = py - d.y;
        const dist = Math.hypot(dx, dy);
        const f = dist < RADIUS ? (1 - dist / RADIUS) ** 2 : 0;
        // A spring toward where the magnet wants the dot.
        const tx = dist > 0.5 ? (dx / dist) * PULL * f * level : 0;
        const ty = dist > 0.5 ? (dy / dist) * PULL * f * level : 0;
        d.vx = (d.vx + (tx - d.ox) * 0.14) * 0.74;
        d.vy = (d.vy + (ty - d.oy) * 0.14) * 0.74;
        d.ox += d.vx;
        d.oy += d.vy;
        if (Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(tx - d.ox) > 0.02)
          moving = true;
        const a = Math.min(1, f * 1.15) * level;
        if (a < 0.01) continue;
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = brand;
        ctx.beginPath();
        ctx.arc(d.x + d.ox, d.y + d.oy, 1.15 + f * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame =
        moving || Math.abs(target - level) > 0.01
          ? window.requestAnimationFrame(step)
          : 0;
    };
    const wake = () => {
      if (!frame) frame = window.requestAnimationFrame(step);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      // Only inside the tinted area.
      if (y < 0 || y > h || x < 0 || x > w) {
        leave();
        return;
      }
      px = x;
      py = y;
      target = 1;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        target = 0;
        wake();
      }, IDLE_MS);
      wake();
    };
    const leave = () => {
      window.clearTimeout(idle);
      target = 0;
      wake();
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      ro.disconnect();
      window.clearTimeout(idle);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={box} className="neo-home-backdrop" aria-hidden="true">
      <canvas
        ref={canvas}
        className="absolute inset-x-0 top-0 w-full"
        data-testid="home-dots"
      />
    </div>
  );
};

export default HomeBackdrop;
