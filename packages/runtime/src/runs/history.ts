import type { SkillRunInput, SkillRunOutput, RunStatus } from '@srgnt/contracts';

export interface RunHistoryEntry {
  id: string;
  skillName: string;
  skillVersion: string;
  status: RunStatus;
  input: SkillRunInput;
  output?: SkillRunOutput;
  createdAt: Date;
  updatedAt: Date;
}

export class RunHistory {
  private runs: Map<string, RunHistoryEntry>;

  constructor() {
    this.runs = new Map();
  }

  createRun(
    skillName: string,
    skillVersion: string,
    input: SkillRunInput
  ): RunHistoryEntry {
    const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const entry: RunHistoryEntry = {
      id,
      skillName,
      skillVersion,
      status: 'pending',
      input,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(id, entry);
    return entry;
  }

  updateRun(id: string, output: SkillRunOutput): boolean {
    const run = this.runs.get(id);
    if (!run) return false;

    run.status = output.status;
    run.output = output;
    run.updatedAt = new Date();
    return true;
  }

  getRun(id: string): RunHistoryEntry | undefined {
    return this.runs.get(id);
  }

  listRuns(): RunHistoryEntry[] {
    return Array.from(this.runs.values());
  }

  listRunsBySkill(skillName: string): RunHistoryEntry[] {
    return Array.from(this.runs.values()).filter((r) => r.skillName === skillName);
  }

  listRunsByStatus(status: RunStatus): RunHistoryEntry[] {
    return Array.from(this.runs.values()).filter((r) => r.status === status);
  }

  removeRun(id: string): boolean {
    return this.runs.delete(id);
  }

  clear(): void {
    this.runs.clear();
  }

  get size(): number {
    return this.runs.size;
  }
}

export function createRunHistory(): RunHistory {
  return new RunHistory();
}