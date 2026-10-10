import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { runClaudeCode } from '@casework/core/claude-code';
import { z } from 'zod';
import { JudgeItem, JudgeVerdict, type JudgeClient, type JudgeEffort } from '../schema';
import { JudgeCompletionError } from './client';

const apiVerdict = JudgeVerdict.extend({
  items: z.array(JudgeItem.omit({ uncertain: true })),
  usability: z.object({ score: z.number(), explanation: z.string() }),
});

const format = zodOutputFormat(apiVerdict);

/** Grade through `claude -p`, using the logged-in Claude Code plan instead of ANTHROPIC_API_KEY. */
export function createClaudeCodeJudgeClient(opts: { model: string; effort: JudgeEffort; timeoutMs?: number }): JudgeClient {
  const schema = format.schema as Record<string, unknown>;
  return {
    async complete(req, signal) {
      const usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
      let model = req.model;
      try {
        let prompt = `${req.context}\n\n${req.output}`;
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await runClaudeCode({
            prompt, system: req.system, schema, model: req.model, effort: req.effort,
            signal, timeoutMs: opts.timeoutMs ?? 600_000,
          });
          model = response.model;
          usage.inputTokens += response.usage.inputTokens;
          usage.outputTokens += response.usage.outputTokens;
          usage.cacheReadTokens += response.usage.cacheReadTokens;
          usage.cacheWriteTokens += response.usage.cacheWriteTokens;
          const parsed = JudgeVerdict.safeParse(response.json);
          if (parsed.success) {
            return { verdict: parsed.data, usage, model: response.model, stopReason: 'end_turn' };
          }
          prompt = `${req.context}\n\n${req.output}\n\nYour previous answer did not match the required schema:\n${parsed.error ? z.prettifyError(parsed.error).slice(0, 800) : 'invalid JSON'}\nAnswer again, following the schema exactly.`;
        }
        throw new Error('Judge returned invalid output after two attempts');
      } catch (error) {
        throw new JudgeCompletionError(error, usage, model);
      }
    },
  };
}
