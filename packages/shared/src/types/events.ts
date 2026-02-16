export interface ProgressEvent {
  type: 'progress';
  taskId: string;
  agentName: string;
  status: 'started' | 'completed' | 'failed';
  message: string;
  timestamp: Date;
}

export interface ResultEvent {
  type: 'result';
  taskId: string;
  result: import('./task.js').TaskResult;
  timestamp: Date;
}

export interface ErrorEvent {
  type: 'error';
  taskId: string;
  error: string;
  timestamp: Date;
}

export type TaskEvent = ProgressEvent | ResultEvent | ErrorEvent;
