'use client';

import type { CaseStatus, MascotState, TrackId } from '@casework/core';
import { TRACK_META } from '@casework/tracks/meta';
import { useMemo, useState } from 'react';
import { CallTranscript, CaseHeader, CaseList, CaseListItem, Citation, SlaTimer, SourceChip, SourcesProvider, SourceViewer } from '@/domain/case';
import { FactList, HandoverCard, HumanDecisionRecord, OptionList, TriedList } from '@/domain/handover';
import { Mascot, MASCOT_NAME } from '@/domain/mascot';
import { BatchRunControl, EvalScoreboard, RealityCaseRow, RealityMeter } from '@/domain/reality';
import { AssessmentPanel, AuditLogRow, BlockedAction, ConfidenceMeter, DecisionPanel, OutcomeStamp, PipelineStrip, RetryBadge, RunTrace, ToolCallBlock, TraceStep } from '@/domain/run';
import { AutonomyControl, DirectionSwitcher, PolicyLimitField, TrackSwitcher } from '@/domain/settings';
import { CutComparison, HistoryTimeline, Scorecard, VerdictChip } from '@/domain/timeline';
import { ToolHealthRow } from '@/domain/tools';
import { VoiceCallCard, Waveform } from '@/domain/voice';
import { PaneHeader, SectionHeader } from '@/layout';
import { useUi } from '@/state/ui';
import {
  Avatar, Button, CopyButton, Count, Dialog, Divider, DurationText, EmptyState, ErrorState, Eyebrow, Icon, IconButton, ICONS, Input, JsonView, Kbd, KeyValue,
  Menu, MoneyInput, MoneyText, Mono, Popover, ProgressBar, RelativeTime, ScrollArea, SegmentedControl, Select, Sheet, Skeleton, Spinner, StatusChip, Surface,
  Switch, TabPanel, Tabs, Textarea, toast, Tooltip, VisuallyHidden, type IconName,
} from '@/ui';
import { samples } from './samples';

const MASCOT_STATES: [MascotState, string, string][] = [
  ['idle', 'Idle', 'Watching the inbox'],
  ['think', 'Thinking', 'Reading sources'],
  ['act', 'Acting', 'Calling a tool'],
  ['fail', 'Recovering', 'A tool failed, retrying'],
  ['esc', 'Hand up', 'A person needs to decide'],
  ['done', 'Done', 'Case closed'],
];
const SWATCHES = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'line', 'line-strong', 'accent', 'accent-soft', 'ok', 'hold', 'info', 'bad', 'neutral'];
const STATUSES: CaseStatus[] = ['new', 'running', 'resolved', 'escalated', 'needs_info', 'failed', 'blocked'];
/** Fixed clock for time-based samples, so server and client render the same text. */
const NOW = Date.parse('2026-10-10T12:00:00Z');

const LAYERS = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'primitives', label: 'Primitives' },
  { id: 'layout', label: 'Layout' },
  { id: 'case', label: 'Case' },
  { id: 'run', label: 'Run' },
  { id: 'handover', label: 'Handover' },
  { id: 'timeline', label: 'Step-through' },
  { id: 'settings', label: 'Settings' },
  { id: 'reality', label: 'Reality and eval' },
  { id: 'tools', label: 'Tools' },
  { id: 'voice', label: 'Voice' },
];

/** One component with a caption for each state shown. */
function Spec({ name, file, children, wide }: { name: string; file: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <article className={wide ? 'grid gap-3 lg:col-span-2' : 'grid content-start gap-3'} aria-label={name}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-(length:--bw) border-line pb-1.5">
        <h3 className="text-[15px] font-bold">{name}</h3>
        <Mono muted className="text-[11px]">{file}</Mono>
      </div>
      {children}
    </article>
  );
}

const State = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid content-start gap-1.5">
    <Eyebrow>{label}</Eyebrow>
    {children}
  </div>
);

function Layer({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-28 gap-6">
      <SectionHeader id={`${id}-h`} title={title} description={description} />
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Every token and component in every state its catalogue entry lists (docs/plan/05-components.md).
 * Switch direction and track at the top; samples take their labels from the track's vocabulary.
 */
export function DesignView() {
  const direction = useUi((s) => s.direction);
  const [track, setTrack] = useState<TrackId>(useUi.getState().track);
  const v = TRACK_META[track].vocabulary;
  const s = useMemo(() => samples(v), [v]);

  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [tab, setTab] = useState('email');
  const [sw, setSw] = useState(true);
  const [sel, setSel] = useState('ask');
  const [pence, setPence] = useState(42_000);
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [autonomy, setAutonomy] = useState(useUi.getState().autonomy);
  const [activeSource, setActiveSource] = useState(s.sources[1]!.id);
  const [chosen, setChosen] = useState<string>();

  return (
    <SourcesProvider sources={s.sources} open={setActiveSource}>
      <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-24 pt-8 sm:px-6">
        <header className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <Eyebrow>Design reference</Eyebrow>
              <h1 className="text-4xl font-bold tracking-tight">Casework design system</h1>
              <p className="max-w-prose text-sm text-ink-2">
                Every primitive and domain component in each state its catalogue entry lists. Mascot: {MASCOT_NAME[direction]}. Full visual reference: docs/design/casework-design-directions.html.
              </p>
            </div>
            <div className="grid gap-3 sm:justify-items-end">
              <DirectionSwitcher />
              <div className="w-56">
                <TrackSwitcher value={track} onChange={setTrack} />
              </div>
            </div>
          </div>
          <nav aria-label="Layers" className="flex flex-wrap gap-1.5">
            {LAYERS.map((l) => (
              <a key={l.id} href={`#${l.id}`} className="rounded-ui border-(length:--bw) border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-2 hover:border-line-strong hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>
        </header>

        {/* ------------------------------------------------------------ foundations */}
        <Layer id="foundations" title="Foundations" description="Colour, type and the mascot. Status colours mean the same thing in every direction and always come with text.">
          <Spec name="Colour tokens" file="tokens/<direction>.css" wide>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
              {SWATCHES.map((t) => (
                <div key={t} className="grid gap-1.5 text-xs">
                  <i className="block h-12 rounded-ui border-(length:--bw) border-line" style={{ background: `var(--${t})` }} />
                  <code className="font-mono text-ink-2">--{t}</code>
                </div>
              ))}
            </div>
          </Spec>
          <Spec name="Type" file="--font-d · --font-b · --font-m" wide>
            <div className="grid gap-3">
              <p className="font-display text-4xl font-bold tracking-tight">Leak under the kitchen sink</p>
              <p className="max-w-prose">The {v.customer.toLowerCase()} reported a leak. The agent sent the quote to the owner and is waiting for approval before booking anyone.</p>
              <p className="font-mono text-[13px]">owner.send_quote(&#123;channel:&quot;email&quot;&#125;) · 1.2s · S-1</p>
            </div>
          </Spec>
          <Spec name={`Mascot · ${MASCOT_NAME[direction]}`} file="domain/mascot" wide>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {MASCOT_STATES.map(([st, name, desc]) => (
                <div key={st} className="grid justify-items-center gap-1 rounded-ui-lg border-(length:--bw) border-line bg-surface p-4 text-center shadow-ui">
                  <Mascot state={st} size={80} />
                  <b className="text-[13.5px]">{name}</b>
                  <span className="text-xs text-ink-2">{desc}</span>
                </div>
              ))}
            </div>
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ primitives */}
        <Layer id="primitives" title="Primitives" description="apps/web/src/ui. Tokens only; each one works in all three directions.">
          <Spec name="Button" file="ui/Button">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon="play">Run agent</Button>
              <Button>Ask for info</Button>
              <Button variant="ghost">Override</Button>
              <Button variant="danger">Stop run</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" loading>Calling tool…</Button>
              <Button size="sm" disabled>Disabled</Button>
              <Button size="sm" className="outline-2 outline-offset-2 outline-accent">Focus</Button>
            </div>
          </Spec>
          <Spec name="IconButton · Tooltip" file="ui/IconButton · ui/Tooltip">
            <div className="flex flex-wrap items-center gap-2">
              <IconButton icon="retry" label="Run again" />
              <IconButton icon="copy" label="Copy ref" variant="secondary" />
              <IconButton icon="x" label="Disabled" disabled />
              <Tooltip content="Hover or focus shows the hint">
                <Button size="sm">Hover me</Button>
              </Tooltip>
            </div>
          </Spec>
          <Spec name="Icon" file="ui/Icon">
            <div className="flex flex-wrap gap-3 text-ink-2">
              {(Object.keys(ICONS) as IconName[]).map((n) => (
                <span key={n} className="grid justify-items-center gap-1 text-[10.5px]">
                  <Icon name={n} size={20} />
                  {n}
                </span>
              ))}
            </div>
          </Spec>
          <Spec name="StatusChip" file="ui/StatusChip">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((st) => <StatusChip key={st} status={st} />)}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((st) => <StatusChip key={st} status={st} size="sm" />)}
            </div>
          </Spec>
          <Spec name="Count · Kbd · Avatar" file="ui/Count · ui/Kbd · ui/Avatar">
            <div className="flex flex-wrap items-center gap-3">
              <State label="zero (hidden)"><span className="text-sm">Tab <Count value={0} /></span></State>
              <State label="normal"><span className="text-sm">Tab <Count value={7} /></span></State>
              <State label="overflow"><span className="text-sm">Tab <Count value={240} tone="accent" /></span></State>
              <State label="kbd"><Kbd keys={['⌘', 'K']} /></State>
              <State label="avatar"><span className="flex gap-1.5"><Avatar name="Sam Patel" /><Avatar name="Agent" kind="agent" /></span></State>
            </div>
          </Spec>
          <Spec name="Eyebrow · Mono · Divider" file="ui/Eyebrow · ui/Mono · ui/Divider">
            <div className="flex flex-wrap gap-4">
              <Eyebrow>Muted</Eyebrow>
              <Eyebrow tone="accent">Accent</Eyebrow>
              <Eyebrow tone="bad">Bad</Eyebrow>
            </div>
            <p className="text-sm">Ref <Mono>PM-007:event-12</Mono> and <Mono muted>muted mono</Mono></p>
            <Divider />
            <Divider strong />
          </Spec>
          <Spec name="Surface" file="ui/Surface">
            <div className="grid gap-3 sm:grid-cols-2">
              <Surface>Default</Surface>
              <Surface tone="sunken">Sunken</Surface>
              <Surface interactive tabIndex={0}>Interactive (hover)</Surface>
              <Surface selected>Selected</Surface>
            </div>
          </Spec>
          <Spec name="Input · MoneyInput · Textarea" file="ui/Input · ui/MoneyInput · ui/Textarea">
            <Input label="Search" prefix="search" placeholder="Ref or name" />
            <Input label="With an error" defaultValue="abc" error="Enter a ref like PM-007" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Disabled" disabled defaultValue="Locked" />
              <Input label="Read only" readOnly defaultValue="PM-007" />
            </div>
            <MoneyInput label="Spend limit" valuePence={pence} onChange={setPence} hint="Accepts 420, £420 or 420.00" />
            <Textarea label="Note on your decision" maxLength={120} defaultValue="Approved after checking the photos with the owner on the phone." />
          </Spec>
          <Spec name="Select · Switch · SegmentedControl" file="ui/Select · ui/Switch · ui/SegmentedControl">
            <Select label="Queue" value={sel} onChange={setSel} options={[{ value: 'ask', label: 'Ask first' }, { value: 'urgent', label: 'Urgent' }, { value: 'later', label: 'Later' }]} />
            <Select label="Disabled" value="ask" onChange={() => {}} disabled options={[{ value: 'ask', label: 'Ask first' }]} />
            <Switch label="Answer calls with the voice agent" description="Off until voice keys are set" checked={sw} onCheckedChange={setSw} />
            <Switch label="Disabled" checked={false} onCheckedChange={() => {}} disabled />
            <SegmentedControl label="Sample" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }, { value: 'c', label: 'Three' }]} />
          </Spec>
          <Spec name="Tabs" file="ui/Tabs">
            <Tabs label="Sources" value={tab} onChange={setTab} items={[{ value: 'email', label: 'Email', count: 3 }, { value: 'call', label: 'Call' }, { value: 'doc', label: 'Documents', count: 1 }]}>
              <TabPanel value="email"><p className="text-sm text-ink-2">Email panel</p></TabPanel>
              <TabPanel value="call"><p className="text-sm text-ink-2">Call panel</p></TabPanel>
              <TabPanel value="doc"><p className="text-sm text-ink-2">Documents panel</p></TabPanel>
            </Tabs>
          </Spec>
          <Spec name="Popover · Menu · Dialog · Sheet" file="ui/Popover · ui/Menu · ui/Dialog · ui/Sheet">
            <div className="flex flex-wrap gap-2">
              <Popover trigger={<Button size="sm">Popover</Button>}>
                <p>Rich content anchored to its trigger.</p>
              </Popover>
              <Menu label="More actions" trigger={<Button size="sm">Menu</Button>} items={[{ label: 'Copy ref', onSelect: () => {} }, { label: 'Disabled', onSelect: () => {}, disabled: true }, { label: 'Stop run', onSelect: () => {}, danger: true }]} />
              <Button size="sm" onClick={() => setDialog(true)}>Dialog</Button>
              <Button size="sm" onClick={() => setSheet(true)}>Sheet</Button>
            </div>
            <Dialog
              open={dialog}
              onOpenChange={setDialog}
              title="Approve £420?"
              description="This books the contractor. It can’t be undone from here."
              footer={<><Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button><Button variant="primary" onClick={() => setDialog(false)}>Approve £420</Button></>}
            />
            <Sheet open={sheet} onOpenChange={setSheet} title="Event 1 · Email">
              <p className="text-sm">The source viewer sits here on narrow screens.</p>
            </Sheet>
          </Spec>
          <Spec name="Toaster" file="ui/Toaster">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => toast.success('Next step taken', { description: 'owner.send_quote → Owner' })}>Completed</Button>
              <Button size="sm" onClick={() => toast.warning('Handed to a person', { description: s.handover.reason })}>Escalated</Button>
              <Button size="sm" onClick={() => toast.error('Tool failed', { description: 'Mail gateway timed out after 3 attempts' })}>Failed</Button>
            </div>
          </Spec>
          <Spec name="Skeleton · Spinner · ProgressBar" file="ui/Skeleton · ui/Spinner · ui/ProgressBar">
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton lines={3} />
              <Skeleton variant="row" />
            </div>
            <Skeleton variant="block" className="h-12" />
            <div className="flex items-center gap-3 text-sm"><Spinner size={12} /> <Spinner /> Spinning</div>
            <State label="empty"><ProgressBar value={0} max={10} label="Empty" /></State>
            <State label="partial"><ProgressBar value={6} max={10} label="Partial" /></State>
            <State label="complete"><ProgressBar value={10} max={10} label="Complete" /></State>
          </Spec>
          <Spec name="EmptyState · ErrorState" file="ui/EmptyState · ui/ErrorState">
            <Surface padded={false}><EmptyState mascot="done" title="Nothing waiting for a person" body="Handovers appear here with the facts and options." /></Surface>
            <ErrorState error={{ title: `Couldn’t load the ${v.cases.toLowerCase()}`, detail: 'The case folder is missing. Check DATA_DIR in .env.' }} onRetry={() => {}} />
            <ErrorState error={{ title: 'Retrying', detail: 'Shown while a retry is in flight.' }} onRetry={() => {}} retrying />
          </Spec>
          <Spec name="KeyValue · CopyButton" file="ui/KeyValue · ui/CopyButton">
            <KeyValue items={[{ label: v.customer, value: 'Sam Patel' }, { label: 'Ref', value: 'PM-007', mono: true }, { label: 'Limit', value: <MoneyText pence={30_000} /> }]} />
            <KeyValue columns={2} items={[{ label: 'Steps', value: '9', mono: true }, { label: 'Tokens', value: '5,840', mono: true }]} />
            <CopyButton value="PM-007" label="Copy ref" />
          </Spec>
          <Spec name="RelativeTime · MoneyText · DurationText" file="ui/RelativeTime · ui/MoneyText · ui/DurationText">
            <p className="flex flex-wrap gap-4 text-sm">
              <RelativeTime at={s.at(0)} />
              <RelativeTime at={s.at(0)} absolute />
              <MoneyText pence={124_900} />
              <MoneyText pence={-4_200} />
              <MoneyText pence={4_200} signed />
              <DurationText ms={820} />
              <DurationText ms={12_400} />
              <DurationText ms={372_000} />
            </p>
          </Spec>
          <Spec name="JsonView · ScrollArea · VisuallyHidden" file="ui/JsonView · ui/ScrollArea · ui/VisuallyHidden">
            <State label="collapsed / expanded / truncated">
              <JsonView value={{ channel: 'email', citations: ['S-1:quote.pdf'], message: 'Please approve the attached quote. '.repeat(9), nested: { a: 1, b: [true, null] } }} />
            </State>
            <ScrollArea className="h-24 rounded-ui border-(length:--bw) border-line" label="Scrolling sample">
              <div className="grid gap-1 p-3 text-sm">{Array.from({ length: 12 }, (_, i) => <span key={i}>Row {i + 1}</span>)}</div>
            </ScrollArea>
            <p className="text-sm">Visible text<VisuallyHidden> and text only screen readers hear</VisuallyHidden>.</p>
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ layout */}
        <Layer id="layout" title="Layout" description="apps/web/src/layout. The top nav and command palette are live at the top of every app page (press / or ⌘K).">
          <Spec name="PaneHeader" file="layout/PaneHeader">
            <Surface padded={false} className="overflow-hidden">
              <PaneHeader sticky={false} eyebrow={v.cases} title="Inbox" actions={<Button size="sm">Filter</Button>} />
              <p className="p-4 text-sm text-ink-2">Sticky inside its pane in the app.</p>
            </Surface>
          </Spec>
          <Spec name="SectionHeader" file="layout/SectionHeader">
            <SectionHeader title="How a run works" description="One line that says what this section is for." actions={<Button size="sm">Action</Button>} />
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ case */}
        <Layer id="case" title={`${v.case} components`} description="apps/web/src/domain/case. Sources, citations and the inbox.">
          <Spec name="CaseHeader · SlaTimer" file="domain/case/CaseHeader · SlaTimer">
            <CaseHeader c={{ ref: 'S-1', title: 'Leak under the kitchen sink', customer: { name: 'Sam Patel' }, status: 'escalated' }} />
            <div className="flex flex-wrap gap-3">
              <State label="ok"><SlaTimer now={NOW} dueAt={new Date(NOW + 5 * 3_600_000).toISOString()} /></State>
              <State label="warn"><SlaTimer now={NOW} dueAt={new Date(NOW + 40 * 60_000).toISOString()} /></State>
              <State label="overdue"><SlaTimer now={NOW} dueAt={new Date(NOW - 12 * 60_000).toISOString()} /></State>
            </div>
          </Spec>
          <Spec name="CaseListItem" file="domain/case/CaseListItem">
            {(['default', 'selected', 'unread', 'SLA warning'] as const).map((st, i) => (
              <State key={st} label={st}>
                <CaseListItem
                  c={{ ref: `S-${i + 1}`, track, title: 'Leak under the kitchen sink', customer: { name: 'Sam Patel' }, status: (['new', 'running', 'escalated', 'resolved'] as const)[i]!, channel: 'email', updatedAt: s.at(10) }}
                  selected={st === 'selected'}
                  unread={st === 'unread'}
                  slaWarning={st === 'SLA warning'}
                />
              </State>
            ))}
          </Spec>
          <Spec name="CaseList" file="domain/case/CaseList">
            <State label="list">
              <div className="h-72 overflow-auto rounded-ui border-(length:--bw) border-line">
                <CaseList
                  noun={v.cases}
                  label={v.cases}
                  selectedRef="S-2"
                  cases={[1, 2, 3, 4].map((i) => ({ ref: `S-${i}`, track, title: ['Leak under the sink', 'Broken boiler', 'Garden overgrown', 'Key safe missing'][i - 1]!, customer: { name: v.customer }, status: (['new', 'escalated', 'resolved', 'needs_info'] as const)[i - 1]!, channel: 'email' as const, updatedAt: s.at(i) }))}
                />
              </div>
            </State>
            <State label="loading / empty">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="h-40 overflow-hidden rounded-ui border-(length:--bw) border-line"><CaseList noun={v.cases} label={v.cases} cases={[]} loading /></div>
                <div className="h-40 overflow-hidden rounded-ui border-(length:--bw) border-line"><CaseList noun={v.cases} label={v.cases} cases={[]} /></div>
              </div>
            </State>
          </Spec>
          <Spec name="SourceChip · Citation" file="domain/case/SourceChip · Citation">
            <div className="flex flex-wrap gap-2">
              {s.sources.slice(0, 4).map((src, i) => (
                <SourceChip key={src.id} source={src} onOpen={setActiveSource} cited={i === 1} active={src.id === activeSource} />
              ))}
            </div>
            <p className="text-sm">
              The quote was £180 <Citation sourceId="S-1:quote.pdf" /> and the owner was called <Citation sourceId="S-1:event-2" />.
            </p>
          </Spec>
          <Spec name="SourceViewer (email · call · document · record · ticket · message)" file="domain/case/SourceViewer" wide>
            <div className="flex flex-wrap gap-2">
              {s.sources.map((src) => (
                <SourceChip key={src.id} source={src} onOpen={setActiveSource} active={src.id === activeSource} />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <State label="active source, highlighted"><SourceViewer sources={s.sources} activeId={activeSource} highlight={{ sourceId: activeSource }} /></State>
              <State label="loading"><SourceViewer sources={[]} loading /></State>
            </div>
          </Spec>
          <Spec name="CallTranscript" file="domain/case/views">
            <State label="static"><CallTranscript turns={s.call.turns} /></State>
            <State label="playing (active turn)"><CallTranscript turns={s.call.turns} activeIndex={1} /></State>
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ run */}
        <Layer id="run" title="Run components" description="apps/web/src/domain/run. All views of the shared RunView reducer, live or replayed.">
          <Spec name="PipelineStrip" file="domain/run/PipelineStrip" wide>
            <State label="running"><PipelineStrip view={s.running} /></State>
            <State label="resolved"><PipelineStrip view={s.resolved} /></State>
            <State label="escalated"><PipelineStrip view={s.escalated} /></State>
          </Spec>
          <Spec name="RunTrace" file="domain/run/RunTrace">
            <State label="running"><RunTrace view={s.running} mode="live" /></State>
            <State label="empty"><RunTrace view={{ ...s.running, steps: [] }} empty={<p className="text-sm text-ink-2">Run the agent to see its steps.</p>} /></State>
          </Spec>
          <Spec name="RunTrace · complete" file="domain/run/RunTrace">
            <RunTrace view={s.escalated} />
          </Spec>
          <Spec name="TraceStep" file="domain/run/TraceStep">
            <ol className="grid">
              <TraceStep kind="read" title="Read 6 sources" detail="Stage: Waiting for approval" at={s.at(1)} state="done" offsetMs={400} />
              <TraceStep kind="tool" title="owner.send_quote" detail="Calling…" at={s.at(2)} state="active" call={s.running.toolCalls[0]} />
              <TraceStep kind="fail" title="owner.send_quote failed" detail="Mail gateway timed out · retrying" at={s.at(3)} attempt={1} />
              <TraceStep kind="retry" title="Retrying" detail="Attempt 2 of 3" at={s.at(3)} state="pending" />
              <TraceStep kind="blocked" title="Refused: contractor.instruct" detail="No approval on record" at={s.at(4)} />
              <TraceStep kind="decide" title="owner.send_quote" detail="A quote is ready and the owner approves spend first." at={s.at(5)} defaultExpanded />
              <TraceStep kind="escalate" title={`Handed to ${v.handler}`} detail={s.handover.reason} at={s.at(6)} />
              <TraceStep kind="resolve" title="Resolved" detail="Next step taken" at={s.at(7)} />
            </ol>
          </Spec>
          <Spec name="ToolCallBlock · RetryBadge" file="domain/run/ToolCallBlock · RetryBadge">
            <State label="calling"><ToolCallBlock call={s.running.toolCalls[0]!} /></State>
            <State label="retried, then succeeded"><ToolCallBlock call={s.resolved.toolCalls[0]!} /></State>
            <State label="failed"><ToolCallBlock call={s.failedCall} /></State>
            <div className="flex flex-wrap gap-2">
              <RetryBadge attempt={2} state="retrying" />
              <RetryBadge attempt={2} state="recovered" />
              <RetryBadge attempt={3} state="gave_up" />
            </div>
          </Spec>
          <Spec name="ConfidenceMeter · BlockedAction" file="domain/run/ConfidenceMeter · BlockedAction">
            <State label="low"><ConfidenceMeter value={0.32} reasons={['Owner has not replied', 'Two sources disagree on the date']} /></State>
            <State label="medium"><ConfidenceMeter value={0.62} /></State>
            <State label="high"><ConfidenceMeter value={0.88} /></State>
            <BlockedAction action="contractor.instruct" ruleId="policy.instruct_within_quote" why="No approval on record" />
          </Spec>
          <Spec name="OutcomeStamp" file="domain/run/OutcomeStamp">
            <div className="flex flex-wrap items-center gap-6">
              <State label="hidden (running)"><OutcomeStamp /></State>
              {(['resolved', 'escalated', 'needs_info', 'failed', 'declined'] as const).map((o) => (
                <State key={o} label={o}><OutcomeStamp outcome={o} /></State>
              ))}
            </div>
            <State label="revealed (animates once)"><OutcomeStamp outcome="escalated" animateIn key={direction} /></State>
          </Spec>
          <Spec name="DecisionPanel" file="domain/run/DecisionPanel">
            <State label="running"><DecisionPanel view={s.running} /></State>
            <State label="resolved"><DecisionPanel view={s.resolved} context="As of 10 Oct, before event 4" /></State>
          </Spec>
          <Spec name="DecisionPanel · escalated" file="domain/run/DecisionPanel">
            <DecisionPanel view={s.escalated} onOpenHandover={() => {}} />
          </Spec>
          <Spec name="AssessmentPanel" file="domain/run/AssessmentPanel">
            <AssessmentPanel assessment={s.assessment} />
          </Spec>
          <Spec name="AuditLogRow" file="domain/run/AuditLogRow">
            <ul>
              <AuditLogRow event={{ runId: 'sample-run', seq: 0, at: s.at(100), type: 'run.started', caseRef: 'S-1', autonomy: 'ask_first' }} />
              <AuditLogRow event={{ runId: 'sample-run', seq: 6, at: s.at(101), type: 'action.blocked', action: 'contractor.instruct', ruleId: 'policy.instruct_within_quote', why: 'No approval' }} />
              <AuditLogRow event={{ caseRef: 'S-1', runId: 'sample-run', optionId: 'approve', decidedBy: 'Operator', at: s.at(120), note: 'Checked photos' }} />
            </ul>
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ handover */}
        <Layer id="handover" title="Handover" description="apps/web/src/domain/handover. The card must make sense with no other screen open.">
          <Spec name="HandoverCard · open" file="domain/handover/HandoverCard" wide>
            <HandoverCard handover={s.handover} caseRef="S-1" caseTitle="Leak under the kitchen sink" runId="sample-run" />
          </Spec>
          <Spec name="HandoverCard · decided" file="domain/handover/HandoverCard" wide>
            <HandoverCard handover={s.handover} caseRef="S-1" caseTitle="Leak under the kitchen sink" runId="sample-run" decision={{ caseRef: 'S-1', runId: 'sample-run', optionId: 'ask', decidedBy: 'Operator', at: s.at(130), note: 'Need photos before approving.' }} />
          </Spec>
          <Spec name="FactList · TriedList" file="domain/handover/FactList · TriedList">
            <FactList facts={s.handover.facts} />
            <TriedList tried={s.handover.tried} />
            <TriedList tried={[]} />
          </Spec>
          <Spec name="OptionList · HumanDecisionRecord" file="domain/handover/OptionList · HumanDecisionRecord">
            <State label="rest / recommended (irreversible asks to confirm)"><OptionList options={s.handover.options} onChoose={(o) => setChosen(o.id)} chosenId={chosen} /></State>
            <State label="disabled"><OptionList options={s.handover.options.slice(1)} onChoose={() => {}} disabled /></State>
            <HumanDecisionRecord decision={{ caseRef: 'S-1', runId: 'sample-run', optionId: 'approve', decidedBy: 'Operator', at: s.at(130), note: 'Owner agreed by phone.' }} optionLabel={s.handover.options[0]!.label} />
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ timeline */}
        <Layer id="timeline" title="Step-through" description="apps/web/src/domain/timeline. Cut the history at any event, see what the agent decides, and compare with what happened next.">
          <Spec name="HistoryTimeline" file="domain/timeline/HistoryTimeline">
            <HistoryTimeline
              events={s.historyEvents}
              labels={s.labels}
              cutBefore={4}
              runsByCut={new Map([[2, s.runSummary({ cut: { cutBefore: 2, asOf: s.at(39) }, next: { action: 'owner.request_approval', recipient: 'Owner', confidence: 0.8, decidedBy: 'model' } })], [4, s.runSummary({ done: false, status: 'running', outcome: undefined, next: undefined, mascot: 'think' })]])}
              onDecide={() => {}}
            />
          </Spec>
          <Spec name="CutComparison · VerdictChip" file="domain/timeline/CutComparison · VerdictChip">
            <div className="flex flex-wrap gap-2">
              {(['accepted', 'missed', 'prohibited', 'unlabelled'] as const).map((x) => <VerdictChip key={x} verdict={x} />)}
            </div>
            <State label="running"><CutComparison cutBefore={4} asOf={s.at(89)} running happened={s.historyEvents[3]} label={s.labels[1]} /></State>
            <State label="decided, accepted">
              <CutComparison cutBefore={4} asOf={s.at(89)} next={{ action: 'owner.send_quote', recipient: 'Owner', reason: 'Quote ready; approval first.', confidence: 0.82, decidedBy: 'model' }} happened={s.historyEvents[3]} label={s.labels[1]} verdict="accepted" />
            </State>
          </Spec>
          <Spec name="Scorecard" file="domain/timeline/Scorecard" wide>
            <Scorecard
              rows={[
                { label: s.labels[0]!, run: s.runSummary({ runId: 'a', next: { action: 'owner.request_approval', recipient: 'Owner', confidence: 0.8, decidedBy: 'model' } }) },
                { label: s.labels[1]!, run: s.runSummary({ runId: 'b', next: { action: 'case.close', recipient: 'Nobody', confidence: 0.4, decidedBy: 'playbook' } }) },
              ]}
              selectedRunId="a"
              onSelect={() => {}}
            />
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ settings */}
        <Layer id="settings" title="Settings" description="apps/web/src/domain/settings.">
          <Spec name="AutonomyControl" file="domain/settings/AutonomyControl">
            <AutonomyControl value={autonomy} onChange={setAutonomy} />
          </Spec>
          <Spec name="PolicyLimitField" file="domain/settings/PolicyLimitField">
            <State label="default"><PolicyLimitField rule={{ id: 'policy.spend_limit', describe: 'Spend without asking up to this amount', appliesTo: ['contractor.instruct'], pence: 30_000 }} /></State>
            <State label="edited (preview only)"><PolicyLimitField state="edited" rule={{ id: 'policy.spend_limit', describe: 'Spend without asking up to this amount', appliesTo: ['contractor.instruct'], pence: 30_000 }} /></State>
          </Spec>
          <Spec name="TrackSwitcher · DirectionSwitcher" file="domain/settings">
            <State label="read-only (nav)"><span className="[&>span]:inline-flex"><TrackSwitcher value={track} /></span></State>
            <State label="editable (design page)"><TrackSwitcher value={track} onChange={setTrack} /></State>
            <DirectionSwitcher />
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ reality */}
        <Layer id="reality" title="Reality Test and eval" description="apps/web/src/domain/reality.">
          <Spec name="RealityMeter" file="domain/reality/RealityMeter">
            <State label="running (cells fill)"><RealityMeter cases={s.batchCases} onOpen={() => {}} /></State>
            <State label="pending"><RealityMeter cases={s.batchCases.map((c) => ({ ...c, status: 'pending', outcome: undefined }))} /></State>
          </Spec>
          <Spec name="RealityCaseRow" file="domain/reality/RealityCaseRow">
            <ul>
              <RealityCaseRow result={{ ref: 'S-1', n: 1, status: 'pending' }} />
              <RealityCaseRow result={{ ref: 'S-2', n: 2, status: 'running' }} />
              <RealityCaseRow result={{ ref: 'S-3', n: 3, status: 'done', outcome: 'resolved', answerPath: 'ANSWERS/3' }} onView={() => {}} />
              <RealityCaseRow result={{ ref: 'S-4', n: 4, status: 'done', outcome: 'escalated' }} />
              <RealityCaseRow result={{ ref: 'S-5', n: 5, status: 'done', outcome: 'failed', error: 'Model call failed: 529 overloaded' }} />
            </ul>
          </Spec>
          <Spec name="BatchRunControl" file="domain/reality/BatchRunControl">
            <State label="idle"><BatchRunControl inputs={['data/challenges', 'data/public']} onStart={() => {}} onCancel={() => {}} /></State>
            <State label="running">
              <BatchRunControl inputs={[]} onStart={() => {}} onCancel={() => {}} batch={{ id: 'b', source: 'ui', dir: 'data/challenges', mode: 'rules', startedAt: s.at(0), concurrency: 6, state: 'running', cases: s.batchCases }} />
            </State>
            <State label="done">
              <BatchRunControl inputs={['data/challenges']} onStart={() => {}} onCancel={() => {}} batch={{ id: 'b', source: 'ui', dir: 'data/challenges', mode: 'rules', startedAt: s.at(0), finishedAt: s.at(3), concurrency: 6, state: 'done', cases: s.batchCases.map((c) => ({ ...c, status: 'done', outcome: c.outcome ?? 'resolved' })) }} />
            </State>
          </Spec>
          <Spec name="EvalScoreboard" file="domain/reality/EvalScoreboard" wide>
            <EvalScoreboard view={s.evalView} refPrefix="S" />
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ tools */}
        <Layer id="tools" title="Tools" description="apps/web/src/domain/tools.">
          <Spec name="ToolHealthRow" file="domain/tools/ToolHealthRow" wide>
            <ul>
              <ToolHealthRow tool={s.tools.healthy} />
              <ToolHealthRow tool={s.tools.degraded} />
              <ToolHealthRow tool={s.tools.down} />
              <ToolHealthRow tool={s.tools.unused} />
            </ul>
          </Spec>
        </Layer>

        {/* ------------------------------------------------------------ voice */}
        <Layer id="voice" title="Voice" description="apps/web/src/domain/voice. Voice needs ElevenLabs keys, so live states are shown here only; recordings play back a transcript.">
          <Spec name="VoiceCallCard · recording" file="domain/voice/VoiceCallCard">
            <VoiceCallCard call={s.call} mode="recording" />
          </Spec>
          <Spec name="VoiceCallCard · live states" file="domain/voice/VoiceCallCard">
            {(['ringing', 'agent_speaking', 'caller_speaking', 'ended'] as const).map((st) => (
              <State key={st} label={st}>
                <VoiceCallCard call={{ ...s.call, turns: st === 'ringing' ? [] : s.call.turns.slice(0, 2), state: st }} mode="live" />
              </State>
            ))}
            <State label="failed"><VoiceCallCard call={{ ...s.call, turns: [], state: 'failed', error: 'Voice session not configured: set ELEVENLABS_API_KEY.' }} mode="live" /></State>
          </Spec>
          <Spec name="Waveform" file="domain/voice/Waveform">
            <State label="idle"><Waveform levels={[0.2, 0.5, 0.8, 0.4, 0.6, 0.3, 0.9, 0.5, 0.2, 0.7, 0.4, 0.6]} /></State>
            <State label="playing"><Waveform levels={[0.2, 0.5, 0.8, 0.4, 0.6, 0.3, 0.9, 0.5, 0.2, 0.7, 0.4, 0.6]} progress={0.5} playing /></State>
            <State label="paused"><Waveform levels={[0.2, 0.5, 0.8, 0.4, 0.6, 0.3, 0.9, 0.5, 0.2, 0.7, 0.4, 0.6]} progress={0.5} /></State>
          </Spec>
        </Layer>
      </div>
    </SourcesProvider>
  );
}
