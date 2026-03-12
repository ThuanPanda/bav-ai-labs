import Conf from 'conf';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type Provider = 'opencode' | 'claude' | 'antigravity';
export type Scope = 'global' | 'project';

export interface InstalledSkillEntry {
  version: string;
  provider: Provider;
  scope: Scope;
  installedAt: string;
}

interface BvConfig {
  installedSkills: Record<string, InstalledSkillEntry>;
}

// ─── STORE ───────────────────────────────────────────────────────────────────

const config = new Conf<BvConfig>({
  projectName: 'bv',
  defaults: {
    installedSkills: {},
  },
});

// ─── INSTALLED SKILLS ────────────────────────────────────────────────────────

export const getInstalledSkills = (): Record<string, InstalledSkillEntry> =>
  config.get('installedSkills');

export const setInstalledSkill = (
  name: string,
  version: string,
  provider: Provider,
  scope: Scope,
) => {
  const skills = config.get('installedSkills');
  skills[name] = { version, provider, scope, installedAt: new Date().toISOString() };
  config.set('installedSkills', skills);
};

export const removeInstalledSkill = (name: string) => {
  const skills = config.get('installedSkills');
  delete skills[name];
  config.set('installedSkills', skills);
};
