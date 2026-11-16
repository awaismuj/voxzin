import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { env } from '../config/env';

/** Provider-agnostic: add another implementation and select it with AI_PROVIDER. */
export interface AiProvider {
  complete(system: string, prompt: string): Promise<string>;
}

class AnthropicProvider implements AiProvider {
  async complete(system: string, prompt: string) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.AI_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AI_MODEL, max_tokens: 1000, system, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new BadGatewayException('The AI provider request failed');
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n').trim();
  }
}

const SYSTEM =
  'You assist human editors at a news publication. Work only from the text provided. Never invent facts, quotations, statistics, sources, or search metrics. If the text does not contain enough information, say what is missing. Your output is a suggestion that an editor will review.';
const TASKS = {
  headlines: 'Suggest 5 accurate, non-clickbait headlines for this article text.',
  outline: 'Write a clear outline (headings and one-line notes) for an article based on these notes. Do not add facts that are not in the notes.',
  summary: 'Summarise this source material in 5 bullet points. Mark anything uncertain.',
  seo: 'Suggest one SEO title (max 60 characters) and one meta description (max 155 characters) that accurately describe this text.',
  readability: 'List grammar and readability improvements for this text. Do not change facts.',
} as const;

@Injectable()
export class AiService {
  private provider(): AiProvider {
    if (env.AI_PROVIDER === 'anthropic' && env.AI_API_KEY) return new AnthropicProvider();
    throw new ServiceUnavailableException('AI assistance is not configured on this server');
  }
  assist(task: keyof typeof TASKS, text: string) {
    return this.provider().complete(SYSTEM, `${TASKS[task]}\n\n<text>\n${text}\n</text>`);
  }
}
