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
  outputSchema?: Record<string, unknown>;
}

export interface AgentInfo {
  name: string;
  description: string;
  capabilities: string[];
  languages: string[];
  model: string;
}

export const ReviewOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    severity: z.enum(['critical', 'warning', 'info']),
    file: z.string().optional(),
    line: z.number().optional(),
    message: z.string(),
    suggestion: z.string().optional(),
  })).max(10),
  confidence: z.number().min(0).max(1),
  approve: z.boolean(),
});

export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

/** @deprecated Use ReviewOutputSchema instead */
export const AgentOutputSchema = ReviewOutputSchema;
/** @deprecated Use ReviewOutput instead */
export type AgentOutput = ReviewOutput;

export const DEFAULT_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    data: {},
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['summary'],
};

export const REVIEW_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          file: { type: 'string' },
          line: { type: 'number' },
          message: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['severity', 'message'],
      },
      maxItems: 10,
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    approve: { type: 'boolean' },
  },
  required: ['summary', 'findings', 'confidence', 'approve'],
};

export function isReviewOutput(output: unknown): output is ReviewOutput {
  if (typeof output !== 'object' || output === null) return false;
  const obj = output as Record<string, unknown>;
  return Array.isArray(obj.findings) && typeof obj.approve === 'boolean';
}
