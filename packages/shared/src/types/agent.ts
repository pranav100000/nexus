import { z } from 'zod';

export interface AgentManifest {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  languages: string[];
  tools: string[];
  model: string;
  maxContextTokens: number;
}

export interface AgentInfo {
  name: string;
  description: string;
  capabilities: string[];
  languages: string[];
  model: string;
}

export const AgentOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    severity: z.enum(['critical', 'warning', 'info']),
    file: z.string().optional(),
    line: z.number().optional(),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  approve: z.boolean(),
});

export type AgentOutput = z.infer<typeof AgentOutputSchema>;
