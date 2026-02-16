import type { TaskEvent } from '@nexus-agent/shared';

export async function* parseSSEStream(response: Response): AsyncGenerator<TaskEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) {
            const event: TaskEvent = JSON.parse(data);
            yield event;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
