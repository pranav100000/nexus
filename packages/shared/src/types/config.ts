export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface NexusConfig {
  defaultModel: string;
  providers: Record<string, ProviderConfig>;
  maxCost?: number;
  timeout?: number;
}
