'use client';

import { useEffect, useState } from 'react';
import type { BatchView, RunMode } from '@/lib/api-types';
import { duration } from '@/lib/format';
import { Button, Dialog, KeyValue, ProgressBar, SegmentedControl, Select, Switch } from '@/ui';

export interface BatchStart {
  dir: string;
  mode: RunMode;
  withhold: 'none' | 'outcomes';
}

/** Start, watch and cancel a batch. Shows concurrency, elapsed time and progress. */
export function BatchRunControl({ batch, inputs, onStart, onCancel, starting, modelConfigured = true }: { batch?: BatchView; inputs: string[]; onStart: (b: BatchStart) => void; onCancel: () => void; starting?: boolean; modelConfigured?: boolean }) {
  const [dir, setDir] = useState(inputs[0] ?? 'data/challenges');
  const [mode, setMode] = useState<RunMode>('rules');
  const [withhold, setWithhold] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Wall clock set after mount (and every second while running), so server and client render the same.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const running = batch?.state === 'running' || batch?.state === 'cancelling';
  useEffect(() => {
    setNowMs(Date.now());
    if (!running) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const done = batch?.cases.filter((c) => c.status === 'done').length ?? 0;
  const total = batch?.cases.length ?? 0;
  const end = batch?.finishedAt ? Date.parse(batch.finishedAt) : nowMs;
  const elapsed = batch?.startedAt && end ? Math.max(0, end - Date.parse(batch.startedAt)) : 0;
  const start = () => onStart({ dir, mode, withhold: withhold ? 'outcomes' : 'none' });

  return (
    <div className="grid gap-4">
      {!running && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Cases folder" value={dir} onChange={setDir} options={inputs.map((i) => ({ value: i, label: i }))} />
          <div className="grid gap-1.5">
            <span className="text-[13px] font-semibold">Decided by</span>
            <SegmentedControl
              label="Decided by"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'rules', label: 'Rules only (free)' },
                { value: 'model', label: 'Model' },
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Switch label="Hide how example cases ended" description="Use this on the public examples so the agent can’t see the outcome. Leave off for the Reality Test folder." checked={withhold} onCheckedChange={setWithhold} />
          </div>
        </div>
      )}
      {batch && (
        <div className="grid gap-2">
          <ProgressBar value={done} max={total} label="Cases finished" />
          <KeyValue
            columns={2}
            items={[
              { label: 'Folder', value: batch.dir, mono: true },
              { label: 'Finished', value: `${done} / ${total}`, mono: true },
              { label: 'Concurrency', value: String(batch.concurrency), mono: true },
              { label: 'Elapsed', value: duration(elapsed), mono: true },
            ]}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {running ? (
          <Button variant="danger" onClick={onCancel} loading={batch?.state === 'cancelling'}>
            {batch?.state === 'cancelling' ? 'Cancelling…' : 'Cancel batch'}
          </Button>
        ) : (
          <Button variant="primary" icon="play" loading={starting} onClick={() => (mode === 'model' ? setConfirm(true) : start())} disabled={mode === 'model' && !modelConfigured}>
            Run batch
          </Button>
        )}
        <p className="self-center text-[12.5px] text-ink-2">Results stay in this session. <code className="font-mono">pnpm reality</code> is what writes ANSWERS/.</p>
      </div>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Run the batch with the model?"
        description="Each case makes several model API calls. That costs money and takes a few minutes."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep it rules only
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirm(false);
                start();
              }}
            >
              Run every case with the model
            </Button>
          </>
        }
      />
    </div>
  );
}
