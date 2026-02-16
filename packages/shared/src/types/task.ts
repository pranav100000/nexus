import { z } from 'zod';

export interface Constraints {
  maxCost?: number;
  timeout?: number;
  maxAgents?: number;
}

export interface TaskContext {
  repoPath: string;
  gitDiff?: string;
  changedFiles?: string[];
  branch?: string;
  languages?: string[];
  base?: string;
  commit?: string;
}

export interface TaskInput {
  action: string;
  description?: string;
  context: TaskContext;
  agents?: string[];
  constraints?: Constraints;
  pr?: string;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export const FindingSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  file: z.string().optional(),
  line: z.number().optional(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export type Finding = z.infer<typeof FindingSchema>;

export interface SubtaskResult {
  agentName: string;
  summary: string;
  findings: Finding[];
  confidence: number;
  approve: boolean;
  tokenUsage: { input: number; output: number };
  cost: number;
  durationMs: number;
}

export interface Subtask {
  id: string;
  agentName: string;
  description: string;
  context: TaskContext;
}

export interface TaskResult {
  summary: string;
  findings: Finding[];
  approve: boolean;
  totalCost: number;
  totalDurationMs: number;
  agentResults: SubtaskResult[];
}

export interface TaskState {
  id: string;
  input: TaskInput;
  status: TaskStatus;
  subtaskResults: SubtaskResult[];
  result?: TaskResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
