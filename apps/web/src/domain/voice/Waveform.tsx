'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/hooks';

/**
 * Audio level bars on a canvas. `levels` is a fixed set of peaks (recording) or a function sampled
 * each frame (live). `progress` (0–1) lights the bars already played. Static peaks under reduced motion.
 */
export function Waveform({ levels, progress = 0, playing = false, label = 'Call audio levels', height = 44 }: { levels: number[] | (() => number); progress?: number; playing?: boolean; label?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const history = useRef<number[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) canvas.width = w * dpr;
      if (canvas.height !== h * dpr) canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cs = getComputedStyle(canvas);
      const on = cs.getPropertyValue('--accent').trim() || 'currentColor';
      const off = cs.getPropertyValue('--line-strong').trim() || 'currentColor';
      let peaks: number[];
      if (typeof levels === 'function') {
        history.current = [...history.current, levels()].slice(-48);
        peaks = history.current;
      } else peaks = levels;
      const n = Math.max(1, peaks.length);
      const bw = w / n;
      peaks.forEach((p, i) => {
        const played = typeof levels === 'function' || i / n < progress;
        const wobble = playing && played && !reduced && typeof levels !== 'function' ? 0.75 + 0.25 * Math.sin(t / 120 + i) : 1;
        const bh = Math.max(3, Math.min(1, p) * h * wobble);
        ctx.globalAlpha = played ? 1 : 0.35;
        ctx.fillStyle = played ? on : off;
        ctx.fillRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 2), bh);
      });
      if (playing && !reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [levels, progress, playing, reduced]);

  return <canvas ref={ref} role="img" aria-label={label} className="block w-full" style={{ height }} />;
}
