import { describe, it, expect } from 'vitest';
import { parseSSEStream } from '../../client/sse-client.js';
import type { TaskEvent } from '@nexus-agent/shared';

function createMockResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });

  return { body: stream } as Response;
}

describe('parseSSEStream', () => {
  it('parses single SSE event', async () => {
    const event: TaskEvent = {
      type: 'progress',
      taskId: 'test-123',
      agentName: 'test-agent',
      status: 'started',
      message: 'Starting...',
      timestamp: new Date(),
    };

    const response = createMockResponse([`data: ${JSON.stringify(event)}\n\n`]);
    const events: TaskEvent[] = [];
    for await (const e of parseSSEStream(response)) {
      events.push(e);
    }
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('progress');
    expect(events[0].taskId).toBe('test-123');
  });

  it('parses multiple events', async () => {
    const event1 = JSON.stringify({ type: 'progress', taskId: 't', agentName: 'a', status: 'started', message: 'go', timestamp: new Date() });
    const event2 = JSON.stringify({ type: 'error', taskId: 't', error: 'fail', timestamp: new Date() });

    const response = createMockResponse([`data: ${event1}\n\ndata: ${event2}\n\n`]);
    const events: TaskEvent[] = [];
    for await (const e of parseSSEStream(response)) {
      events.push(e);
    }
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('progress');
    expect(events[1].type).toBe('error');
  });

  it('handles chunked data across multiple reads', async () => {
    const event = JSON.stringify({ type: 'progress', taskId: 't', agentName: 'a', status: 'started', message: 'go', timestamp: new Date() });
    // Split in the middle
    const full = `data: ${event}\n\n`;
    const mid = Math.floor(full.length / 2);

    const response = createMockResponse([full.slice(0, mid), full.slice(mid)]);
    const events: TaskEvent[] = [];
    for await (const e of parseSSEStream(response)) {
      events.push(e);
    }
    expect(events).toHaveLength(1);
  });

  it('ignores non-data lines', async () => {
    const event = JSON.stringify({ type: 'progress', taskId: 't', agentName: 'a', status: 'started', message: 'go', timestamp: new Date() });
    const response = createMockResponse([`: comment\nid: 123\ndata: ${event}\n\n`]);
    const events: TaskEvent[] = [];
    for await (const e of parseSSEStream(response)) {
      events.push(e);
    }
    expect(events).toHaveLength(1);
  });
});
