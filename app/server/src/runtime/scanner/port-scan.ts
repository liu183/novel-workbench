import net from 'node:net';
import type { AgentCapability, AgentRuntimeInfo } from '../types.js';

export interface PortFingerprint {
  name: string;
  provider: string;
  host: string;
  port: number;
  baseUrl: string;
  capabilities: AgentCapability[];
}

/**
 * 已知本地推理服务指纹表（OpenAI 兼容端点）。
 * 端口冲突时以健康端点内容校验为准，避免误判。
 */
export const PORT_FINGERPRINTS: PortFingerprint[] = [
  {
    name: 'Ollama',
    provider: 'ollama',
    host: '127.0.0.1',
    port: 11434,
    baseUrl: 'http://127.0.0.1:11434/v1',
    capabilities: ['chat', 'stream', 'embedding'],
  },
  {
    name: 'LM Studio',
    provider: 'lm-studio',
    host: '127.0.0.1',
    port: 1234,
    baseUrl: 'http://127.0.0.1:1234/v1',
    capabilities: ['chat', 'stream'],
  },
  {
    name: 'vLLM',
    provider: 'vllm',
    host: '127.0.0.1',
    port: 8000,
    baseUrl: 'http://127.0.0.1:8000/v1',
    capabilities: ['chat', 'stream', 'tool-call'],
  },
  {
    name: 'llama.cpp',
    provider: 'llamacpp',
    host: '127.0.0.1',
    port: 8080,
    baseUrl: 'http://127.0.0.1:8080/v1',
    capabilities: ['chat', 'stream'],
  },
  {
    name: 'text-generation-webui',
    provider: 'textgen-webui',
    host: '127.0.0.1',
    port: 5000,
    baseUrl: 'http://127.0.0.1:5000/v1',
    capabilities: ['chat', 'stream'],
  },
  {
    name: 'LocalAI',
    provider: 'localai',
    host: '127.0.0.1',
    port: 8081,
    baseUrl: 'http://127.0.0.1:8081/v1',
    capabilities: ['chat', 'stream', 'embedding'],
  },
];

/** TCP 连接探测（仅判断端口是否开放，不做协议校验）。 */
export function canConnect(host: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export function portToInfo(f: PortFingerprint): AgentRuntimeInfo {
  return {
    id: `port-${f.provider}`,
    name: f.name,
    type: 'llm',
    provider: f.provider,
    baseUrl: f.baseUrl,
    models: [],
    capabilities: f.capabilities,
    status: 'scanning',
  };
}
