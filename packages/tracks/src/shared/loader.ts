/** Spend-limit rule factory shared by tracks that gate money-moving tools. */
export function spendLimit(id: string, tools: string[], limitPence: number, label: string) {
  return {
    id,
    describe: `${label} may not exceed £${(limitPence / 100).toFixed(2)} without a person`,
    appliesTo: tools,
    check(call: { args: unknown }) {
      const amount = (call.args as { amountPence?: number })?.amountPence;
      return typeof amount === 'number' && amount > limitPence
        ? { ok: false as const, why: `£${(amount / 100).toFixed(2)} is over the £${(limitPence / 100).toFixed(2)} limit` }
        : { ok: true as const };
    },
  };
}
