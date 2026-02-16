import { NoAgentsError } from '@nexus-agent/shared';
import type { AgentInfo } from '@nexus-agent/shared';
import { loadAgentManifests } from './manifest-loader.js';
import type { LoadedAgent } from './manifest-loader.js';

export class AgentManager {
  private agents: LoadedAgent[] = [];

  async loadAgents(): Promise<void> {
    this.agents = await loadAgentManifests();
  }

  getAll(): LoadedAgent[] {
    return this.agents;
  }

  getByName(name: string): LoadedAgent | undefined {
    return this.agents.find((a) => a.manifest.name === name);
  }

  getByCapability(capability: string): LoadedAgent[] {
    return this.agents.filter((a) => a.manifest.capabilities.includes(capability));
  }

  getAgentInfos(): AgentInfo[] {
    return this.agents.map((a) => ({
      name: a.manifest.name,
      description: a.manifest.description,
      capabilities: a.manifest.capabilities,
      languages: a.manifest.languages,
      model: a.manifest.model,
    }));
  }

  requireAgents(): void {
    if (this.agents.length === 0) {
      throw new NoAgentsError();
    }
  }
}
