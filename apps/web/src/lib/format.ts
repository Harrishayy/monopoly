const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

/** Integer pence → "£1,249.00". */
export const money = (pence: number) => gbp.format(pence / 100);

/** ms → "820ms", "12.4s" or "6m 12s". */
export function duration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  return `${m}m ${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}s`;
}

/** ISO time → "now", "4m", "2h", "3d". */
export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86_400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86_400)}d`;
}
