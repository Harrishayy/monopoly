'use client';

import type { MascotState } from '@casework/core';
import { useUi, type Direction } from '@/state/ui';
import { cn } from '@/lib/cn';

const LABEL: Record<MascotState, string> = {
  idle: 'Agent is watching the inbox',
  think: 'Agent is reading sources',
  act: 'Agent is calling a tool',
  fail: 'A tool failed; the agent is retrying',
  esc: 'Agent needs a person to decide',
  done: 'Case closed',
};

export const MASCOT_NAME: Record<Direction, string> = { docket: 'Thump', switchboard: 'Patch', relay: 'Pip' };

interface MascotProps {
  state?: MascotState;
  size?: number;
  /** Force a skin; defaults to the active direction. */
  skin?: Direction;
  /** Decorative mascots (next to text that already says the state) should pass decorative. */
  decorative?: boolean;
  className?: string;
}

/** The agent's state as a character. Skin follows data-dir; animation is CSS in mascot.css. */
export function Mascot({ state = 'idle', size = 40, skin, decorative, className }: MascotProps) {
  const direction = useUi((s) => s.direction);
  const which = skin ?? direction;
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': LABEL[state] };
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn('m', `m-${which}`, `st-${state}`, className)}
      {...a11y}
    >
      {which === 'docket' && <Thump />}
      {which === 'switchboard' && <Patch />}
      {which === 'relay' && <Pip />}
      <g className="m-spark">
        <path d="M12 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="M104 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
      </g>
    </svg>
  );
}

function Thump() {
  return (
    <>
      <ellipse className="m-shadow" cx="60" cy="110" rx="36" ry="4" />
      <g className="m-body">
        <circle className="m-wood" cx="60" cy="20" r="12" />
        <rect className="m-wood" x="54" y="29" width="12" height="17" rx="2" />
        <rect className="m-block" x="26" y="44" width="68" height="46" rx="9" />
        <rect className="m-pad" x="22" y="88" width="76" height="12" rx="3" />
        <g className="m-eyes">
          <ellipse className="m-eye" cx="47" cy="63" rx="4" ry="5.5" />
          <ellipse className="m-eye" cx="73" cy="63" rx="4" ry="5.5" />
        </g>
        <circle className="m-cheek" cx="37" cy="73" r="3.5" />
        <circle className="m-cheek" cx="83" cy="73" r="3.5" />
        <path className="m-mouth m-mouth-n" d="M54 76 Q60 79 66 76" />
        <path className="m-mouth m-mouth-h" d="M51 74 Q60 85 69 74" />
        <path className="m-sweat" d="M88 30q5 7 0 10q-5-3 0-10z" />
      </g>
      <g className="m-hand">
        <path className="m-arm" d="M94 72 L106 46" />
        <rect className="m-flag" x="100" y="28" width="18" height="15" rx="2" />
        <text className="m-flag-t" x="109" y="40" textAnchor="middle">?</text>
      </g>
    </>
  );
}

function Patch() {
  return (
    <>
      <path className="m-cable" d="M60 86 C60 106 86 96 94 108 S108 118 118 114" />
      <g className="m-body">
        <rect className="m-pin" x="43" y="8" width="9" height="18" rx="2" />
        <rect className="m-pin" x="68" y="8" width="9" height="18" rx="2" />
        <rect className="m-block" x="24" y="24" width="72" height="62" rx="16" />
        <rect className="m-screen" x="33" y="33" width="54" height="40" rx="9" />
        <g className="m-eyes">
          <rect className="m-eye" x="44" y="41" width="8" height="12" rx="3" />
          <rect className="m-eye" x="68" y="41" width="8" height="12" rx="3" />
        </g>
        <path className="m-mouth m-mouth-n" d="M54 63 H66" />
        <path className="m-mouth m-mouth-h" d="M52 61 Q60 68 68 61" />
        <g className="m-bars">
          {[48, 53, 58.5, 64, 69].map((x) => (
            <rect key={x} x={x} y="60" width="3" height="6" rx="1" />
          ))}
        </g>
        <path className="m-sweat" d="M92 14q5 7 0 10q-5-3 0-10z" />
      </g>
      <g className="m-hand">
        <path className="m-arm" d="M96 58 L108 36" />
        <circle className="m-flag" cx="109" cy="29" r="9" />
        <text className="m-flag-t" x="109" y="33" textAnchor="middle">!</text>
      </g>
    </>
  );
}

function Pip() {
  return (
    <>
      <ellipse className="m-shadow" cx="60" cy="110" rx="32" ry="4" />
      <g className="m-body">
        <path className="m-arm" d="M60 34 V18" />
        <circle className="m-bulb" cx="60" cy="13" r="7" />
        <ellipse className="m-foot" cx="46" cy="102" rx="8" ry="5" />
        <ellipse className="m-foot" cx="74" cy="102" rx="8" ry="5" />
        <path className="m-block" d="M60 32C88 32 98 52 98 70C98 92 82 102 60 102C38 102 22 92 22 70C22 52 32 32 60 32Z" />
        <circle className="m-sclera" cx="48" cy="62" r="8.5" />
        <circle className="m-sclera" cx="72" cy="62" r="8.5" />
        <g className="m-eyes">
          <circle className="m-eye" cx="49" cy="63" r="4" />
          <circle className="m-eye" cx="73" cy="63" r="4" />
        </g>
        <path className="m-mouth m-mouth-n m-mouth-light" d="M54 80 Q60 84 66 80" />
        <path className="m-mouth m-mouth-h m-mouth-light" d="M51 78 Q60 90 69 78" />
        <path className="m-sweat" d="M90 34q5 7 0 10q-5-3 0-10z" />
      </g>
      <g className="m-hand">
        <path className="m-arm" d="M96 76 Q110 66 108 44" />
        <circle className="m-palm" cx="108" cy="38" r="8" />
      </g>
    </>
  );
}
