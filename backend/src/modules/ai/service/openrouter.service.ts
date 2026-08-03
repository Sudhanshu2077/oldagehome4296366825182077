import { loadConfig } from '../../../config/env.js';
import { getLogger } from '../../../config/logger.js';

const logger = getLogger();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  model: string;
  content: string;
  tried: { model: string; ok: boolean; reason?: string }[];
}

const PRIORITY_FREE_MODELS: string[] = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'inclusionai/ling-3.0-flash:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
];

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const REQUEST_TIMEOUT_MS = 45000;

function shouldRetry(status: number, errorText?: string): boolean {
  if (status === 429 || status === 401 || status === 403 || status >= 500) return true;
  if (status === 404) return true;
  const low = (errorText ?? '').toLowerCase();
  if (low.includes('rate limit') || low.includes('quota') || low.includes('no available') || low.includes('provider') || low.includes('upstream')) return true;
  return false;
}

interface RemoteModel {
  id: string;
  pricing?: { prompt?: string; completion?: string };
}

async function fetchAvailableFreeModels(apiKey: string): Promise<string[]> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: RemoteModel[] };
    const list = body.data ?? [];
    const free = list.filter((m) => {
      const p = m.pricing ?? {};
      const promptFree = p.prompt === '0' || p.prompt === '0.0';
      const complFree = p.completion === '0' || p.completion === '0.0';
      return promptFree && complFree;
    }).map((m) => m.id);
    return free;
  } catch {
    return [];
  }
}

function orderModels(knownPriority: string[], availableFree: string[]): string[] {
  if (availableFree.length === 0) return [...knownPriority];
  const inAvailable = new Set(availableFree);
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (id: string): void => {
    if (id && !seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  };
  for (const id of knownPriority) {
    if (inAvailable.has(id)) push(id);
  }
  for (const id of availableFree) push(id);
  for (const id of knownPriority) push(id);
  return ordered;
}

async function callModel(model: string, messages: ChatMessage[], apiKey: string, temperature: number): Promise<{ ok: true; content: string } | { ok: false; status: number; reason: string }> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://igohms.gov.in',
        'X-Title': 'IGOHMS Assistant',
      },
      signal: ctrl.signal,
      body: JSON.stringify({ model, messages, temperature, max_tokens: 1024 }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, reason: `HTTP ${res.status}${text ? `: ${text.slice(0, 220)}` : ''}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, status: 200, reason: 'empty content' };
    return { ok: true, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error';
    return { ok: false, status: 0, reason: msg };
  } finally {
    clearTimeout(to);
  }
}

export class OpenRouterService {
  private readonly apiKey: string;
  private cachedModels: string[] | null = null;
  private cacheExpires = 0;

  constructor() {
    this.apiKey = loadConfig().openRouterApiKey;
  }

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  private async getModelQueue(): Promise<string[]> {
    if (!this.configured) return [...PRIORITY_FREE_MODELS];
    const now = Date.now();
    if (this.cachedModels && now < this.cacheExpires) return this.cachedModels;
    const available = await fetchAvailableFreeModels(this.apiKey);
    const ordered = orderModels(PRIORITY_FREE_MODELS, available);
    this.cachedModels = ordered;
    this.cacheExpires = now + 15 * 60 * 1000;
    return ordered;
  }

  async chat(messages: ChatMessage[], temperature = 0.3): Promise<ChatResult> {
    if (!this.configured) {
      return { model: 'none', content: '', tried: [] };
    }
    const queue = await this.getModelQueue();
    const tried: { model: string; ok: boolean; reason?: string }[] = [];
    for (const model of queue) {
      const result = await callModel(model, messages, this.apiKey, temperature);
      if (result.ok) {
        tried.push({ model, ok: true });
        logger.info({ model, ai: 'openrouter', triedCount: tried.length }, 'openrouter chat success');
        return { model, content: result.content, tried };
      }
      tried.push({ model, ok: false, reason: result.reason });
      logger.warn({ model, ai: 'openrouter', status: result.status, reason: result.reason }, 'openrouter model failed, trying next');
      if (!shouldRetry(result.status, result.reason)) {
        logger.warn({ model, ai: 'openrouter', reason: result.reason }, 'non-retryable failure, stopping chain');
        break;
      }
    }
    return { model: 'none', content: '', tried };
  }
}

export default OpenRouterService;