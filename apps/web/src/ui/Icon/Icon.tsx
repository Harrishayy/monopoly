import {
  AlertTriangle, ArrowRight, BookOpen, Check, ClipboardList, Clock, Copy, FileText, GitBranch, Hand, Inbox, Lock, Mail, MessageSquare,
  Phone, Play, RotateCcw, Search, Shield, StickyNote, Ticket, Trash2, Database, Wrench, X, type LucideIcon,
} from 'lucide-react';

/** Domain names → lucide icons, so call sites say what they mean, not which glyph. */
export const ICONS = {
  call: Phone, email: Mail, doc: FileText, crm: Database, ticket: Ticket, sms: MessageSquare, note: StickyNote,
  tool: Wrench, escalate: Hand, read: BookOpen, assess: ClipboardList, decide: GitBranch, propose: ArrowRight, fail: AlertTriangle,
  blocked: Lock, resolve: Check, retry: RotateCcw, search: Search, clock: Clock, copy: Copy, shield: Shield, arrow: ArrowRight,
  check: Check, x: X, play: Play, inbox: Inbox, delete: Trash2,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: 12 | 14 | 16 | 20;
  className?: string;
  /** Makes the icon meaningful to screen readers. Decorative (aria-hidden) by default. */
  label?: string;
}

export function Icon({ name, size = 16, className, label }: IconProps) {
  const C = ICONS[name];
  return label ? <C size={size} className={className} role="img" aria-label={label} /> : <C size={size} className={className} aria-hidden />;
}
