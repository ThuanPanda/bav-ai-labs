import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock `conf` before any module that imports it is loaded ─────────────────
const mockStore: Record<string, unknown> = {};

vi.mock('conf', () => {
  return {
    default: class MockConf {
      get(key: string) {
        return mockStore[key];
      }
      set(key: string, value: unknown) {
        mockStore[key] = value;
      }
      delete(key: string) {
        delete mockStore[key];
      }
    },
  };
});

// Import after mock is registered
const { getInstalledSkills, setInstalledSkill, removeInstalledSkill } = await import('../config');

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('config — installedSkills', () => {
  beforeEach(() => {
    mockStore['installedSkills'] = {};
  });

  it('returns an empty record when no skills are installed', () => {
    expect(getInstalledSkills()).toEqual({});
  });

  it('records a skill with version, provider, scope, and installedAt timestamp', () => {
    setInstalledSkill('my-skill', '1.2.3', 'opencode', 'global');
    const skills = getInstalledSkills();
    expect(skills['my-skill'].version).toBe('1.2.3');
    expect(skills['my-skill'].provider).toBe('opencode');
    expect(skills['my-skill'].scope).toBe('global');
    expect(typeof skills['my-skill'].installedAt).toBe('string');
    expect(new Date(skills['my-skill'].installedAt).getTime()).not.toBeNaN();
  });

  it('overwrites an existing skill on re-install', () => {
    setInstalledSkill('my-skill', '1.0.0', 'opencode', 'global');
    setInstalledSkill('my-skill', '2.0.0', 'claude', 'project');
    const skills = getInstalledSkills();
    expect(skills['my-skill'].version).toBe('2.0.0');
    expect(skills['my-skill'].provider).toBe('claude');
    expect(skills['my-skill'].scope).toBe('project');
  });

  it('tracks multiple skills independently', () => {
    setInstalledSkill('skill-a', '1.0.0', 'opencode', 'global');
    setInstalledSkill('skill-b', '0.5.0', 'vscode', 'project');
    const skills = getInstalledSkills();
    expect(Object.keys(skills)).toHaveLength(2);
    expect(skills['skill-a'].version).toBe('1.0.0');
    expect(skills['skill-b'].version).toBe('0.5.0');
  });

  it('removes an installed skill', () => {
    setInstalledSkill('my-skill', '1.0.0', 'opencode', 'global');
    removeInstalledSkill('my-skill');
    expect(getInstalledSkills()['my-skill']).toBeUndefined();
  });
});
