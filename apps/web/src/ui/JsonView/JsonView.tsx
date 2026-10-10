'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { CopyButton } from '../CopyButton';

const LONG = 200;

/** Collapsible view of tool arguments and results. Long strings truncate with "show more". */
export function JsonView({ value, collapsedDepth = 1, maxHeight = 240, className }: { value: unknown; collapsedDepth?: number; maxHeight?: number; className?: string }) {
  return (
    <div className={cn('relative rounded-ui border-(length:--bw) border-line bg-surface-2/50', className)}>
      <div className="absolute right-1 top-1">
        <CopyButton value={safeJson(value)} label="Copy JSON" />
      </div>
      <div className="overflow-auto p-3 pr-28 font-mono text-[12px] leading-[1.65]" style={{ maxHeight }}>
        <Node value={value} depth={0} collapsedDepth={collapsedDepth} />
      </div>
    </div>
  );
}

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 2) ?? 'undefined';
  } catch {
    return String(v);
  }
}

function Node({ value, depth, collapsedDepth }: { value: unknown; depth: number; collapsedDepth: number }) {
  const [open, setOpen] = useState(depth < collapsedDepth);
  const [more, setMore] = useState(false);
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') {
      const long = value.length > LONG;
      return (
        <span className="text-ok [overflow-wrap:anywhere] whitespace-pre-wrap">
          “{long && !more ? `${value.slice(0, LONG)}…` : value}”
          {long && (
            <button type="button" onClick={() => setMore(!more)} className="ml-1 cursor-pointer font-sans text-[11px] font-semibold text-accent underline">
              {more ? 'show less' : 'show more'}
            </button>
          )}
        </span>
      );
    }
    return <span className="text-info">{String(value)}</span>;
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
  const [l, r] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  if (!entries.length) return <span>{l + r}</span>;
  return (
    <span>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="cursor-pointer text-ink-2 hover:text-ink">
        {open ? '▾' : '▸'} {l}
        {!open && <span className="text-ink-2"> {entries.length} {entries.length === 1 ? 'item' : 'items'} {r}</span>}
      </button>
      {open && (
        <>
          <span className="block pl-4">
            {entries.map(([k, v]) => (
              <span key={k} className="block">
                {!Array.isArray(value) && <span className="text-ink">{k}: </span>}
                <Node value={v} depth={depth + 1} collapsedDepth={collapsedDepth} />
              </span>
            ))}
          </span>
          <span className="text-ink-2">{r}</span>
        </>
      )}
    </span>
  );
}
