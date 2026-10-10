import type { SourceKind } from '@casework/core';
import type { IconName } from '@/ui';

/** Icon and plain label for each source kind. */
export const KIND: Record<SourceKind, { icon: IconName; label: string }> = {
  call: { icon: 'call', label: 'Call' },
  email: { icon: 'email', label: 'Email' },
  doc: { icon: 'doc', label: 'Document' },
  crm: { icon: 'crm', label: 'Record update' },
  ticket: { icon: 'ticket', label: 'Case file' },
  sms: { icon: 'sms', label: 'Message' },
  note: { icon: 'note', label: 'Note' },
};

/** "PM-001:event-12" → "Event 12"; "PM-001:case" → "Case file"; attachments keep their file name. */
export function shortSourceLabel(id: string) {
  const ev = id.match(/:event-0*(\d+)$/);
  if (ev) return `Event ${ev[1]}`;
  if (id.endsWith(':case')) return 'Case file';
  return (id.split(':').slice(1).join(':') || id).replace(/^attachment-\d+-/, '');
}
