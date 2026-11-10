import type {
  AgentRuntime,
  AgentRuntimeInfo,
  ChatRequest,
  ChatResponse,
  HealthResult,
  RuntimeType,
} from '../types.js';

export interface OpenAICompatOptions {
  id: string;
  name: string;
  type: RuntimeType;
  provider: string;
  baseUrl: string;
  capabilities: AgentRuntimeInfo['capabilities'];
  apiKey?: string;
}

/**
 * OpenAI Chat Completions 兼容 Provider。
 * 覆盖 Ollama、LM Studio、vLLM、llama.cpp 等本地服务，以及 DeepSeek、OpenAI 等远程服务。
 */
export class OpenAICompatRuntime implements AgentRuntime {
  private modelsCache: string[] = [];

  constructor(private readonly opts: OpenAICompatOptions) {}

  info(): AgentRuntimeInfo {
    return {
      id: this.opts.id,
      name: this.opts.name,
      type: this.opts.type,
      provider: this.opts.provider,
      baseUrl: this.opts.baseUrl,
      models: this.modelsCache,
      capabilities: this.opts.capabilities,
      status: 'available',
    };
  }

  async listModels(): Promise<string[]> {
    const data = (await this.fetchJson(`${this.opts.baseUrl}/models`)) as {
      data?: Array<{ id: string }>;
    };
    this.modelsCache = (data.data ?? []).map((m) => m.id);
    return this.modelsCache;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const messages = req.system
      ? [{ role: 'system' as const, content: req.system }, ...req.messages]
      : req.messages;

    const body = {
      model: req.model ?? this.modelsCache[0],
      messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: false,
    };

    const data = (await this.fetchJson(`${this.opts.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    })) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: ChatResponse['usage'];
    };

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? body.model ?? '',
      usage: data.usage,
    };
  }

  async healthCheck(): Promise<HealthResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.opts.baseUrl}/models`, {
        signal: AbortSignal.timeout(2000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
