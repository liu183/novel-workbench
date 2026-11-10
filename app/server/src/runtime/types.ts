export type AgentCapability =
  | 'chat'
  | 'stream'
  | 'tool-call'
  | 'agent-task'
  | 'vision'
  | 'long-context'
  | 'embedding';

export type RuntimeType = 'llm' | 'agent-cli' | 'remote';

export type RuntimeStatus = 'scanning' | 'available' | 'unavailable' | 'error';

export interface RuntimeHealth {
  latencyMs: number;
  lastCheck: number;
}

export interface AgentRuntimeInfo {
  id: string;
  name: string;
  type: RuntimeType;
  provider: string;
  baseUrl?: string;
  command?: string;
  models: string[];
  capabilities: AgentCapability[];
  status: RuntimeStatus;
  health?: RuntimeHealth;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface HealthResult {
  ok: boolean;
  latencyMs: number;
}

/**
 * 统一 Agent Runtime 接口。所有 Provider（本地/远程/CLI）均实现此接口，
 * 上层业务通过 Registry 调用，屏蔽底层差异。
 */
export interface AgentRuntime {
  info(): AgentRuntimeInfo;
  listModels(): Promise<string[]>;
  chat(req: ChatRequest): Promise<ChatResponse>;
  healthCheck(): Promise<HealthResult>;
}
