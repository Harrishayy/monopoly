# 05 · Component catalogue

Every component, hook and server module (112 entries). Generated from `docs/design/casework-design-directions.html`. Edit the artifact's `CAT` array, then regenerate (see docs/README.md).

## Build brief template

Paste this to a Claude instance, filling in one entry below:

```
Build <Name> (<layer>) at <file>.

Purpose: <purpose>
Interface: <interface>
States to support: <states>
Libraries: <libraries>
Notes: <notes>

Rules (from CLAUDE.md):
- Read CLAUDE.md and docs/design/casework-design-directions.html first.
- Style only with CSS variables from src/tokens; no hex values. It must look right under data-dir="docket", "switchboard" and "relay".
- No track names in the code; use pack.vocabulary for labels.
- Keyboard reachable, visible focus, status never shown by colour alone, honour prefers-reduced-motion.
- Add it to /design showing every state above, and add a Vitest test.
- Work only inside the folder above; propose contract changes separately.
```

## Primitives · apps/web/src/ui

### Button

- **File:** `apps/web/src/ui/Button`
- **Purpose:** Every clickable action.
- **Interface:** `variant: 'primary'|'secondary'|'ghost'|'danger'; size: 'sm'|'md'; loading?: boolean; icon?: IconName; asChild?: boolean`
- **States:** default, hover, active, focus, disabled, loading
- **Libraries:** cva, @radix-ui/react-slot
- **Notes:** Loading keeps its width and sets aria-busy. At most one primary per pane. Relay skin: offset shadow that collapses when pressed.

### IconButton

- **File:** `apps/web/src/ui/IconButton`
- **Purpose:** Square button with an icon only.
- **Interface:** `icon: IconName; label: string; variant?; size?`
- **States:** default, hover, focus, disabled
- **Libraries:** Button, Tooltip
- **Notes:** label is required; it becomes aria-label and the tooltip text.

### Icon

- **File:** `apps/web/src/ui/Icon`
- **Purpose:** Maps domain names (call, email, doc, crm, ticket, tool, escalate) to lucide icons.
- **Interface:** `name: IconName; size?: 14|16|20; className?`
- **States:** n/a
- **Libraries:** lucide-react
- **Notes:** aria-hidden by default. Pass label to make it meaningful.

### StatusChip

- **File:** `apps/web/src/ui/StatusChip`
- **Purpose:** Shows a case or run status.
- **Interface:** `status: CaseStatus; size?: 'sm'|'md'`
- **States:** resolved, escalated, needs_info, failed, running (pulses), blocked
- **Libraries:** cva
- **Notes:** Always shows text as well as colour. Running dot pulses, static under reduced motion.

### Count

- **File:** `apps/web/src/ui/Count`
- **Purpose:** Small number badge on nav tabs.
- **Interface:** `value: number; max?: 99; tone?: 'neutral'|'accent'`
- **States:** zero (hidden), normal, overflow (99+)
- **Libraries:** —
- **Notes:** Tabular numbers. Announced as part of the tab label.

### Kbd

- **File:** `apps/web/src/ui/Kbd`
- **Purpose:** Keyboard hint, e.g. / for search.
- **Interface:** `keys: string[]`
- **States:** default
- **Libraries:** —
- **Notes:** Rendered as <kbd>. Hidden on touch devices.

### Avatar

- **File:** `apps/web/src/ui/Avatar`
- **Purpose:** A person, or the agent.
- **Interface:** `name: string; src?: string; kind?: 'human'|'agent'`
- **States:** image, initials, agent (mascot)
- **Libraries:** —
- **Notes:** agent kind renders a mini Mascot.

### Eyebrow

- **File:** `apps/web/src/ui/Eyebrow`
- **Purpose:** Small uppercase label above content.
- **Interface:** `children; tone?: 'muted'|'accent'|'bad'`
- **States:** default
- **Libraries:** —
- **Notes:** Letter-spacing .08em. Never the only label for a control.

### Mono

- **File:** `apps/web/src/ui/Mono`
- **Purpose:** Inline machine text: refs, tool names, amounts in tables.
- **Interface:** `children; muted?: boolean`
- **States:** default
- **Libraries:** —
- **Notes:** Tabular numbers. Wraps anywhere so long tool calls never overflow.

### Surface

- **File:** `apps/web/src/ui/Surface`
- **Purpose:** Card container.
- **Interface:** `as?; padded?: boolean; interactive?: boolean; tone?: 'base'|'sunken'`
- **States:** default, hover (interactive), selected
- **Libraries:** cva
- **Notes:** Use for distinct objects only. Don’t wrap every block in a card.

### Divider

- **File:** `apps/web/src/ui/Divider`
- **Purpose:** Horizontal or vertical rule.
- **Interface:** `orientation?; strong?: boolean`
- **States:** default
- **Libraries:** —
- **Notes:** role="separator" only when it separates landmarks.

### Input

- **File:** `apps/web/src/ui/Input`
- **Purpose:** Single-line text field.
- **Interface:** `label; hint?; error?; prefix?: Icon; suffix?: ReactNode`
- **States:** default, focus, error, disabled, readOnly
- **Libraries:** —
- **Notes:** Label always visible. Error text replaces the hint and is linked with aria-describedby.

### MoneyInput

- **File:** `apps/web/src/ui/MoneyInput`
- **Purpose:** Money entry for policy limits and approvals.
- **Interface:** `valuePence: number; onChange(pence); currency?: 'GBP'`
- **States:** default, focus, error, disabled
- **Libraries:** Intl.NumberFormat
- **Notes:** Stores integer pence. Formats on blur, accepts “420”, “£420”, “420.00”.

### Textarea

- **File:** `apps/web/src/ui/Textarea`
- **Purpose:** Notes on a human decision.
- **Interface:** `label; rows?; autosize?: boolean; maxLength?`
- **States:** default, focus, error, disabled
- **Libraries:** —
- **Notes:** Counter appears near maxLength.

### Select

- **File:** `apps/web/src/ui/Select`
- **Purpose:** Pick one from a short list.
- **Interface:** `label; options: {value,label}[]; value; onChange`
- **States:** closed, open, focus, disabled
- **Libraries:** @radix-ui/react-select
- **Notes:** Typeahead and arrow keys come from Radix.

### Switch

- **File:** `apps/web/src/ui/Switch`
- **Purpose:** On or off setting, e.g. the voice agent.
- **Interface:** `label; checked; onCheckedChange`
- **States:** off, on, focus, disabled
- **Libraries:** @radix-ui/react-switch
- **Notes:** Thumb springs 300ms. Whole row is clickable.

### SegmentedControl

- **File:** `apps/web/src/ui/SegmentedControl`
- **Purpose:** One of 2–4 options with a sliding thumb.
- **Interface:** `options: {value,label}[]; value; onChange; size?`
- **States:** per option: rest, hover, selected, focus
- **Libraries:** @radix-ui/react-toggle-group, motion
- **Notes:** Thumb uses motion layoutId. Arrow keys move the selection.

### Tabs

- **File:** `apps/web/src/ui/Tabs`
- **Purpose:** Switch panels, e.g. between sources.
- **Interface:** `items: {value,label,count?}[]; value; onChange`
- **States:** rest, hover, selected, focus
- **Libraries:** @radix-ui/react-tabs
- **Notes:** Docket skin: folder tabs. Switchboard: lit underline. Relay: pill.

### Tooltip

- **File:** `apps/web/src/ui/Tooltip`
- **Purpose:** Short hint on hover or focus.
- **Interface:** `content; side?; delay?: 400`
- **States:** hidden, shown
- **Libraries:** @radix-ui/react-tooltip
- **Notes:** Never put essential information only in a tooltip.

### Popover

- **File:** `apps/web/src/ui/Popover`
- **Purpose:** Small floating panel, e.g. a citation preview.
- **Interface:** `trigger; content; side?`
- **States:** closed, open
- **Libraries:** @radix-ui/react-popover
- **Notes:** Focus moves into it when opened by keyboard.

### Menu

- **File:** `apps/web/src/ui/Menu`
- **Purpose:** Case actions menu.
- **Interface:** `trigger; items: {label, icon?, onSelect, danger?}[]`
- **States:** closed, open, item hover, item disabled
- **Libraries:** @radix-ui/react-dropdown-menu
- **Notes:** Danger items last, separated by a rule.

### Dialog

- **File:** `apps/web/src/ui/Dialog`
- **Purpose:** Confirm a human decision that can’t be undone.
- **Interface:** `title; description; confirmLabel; tone?: 'default'|'danger'; onConfirm`
- **States:** closed, open, confirming (loading)
- **Libraries:** @radix-ui/react-dialog
- **Notes:** The confirm button repeats the effect: “Approve £420”, not “OK”.

### Sheet

- **File:** `apps/web/src/ui/Sheet`
- **Purpose:** Side panel; holds the source viewer on narrow screens.
- **Interface:** `side: 'right'|'bottom'; title; children`
- **States:** closed, open
- **Libraries:** @radix-ui/react-dialog
- **Notes:** Bottom sheet below 860px.

### Toaster

- **File:** `apps/web/src/ui/Toaster`
- **Purpose:** Toasts for run events.
- **Interface:** `toast.event(RunEvent) helper`
- **States:** enter, idle, exit, stacked
- **Libraries:** sonner
- **Notes:** Only failures, escalations and completions toast. Never more than 3 visible.

### Skeleton

- **File:** `apps/web/src/ui/Skeleton`
- **Purpose:** Loading placeholder shaped like the final layout.
- **Interface:** `variant: 'line'|'block'|'row'; lines?`
- **States:** shimmer, static (reduced motion)
- **Libraries:** —
- **Notes:** Matches the real component’s size so nothing jumps when data arrives.

### Spinner

- **File:** `apps/web/src/ui/Spinner`
- **Purpose:** Small indeterminate loader inside buttons and steps.
- **Interface:** `size?: 12|16`
- **States:** spinning
- **Libraries:** —
- **Notes:** Prefer Skeleton for areas larger than a button.

### ProgressBar

- **File:** `apps/web/src/ui/ProgressBar`
- **Purpose:** Determinate progress, e.g. a batch of cases.
- **Interface:** `value: number; max: number; label`
- **States:** empty, partial, complete
- **Libraries:** —
- **Notes:** role="progressbar" with aria-valuenow.

### ScrollArea

- **File:** `apps/web/src/ui/ScrollArea`
- **Purpose:** Scrolling panes in the app shell.
- **Interface:** `children; axis?`
- **States:** default
- **Libraries:** @radix-ui/react-scroll-area
- **Notes:** Keeps native scrolling and keyboard behaviour.

### EmptyState

- **File:** `apps/web/src/ui/EmptyState`
- **Purpose:** Nothing to show yet.
- **Interface:** `mascotState?; title; body; action?`
- **States:** default
- **Libraries:** Mascot
- **Notes:** Says what will appear and how to make it appear.

### ErrorState

- **File:** `apps/web/src/ui/ErrorState`
- **Purpose:** Something failed to load.
- **Interface:** `error: AppError; onRetry?`
- **States:** default, retrying
- **Libraries:** —
- **Notes:** Says what failed and what to do. No apologies, no codes alone.

### KeyValue

- **File:** `apps/web/src/ui/KeyValue`
- **Purpose:** Label/value rows for case metadata.
- **Interface:** `items: {label, value, mono?}[]; columns?: 1|2`
- **States:** default
- **Libraries:** —
- **Notes:** Values right-aligned in mono when numeric.

### CopyButton

- **File:** `apps/web/src/ui/CopyButton`
- **Purpose:** Copy a ref or a payload.
- **Interface:** `value: string; label?`
- **States:** idle, copied (1.5s), failed
- **Libraries:** —
- **Notes:** Falls back to selecting the text if the clipboard is refused.

### RelativeTime

- **File:** `apps/web/src/ui/RelativeTime`
- **Purpose:** “4m”, “2h”, with the exact time on hover.
- **Interface:** `at: string`
- **States:** default
- **Libraries:** date-fns, lib/clock
- **Notes:** Uses the shared 30s ticker. <time datetime> for machines. Client component.

### MoneyText

- **File:** `apps/web/src/ui/MoneyText`
- **Purpose:** Formats pence as £1,249.00.
- **Interface:** `pence: number; signed?: boolean`
- **States:** default, negative
- **Libraries:** Intl.NumberFormat
- **Notes:** en-GB, tabular numbers.

### DurationText

- **File:** `apps/web/src/ui/DurationText`
- **Purpose:** Formats ms as 12.4s or 6m 12s.
- **Interface:** `ms: number`
- **States:** default
- **Libraries:** —
- **Notes:** Used in trace steps and call cards.

### JsonView

- **File:** `apps/web/src/ui/JsonView`
- **Purpose:** Collapsible view of tool arguments and results.
- **Interface:** `value: unknown; collapsedDepth?: 1; maxHeight?: 240`
- **States:** collapsed, expanded, truncated
- **Libraries:** —
- **Notes:** Strings over 200 chars truncate with “show more”. Copies as JSON.

### VisuallyHidden

- **File:** `apps/web/src/ui/VisuallyHidden`
- **Purpose:** Text for screen readers only.
- **Interface:** `children`
- **States:** n/a
- **Libraries:** @radix-ui/react-visually-hidden
- **Notes:** Used for live-region announcements of run progress.

## Domain components · apps/web/src/domain

### Mascot

- **File:** `apps/web/src/domain/mascot`
- **Purpose:** The agent’s current state as a character (Thump, Patch or Pip).
- **Interface:** `state: 'idle'|'think'|'act'|'fail'|'esc'|'done'; size?: number; label?: string`
- **States:** idle, think, act, fail, esc, done
- **Libraries:** CSS keyframes
- **Notes:** Skin chosen by data-dir. role="img" with aria-label like “Agent needs a person”. Static pose under reduced motion.

### OutcomeStamp

- **File:** `apps/web/src/domain/run/OutcomeStamp`
- **Purpose:** The final outcome of a run.
- **Interface:** `outcome: Outcome; animateIn?: boolean`
- **States:** hidden (running), revealed, at rest
- **Libraries:** CSS keyframes
- **Notes:** Docket: stamp lands. Switchboard: LED blinks. Relay: pops. Only animates on the live transition, not on reload.

### SourceChip

- **File:** `apps/web/src/domain/case/SourceChip`
- **Purpose:** One piece of evidence (call, email, doc, CRM, ticket).
- **Interface:** `source: Source; onOpen?`
- **States:** default, hover, cited (highlight), focus
- **Libraries:** Icon
- **Notes:** Click opens SourceViewer at that source.

### SourceViewer

- **File:** `apps/web/src/domain/case/SourceViewer`
- **Purpose:** Reads any source, with cited passages highlighted.
- **Interface:** `sources: Source[]; activeId; highlight?: {sourceId, span}`
- **States:** per kind, loading, highlighted
- **Libraries:** Tabs, Sheet
- **Notes:** Dispatches to the five kind-specific views below.

### CallTranscript

- **File:** `apps/web/src/domain/case/CallTranscript`
- **Purpose:** Speaker turns with timestamps.
- **Interface:** `turns: {speaker, text, atMs}[]; activeIndex?`
- **States:** static, playing (active turn)
- **Libraries:** —
- **Notes:** Reused by VoiceCallCard.

### EmailView

- **File:** `apps/web/src/domain/case/EmailView`
- **Purpose:** From, to, date, subject, body, attachments.
- **Interface:** `source: Source`
- **States:** default
- **Libraries:** —
- **Notes:** Quoted replies collapsed.

### DocumentView

- **File:** `apps/web/src/domain/case/DocumentView`
- **Purpose:** Document text with page markers.
- **Interface:** `source: Source`
- **States:** default, highlighted span
- **Libraries:** —
- **Notes:** Shows extracted text, not a PDF renderer, unless a track needs one.

### CrmRecordView

- **File:** `apps/web/src/domain/case/CrmRecordView`
- **Purpose:** A CRM record as fields plus history.
- **Interface:** `source: Source`
- **States:** default
- **Libraries:** KeyValue
- **Notes:** Changed fields marked.

### TicketView

- **File:** `apps/web/src/domain/case/TicketView`
- **Purpose:** A ticket with its status and comments.
- **Interface:** `source: Source`
- **States:** default
- **Libraries:** —
- **Notes:** —

### Citation

- **File:** `apps/web/src/domain/case/Citation`
- **Purpose:** Small link from a fact to its source.
- **Interface:** `sourceId; span?; label?`
- **States:** default, hover (preview), focus
- **Libraries:** Popover
- **Notes:** Hover previews the snippet. Click opens the viewer at the span.

### CaseListItem

- **File:** `apps/web/src/domain/case/CaseListItem`
- **Purpose:** A row in the inbox.
- **Interface:** `case: CaseSummary; selected?: boolean`
- **States:** default, hover, selected, unread, SLA warning
- **Libraries:** StatusChip, RelativeTime
- **Notes:** Whole row is one link. Arrow keys and j/k move selection.

### CaseList

- **File:** `apps/web/src/domain/case/CaseList`
- **Purpose:** The inbox list with status filters.
- **Interface:** `cases; selectedRef; onSelect; filters`
- **States:** loading, empty, list, filtered empty
- **Libraries:** @tanstack/react-virtual
- **Notes:** Virtualised past 100 rows.

### CaseHeader

- **File:** `apps/web/src/domain/case/CaseHeader`
- **Purpose:** Ref, status, SLA, title, customer.
- **Interface:** `case: Case; actions?`
- **States:** default, running
- **Libraries:** StatusChip, SlaTimer, Menu
- **Notes:** Title is the page h1.

### SlaTimer

- **File:** `apps/web/src/domain/case/SlaTimer`
- **Purpose:** Time left before the deadline.
- **Interface:** `dueAt: string`
- **States:** ok (> 2h), warn (< 1h), overdue
- **Libraries:** lib/clock
- **Notes:** Colour changes come with a text change (“Overdue 12m”).

### RunTrace

- **File:** `apps/web/src/domain/run/RunTrace`
- **Purpose:** Ordered steps of a run, live or replayed.
- **Interface:** `view: RunView; mode: 'live'|'replay'`
- **States:** empty, running, complete, failed
- **Libraries:** motion
- **Notes:** Auto-scrolls while live unless the user has scrolled up. Announces new steps in a polite live region.

### TraceStep

- **File:** `apps/web/src/domain/run/TraceStep`
- **Purpose:** One step in the trace.
- **Interface:** `kind: 'read'|'tool'|'decide'|'fail'|'retry'|'blocked'|'escalate'|'resolve'; title; detail; at; ms?; payload?`
- **States:** pending, active, done, expanded
- **Libraries:** JsonView
- **Notes:** Tool titles in mono. Fail steps show the attempt count.

### ToolCallBlock

- **File:** `apps/web/src/domain/run/ToolCallBlock`
- **Purpose:** Arguments, result or error and latency for one tool call.
- **Interface:** `call: ToolCallView`
- **States:** calling, succeeded, failed, retried
- **Libraries:** JsonView, DurationText
- **Notes:** Shows every attempt, not only the last.

### RetryBadge

- **File:** `apps/web/src/domain/run/RetryBadge`
- **Purpose:** “Retry 2 of 3”.
- **Interface:** `attempt; max`
- **States:** retrying, recovered, gave up
- **Libraries:** —
- **Notes:** —

### ConfidenceMeter

- **File:** `apps/web/src/domain/run/ConfidenceMeter`
- **Purpose:** How sure the agent is, and why not more.
- **Interface:** `value: number; reasons?: string[]`
- **States:** low (< .5), medium, high (≥ .8)
- **Libraries:** Tooltip
- **Notes:** Shows a word (Low, Medium, High) next to the bar.

### DecisionPanel

- **File:** `apps/web/src/domain/run/DecisionPanel`
- **Purpose:** Outcome, reason, refused actions, next steps.
- **Interface:** `view: RunView`
- **States:** running, resolved, escalated, needs info, failed
- **Libraries:** OutcomeStamp, BlockedAction
- **Notes:** Primary action changes with outcome: “Open handover” or “View audit log”.

### BlockedAction

- **File:** `apps/web/src/domain/run/BlockedAction`
- **Purpose:** An action the agent refused, and the rule that stopped it.
- **Interface:** `action; ruleId; why?`
- **States:** default
- **Libraries:** Icon
- **Notes:** Struck-through text plus a lock icon. Rule id in mono.

### HandoverCard

- **File:** `apps/web/src/domain/handover/HandoverCard`
- **Purpose:** Everything a person needs to decide, in one card.
- **Interface:** `handover: Handover; case: Case; onDecide`
- **States:** open, deciding, decided
- **Libraries:** FactList, TriedList, OptionList
- **Notes:** The hero component for exception handling. Must make sense with no other screen open.

### FactList

- **File:** `apps/web/src/domain/handover/FactList`
- **Purpose:** Facts, each with a citation.
- **Interface:** `facts: {text, sourceId}[]`
- **States:** default
- **Libraries:** Citation
- **Notes:** A fact without a source is a bug; the handover builder rejects it.

### TriedList

- **File:** `apps/web/src/domain/handover/TriedList`
- **Purpose:** What the agent already attempted.
- **Interface:** `tried: {text, ok}[]`
- **States:** default
- **Libraries:** Icon
- **Notes:** Failures shown in --bad with an X icon.

### OptionList

- **File:** `apps/web/src/domain/handover/OptionList`
- **Purpose:** Choices for the person, with the recommended one marked.
- **Interface:** `options: HandoverOption[]; onChoose`
- **States:** rest, hover, recommended, chosen, disabled
- **Libraries:** Dialog
- **Notes:** Irreversible options open a confirm Dialog first.

### HumanDecisionRecord

- **File:** `apps/web/src/domain/handover/HumanDecisionRecord`
- **Purpose:** Who decided what, when, and why.
- **Interface:** `decision: HumanDecision`
- **States:** default
- **Libraries:** RelativeTime, Avatar
- **Notes:** Appears in the trace after the run as part of the audit trail.

### AutonomyControl

- **File:** `apps/web/src/domain/settings/AutonomyControl`
- **Purpose:** Suggest, Ask first, or Autonomous.
- **Interface:** `value: Autonomy; onChange`
- **States:** per level
- **Libraries:** SegmentedControl
- **Notes:** Explains the selected level in one sentence under the control.

### PolicyLimitField

- **File:** `apps/web/src/domain/settings/PolicyLimitField`
- **Purpose:** Edit one policy limit, e.g. a spend cap.
- **Interface:** `rule: PolicyRule; onChange`
- **States:** default, edited, saving, error
- **Libraries:** MoneyInput
- **Notes:** Shows the rule id and which actions it gates.

### VoiceCallCard

- **File:** `apps/web/src/domain/voice/VoiceCallCard`
- **Purpose:** A live or recorded call handled by the voice agent.
- **Interface:** `call: CallView; mode: 'live'|'recording'`
- **States:** ringing, live, agent speaking, caller speaking, ended, failed
- **Libraries:** @elevenlabs/react
- **Notes:** Mute and end controls in live mode. The transcript follows along.

### Waveform

- **File:** `apps/web/src/domain/voice/Waveform`
- **Purpose:** Audio level bars.
- **Interface:** `levels: number[] | () => number; progress?`
- **States:** idle, playing, paused
- **Libraries:** canvas
- **Notes:** Canvas with requestAnimationFrame. Static peaks under reduced motion.

### RealityMeter

- **File:** `apps/web/src/domain/reality/RealityMeter`
- **Purpose:** One cell per case, coloured by outcome.
- **Interface:** `results: CaseResult[]`
- **States:** pending, running (cells fill), complete
- **Libraries:** —
- **Notes:** Cells are buttons that open the case. Legend shows counts.

### RealityCaseRow

- **File:** `apps/web/src/domain/reality/RealityCaseRow`
- **Purpose:** One case in a batch result.
- **Interface:** `result: CaseResult`
- **States:** pending, running, resolved, escalated, failed
- **Libraries:** StatusChip, DurationText
- **Notes:** Links to ANSWER.md and the trace.

### BatchRunControl

- **File:** `apps/web/src/domain/reality/BatchRunControl`
- **Purpose:** Start, watch and cancel a batch.
- **Interface:** `batch?: BatchView; onStart(dir); onCancel`
- **States:** idle, running, cancelling, done
- **Libraries:** ProgressBar
- **Notes:** Shows concurrency, elapsed time and rate-limit backoff.

### ToolHealthRow

- **File:** `apps/web/src/domain/tools/ToolHealthRow`
- **Purpose:** Success rate, latency and last error for a tool.
- **Interface:** `tool: ToolHealth`
- **States:** healthy, degraded, down
- **Libraries:** inline SVG sparkline
- **Notes:** Sparkline of the last 50 calls.

### TrackSwitcher

- **File:** `apps/web/src/domain/settings/TrackSwitcher`
- **Purpose:** Choose the active track.
- **Interface:** `value: TrackId; tracks: TrackSummary[]`
- **States:** per track
- **Libraries:** SegmentedControl
- **Notes:** Reads labels from the registry. Never hard-coded.

### DirectionSwitcher

- **File:** `apps/web/src/domain/settings/DirectionSwitcher`
- **Purpose:** Switch Docket, Switchboard or Relay (design route only).
- **Interface:** `value: Direction`
- **States:** per direction
- **Libraries:** SegmentedControl
- **Notes:** Sets data-dir on <html>.

### AuditLogRow

- **File:** `apps/web/src/domain/run/AuditLogRow`
- **Purpose:** One line in the audit log.
- **Interface:** `event: RunEvent | HumanDecision`
- **States:** default
- **Libraries:** RelativeTime, Mono
- **Notes:** Read-only.

## Layout · apps/web/src/layout

### AppShell

- **File:** `apps/web/src/layout/AppShell`
- **Purpose:** Nav, list, detail and decision panes.
- **Interface:** `nav; list; detail; aside?`
- **States:** 3-pane (≥1120), 2-pane, stacked (<860)
- **Libraries:** CSS grid
- **Notes:** Has a skip link. Each pane is a landmark with a label.

### TopNav

- **File:** `apps/web/src/layout/TopNav`
- **Purpose:** Brand, live mascot, tabs with counts, search, avatar.
- **Interface:** `counts; activeRun?`
- **States:** default, run active
- **Libraries:** Mascot, Count
- **Notes:** Mascot reflects the most recent live run.

### CommandPalette

- **File:** `apps/web/src/layout/CommandPalette`
- **Purpose:** Jump to a case, run the agent, switch track.
- **Interface:** `open; onOpenChange`
- **States:** closed, open, results, empty
- **Libraries:** cmdk, Dialog
- **Notes:** Opens with / or ⌘K. Results grouped: cases, actions, tracks.

### PaneHeader

- **File:** `apps/web/src/layout/PaneHeader`
- **Purpose:** Title row at the top of a pane.
- **Interface:** `title; eyebrow?; actions?`
- **States:** default, sticky
- **Libraries:** —
- **Notes:** Sticky inside its pane.

### SectionHeader

- **File:** `apps/web/src/layout/SectionHeader`
- **Purpose:** Heading plus one-line description inside a page.
- **Interface:** `title; description?; actions?`
- **States:** default
- **Libraries:** —
- **Notes:** —

## Routes · apps/web/src/app + src/features

### /inbox

- **File:** `apps/web/src/app/(app)/inbox → src/features/inbox`
- **Purpose:** Case list with the selected case’s detail.
- **Interface:** `?status=&track=`
- **States:** loading, empty, selected
- **Libraries:** CaseList, RunTrace, DecisionPanel
- **Notes:** The default route. Server Component page; the trace and controls are client components.

### /cases/[ref]

- **File:** `apps/web/src/app/(app)/cases/[ref] → src/features/case`
- **Purpose:** Deep link to one case.
- **Interface:** `ref`
- **States:** loading, not found, loaded
- **Libraries:** same as inbox
- **Notes:** Same layout as inbox with the list collapsed on mobile.

### /runs

- **File:** `apps/web/src/app/(app)/runs → src/features/live-runs`
- **Purpose:** Every running agent as a small live trace.
- **Interface:** `—`
- **States:** idle, active
- **Libraries:** RunTrace (compact)
- **Notes:** Switchboard direction shows this best.

### /escalations

- **File:** `apps/web/src/app/(app)/escalations → src/features/escalations`
- **Purpose:** Queue of HandoverCards sorted by deadline.
- **Interface:** `?queue=`
- **States:** empty, list
- **Libraries:** HandoverCard
- **Notes:** Clearing the queue shows a done-state mascot.

### /reality

- **File:** `apps/web/src/app/(app)/reality → src/features/reality`
- **Purpose:** Run a batch and review results.
- **Interface:** `—`
- **States:** idle, running, complete
- **Libraries:** BatchRunControl, RealityMeter
- **Notes:** Batch view is a client component.

### /tools

- **File:** `apps/web/src/app/(app)/tools → src/features/tools`
- **Purpose:** Tool registry and health.
- **Interface:** `—`
- **States:** default
- **Libraries:** ToolHealthRow
- **Notes:** Server Component.

### /design

- **File:** `apps/web/src/app/design → src/features/design`
- **Purpose:** Every token and component in every state.
- **Interface:** `?dir=`
- **States:** default
- **Libraries:** all
- **Notes:** Mirrors this artifact. Hidden from nav.

## Hooks and lib · apps/web/src/lib

### useRunStream

- **File:** `apps/web/src/lib/sse.ts`
- **Purpose:** Subscribe to a run’s events and reduce them.
- **Interface:** `(runId) → { view: RunView; status; error }`
- **States:** connecting, open, reconnecting, closed
- **Libraries:** zod
- **Notes:** Parses every event; ignores unknown types with a console warning. Resumes with Last-Event-ID.

### useCases

- **File:** `apps/web/src/lib/queries.ts`
- **Purpose:** Cases for the active track.
- **Interface:** `(filters) → Query<Case[]>`
- **States:** loading, success, error
- **Libraries:** @tanstack/react-query
- **Notes:** staleTime 30s. Invalidated by run.completed and human.decided.

### useDecide

- **File:** `apps/web/src/lib/queries.ts`
- **Purpose:** Record a human decision.
- **Interface:** `() → Mutation<HumanDecision>`
- **States:** idle, pending, success, error
- **Libraries:** @tanstack/react-query
- **Notes:** Optimistic status update, rolled back on error.

### useUi

- **File:** `apps/web/src/state/ui.ts`
- **Purpose:** Direction, track, autonomy.
- **Interface:** `() → { direction, track, autonomy, set… }`
- **States:** n/a
- **Libraries:** zustand persist
- **Notes:** Persisted to localStorage with try/catch.

### useHotkeys

- **File:** `apps/web/src/lib/hotkeys.ts`
- **Purpose:** Keyboard shortcuts.
- **Interface:** `(map: Record<string, fn>)`
- **States:** n/a
- **Libraries:** —
- **Notes:** j/k move, / search, e open handover, r replay. Ignored inside inputs.

### useReducedMotion

- **File:** `apps/web/src/lib/motion.ts`
- **Purpose:** Whether to skip animation.
- **Interface:** `() → boolean`
- **States:** n/a
- **Libraries:** motion
- **Notes:** Mascot, stamp and waveform read this.

### format

- **File:** `apps/web/src/lib/format.ts`
- **Purpose:** money, duration, relative time, ref helpers.
- **Interface:** `money(pence), duration(ms), ago(iso)`
- **States:** n/a
- **Libraries:** Intl
- **Notes:** Pure functions with unit tests.

### api client

- **File:** `apps/web/src/lib/api.ts`
- **Purpose:** Typed fetch for every route.
- **Interface:** `api.cases.list(), api.runs.start()…`
- **States:** n/a
- **Libraries:** zod
- **Notes:** Parses responses with the shared schemas.

### mocks

- **File:** `apps/web/src/mocks`
- **Purpose:** msw handlers, including an SSE replayer.
- **Interface:** `replays tracks/*/fixtures/*.jsonl`
- **States:** n/a
- **Libraries:** msw
- **Notes:** Lets UI work start before the API exists.

## Server · packages/core, packages/tracks, apps/web/src/app/api, apps/cli

### schema

- **File:** `packages/core/src/schema`
- **Purpose:** Case, Source, RunEvent, Handover, Money.
- **Interface:** `zod objects + inferred types`
- **States:** n/a
- **Libraries:** zod
- **Notes:** Single source of truth. Converted to JSON Schema for Claude tools.

### agent/loop

- **File:** `packages/core/src/agent/loop.ts`
- **Purpose:** Runs one case: triage, tool-use loop, decision, handover.
- **Interface:** `runCase(case, pack, { autonomy, emit, signal }) → Outcome`
- **States:** n/a
- **Libraries:** @anthropic-ai/sdk
- **Notes:** Max 12 turns. Never throws: errors become events, then escalation.

### agent/triage

- **File:** `packages/core/src/agent/triage.ts`
- **Purpose:** Summarises and tags each source with the fast model.
- **Interface:** `triage(sources) → SourceSummary[]`
- **States:** n/a
- **Libraries:** @anthropic-ai/sdk
- **Notes:** Cached per source hash.

### agent/guard

- **File:** `packages/core/src/agent/guard.ts`
- **Purpose:** Checks every tool call against policy before it runs.
- **Interface:** `guard(call, policy, autonomy) → allow | block(ruleId)`
- **States:** n/a
- **Libraries:** —
- **Notes:** Blocked calls emit action.blocked and return an explanatory error to the model.

### agent/retry

- **File:** `packages/core/src/agent/retry.ts`
- **Purpose:** Timeout, backoff and idempotency for tools.
- **Interface:** `withRetry(tool, { attempts: 3, timeoutMs })`
- **States:** n/a
- **Libraries:** p-retry
- **Notes:** Emits tool.failed for every failed attempt.

### agent/decide

- **File:** `packages/core/src/agent/decide.ts`
- **Purpose:** Final structured decision.
- **Interface:** `decide(context) → { outcome, confidence, rationale, citations }`
- **States:** n/a
- **Libraries:** @anthropic-ai/sdk
- **Notes:** Structured output validated with zod.

### agent/handover

- **File:** `packages/core/src/agent/handover.ts`
- **Purpose:** Builds the Handover for escalations.
- **Interface:** `buildHandover(context) → Handover`
- **States:** n/a
- **Libraries:** @anthropic-ai/sdk
- **Notes:** Rejects facts that cite unknown sources and asks the model again once.

### run/view

- **File:** `packages/core/src/run/view.ts`
- **Purpose:** Pure reducer from events to what screens and ANSWERS show.
- **Interface:** `runView(events) → RunView`
- **States:** n/a
- **Libraries:** —
- **Notes:** Shared by web and the ANSWERS writer. Most heavily tested file.

### run/mascot

- **File:** `packages/core/src/run/mascot.ts`
- **Purpose:** Maps the latest event to a mascot state.
- **Interface:** `mascotFor(event) → MascotState`
- **States:** n/a
- **Libraries:** —
- **Notes:** Pure, shared.

### answers/render

- **File:** `packages/core/src/answers/render.ts`
- **Purpose:** Writes ANSWER.md and REASONING.md from a RunView.
- **Interface:** `render(view, case) → { answer, reasoning }`
- **States:** n/a
- **Libraries:** —
- **Notes:** Covers all six things the rules ask for: received, actions, outputs, escalated, failed, final result.

### store/events

- **File:** `apps/web/src/server/db.ts`
- **Purpose:** Append-only event table and run lookups.
- **Interface:** `append(event), list(runId, afterSeq?)`
- **States:** n/a
- **Libraries:** drizzle-orm, better-sqlite3
- **Notes:** WAL mode. Exported to trace.jsonl per case.

### api/runs

- **File:** `apps/web/src/app/api/runs`
- **Purpose:** Start a run and stream its events.
- **Interface:** `POST /api/runs · GET /api/runs/[id]/events`
- **States:** n/a
- **Libraries:** ReadableStream (SSE)
- **Notes:** Heartbeat every 15s. Resumes from Last-Event-ID.

### api/decisions

- **File:** `apps/web/src/app/api/cases/[ref]/decisions`
- **Purpose:** Record a human decision.
- **Interface:** `POST /api/cases/[ref]/decisions`
- **States:** n/a
- **Libraries:** zod
- **Notes:** Emits human.decided.

### api/voice

- **File:** `apps/web/src/app/api/voice`
- **Purpose:** ElevenLabs session and server tools.
- **Interface:** `POST /api/voice/session · POST /api/voice/tools/[name]`
- **States:** n/a
- **Libraries:** @elevenlabs/elevenlabs-js
- **Notes:** Voice tools call the same guarded pack tools as text runs.

### cli/reality

- **File:** `apps/cli/src/reality.ts`
- **Purpose:** Runs the unseen Reality Test batch unattended.
- **Interface:** `--track --in --out --concurrency`
- **States:** n/a
- **Libraries:** p-limit, pino
- **Notes:** Writes each case’s folder as soon as it finishes. Prints a summary table.

### cli/replay

- **File:** `apps/cli/src/replay.ts`
- **Purpose:** Re-emits a stored run for demos and UI work.
- **Interface:** `replay <runId> [--speed 2]`
- **States:** n/a
- **Libraries:** —
- **Notes:** No model calls.

### TrackPack

- **File:** `packages/tracks/src/<track>`
- **Purpose:** Loader, tools, policy, prompt and vocabulary for one track.
- **Interface:** `export const pack: TrackPack`
- **States:** n/a
- **Libraries:** zod
- **Notes:** Copy an existing pack to add a track. Has its own test suite.
