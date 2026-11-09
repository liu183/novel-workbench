import type { FastifyReply } from 'fastify';

export interface SSEEvent {
  id?: string;
  event?: string;
  data: unknown;
}

export type SSESender = (event: SSEEvent) => void;

/**
 * 初始化一个 SSE 响应通道，返回发送函数。
 * 自动处理心跳（ping）与客户端断开清理。
 */
export function initSSE(reply: FastifyReply): SSESender {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.write('\n');

  const keepAlive = setInterval(() => {
    reply.raw.write(': ping\n\n');
  }, 15000);

  reply.raw.on('close', () => clearInterval(keepAlive));

  return (event) => {
    if (event.id) reply.raw.write(`id: ${event.id}\n`);
    if (event.event) reply.raw.write(`event: ${event.event}\n`);

    const text = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    for (const line of text.split('\n')) {
      reply.raw.write(`data: ${line}\n`);
    }
    reply.raw.write('\n');
  };
}
