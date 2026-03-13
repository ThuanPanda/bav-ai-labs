import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable no-console */
// ─── Mock conf ───────────────────────────────────────────────────────────────
const mockStore: Record<string, unknown> = {};

vi.mock('conf', () => ({
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
}));

// ─── Mock @inquirer/prompts ───────────────────────────────────────────────────
const mockSelect = vi.fn();
vi.mock('@inquirer/prompts', () => ({ select: mockSelect }));

// ─── Mock child_process ───────────────────────────────────────────────────────
const mockExecSync = vi.fn();
vi.mock('child_process', () => ({ execSync: mockExecSync }));

// ─── Mock ora spinners ────────────────────────────────────────────────────────
vi.mock('ora', () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

// ─── Mock fs (only for write/copy operations, not reads of skills dir) ────────
const mockMkdirSync = vi.fn();
const mockCopyFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();
const mockReaddirSync = vi.fn();

vi.mock('fs', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: mockMkdirSync,
      copyFileSync: mockCopyFileSync,
      writeFileSync: mockWriteFileSync,
      readFileSync: mockReadFileSync,
      existsSync: mockExistsSync,
      readdirSync: mockReaddirSync,
    },
  };
});

// ─── Silence console output ───────────────────────────────────────────────────
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// ─── Shared skill fixtures ────────────────────────────────────────────────────
const SKILL_A_MD = `---
name: skill-a
version: 1.0.0
description: Skill A description
---

# Skill A content
`;

const SKILL_B_MD = `---
name: skill-b
version: 2.0.0
description: Skill B description
---

# Skill B content
`;

function setupBundledSkills() {
  mockExistsSync.mockImplementation((p: string) => {
    if (String(p).endsWith('skills')) return true;
    if (String(p).includes('skill-a')) return true;
    if (String(p).includes('skill-b')) return true;
    return false;
  });
  mockReaddirSync.mockImplementation((p: string, _opts?: unknown) => {
    if (String(p).endsWith('skills')) {
      const entries = [
        { name: 'skill-a', isDirectory: () => true, isFile: () => false },
        { name: 'skill-b', isDirectory: () => true, isFile: () => false },
      ];
      return entries;
    }
    if (String(p).includes('skill-a')) {
      return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true }];
    }
    if (String(p).includes('skill-b')) {
      return [{ name: 'SKILL.md', isDirectory: () => false, isFile: () => true }];
    }
    return [];
  });
  mockReadFileSync.mockImplementation((p: string) => {
    if (String(p).includes('skill-a')) return SKILL_A_MD;
    if (String(p).includes('skill-b')) return SKILL_B_MD;
    return '';
  });
}

function argv(...args: string[]) {
  return ['node', 'cmd', ...args];
}

// ─── LS ───────────────────────────────────────────────────────────────────────
describe('ls command', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
    mockStore['installedSkills'] = {};
    vi.clearAllMocks();
    setupBundledSkills();
  });

  it('lists bundled skills', async () => {
    const { lsCommand } = await import('../commands/ls');
    await lsCommand.parseAsync(argv());
    expect(console.log).toHaveBeenCalled();
  });

  it('shows installed status for installed skills', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '1.0.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    const { lsCommand } = await import('../commands/ls');
    await lsCommand.parseAsync(argv());
    expect(console.log).toHaveBeenCalled();
  });
});

// ─── INFO ─────────────────────────────────────────────────────────────────────
describe('info command', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
    mockStore['installedSkills'] = {};
    vi.clearAllMocks();
    setupBundledSkills();
  });

  it('shows skill details for a known skill', async () => {
    const { infoCommand } = await import('../commands/info');
    await infoCommand.parseAsync(argv('skill-a'));
    expect(console.log).toHaveBeenCalled();
  });

  it('exits when skill is not found', async () => {
    mockExistsSync.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const { infoCommand } = await import('../commands/info');
    await expect(infoCommand.parseAsync(argv('nonexistent'))).rejects.toThrow('process.exit');
    exitSpy.mockRestore();
  });

  it('shows update notice when installed version differs', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '0.9.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    const { infoCommand } = await import('../commands/info');
    await infoCommand.parseAsync(argv('skill-a'));
    expect(console.log).toHaveBeenCalled();
  });
});

// ─── ADD ──────────────────────────────────────────────────────────────────────
describe('add skill command', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
    mockStore['installedSkills'] = {};
    vi.clearAllMocks();
    setupBundledSkills();
    mockMkdirSync.mockReset();
    mockCopyFileSync.mockReset();
    mockWriteFileSync.mockReset();
  });

  it('exits when skill name is not found', async () => {
    mockExistsSync.mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const { addCommand } = await import('../commands/add');
    await expect(addCommand.parseAsync(argv('skill', 'nonexistent'))).rejects.toThrow(
      'process.exit',
    );
    exitSpy.mockRestore();
  });

  it('installs skill with opencode + global scope', async () => {
    mockSelect
      .mockResolvedValueOnce('opencode') // provider
      .mockResolvedValueOnce('global'); // scope
    const { addCommand } = await import('../commands/add');
    await addCommand.parseAsync(argv('skill', 'skill-a'));
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockCopyFileSync).toHaveBeenCalled();
    const skills = mockStore['installedSkills'] as Record<
      string,
      { version: string; provider: string }
    >;
    expect(skills['skill-a']?.version).toBe('1.0.0');
    expect(skills['skill-a']?.provider).toBe('opencode');
  });

  it('installs skill with claude + project scope', async () => {
    mockSelect
      .mockResolvedValueOnce('claude') // provider
      .mockResolvedValueOnce('project'); // scope
    const { addCommand } = await import('../commands/add');
    await addCommand.parseAsync(argv('skill', 'skill-a'));
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockCopyFileSync).toHaveBeenCalled();
    const skills = mockStore['installedSkills'] as Record<
      string,
      { version: string; provider: string; scope: string }
    >;
    expect(skills['skill-a']?.provider).toBe('claude');
    expect(skills['skill-a']?.scope).toBe('project');
  });

  it('warns when skill is already installed and directory still exists', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '1.0.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    // existsSync returns true for the install dir so warning is triggered
    mockExistsSync.mockImplementation((p: string) => {
      if (String(p).endsWith('skills')) return true;
      if (String(p).includes('skill-a')) return true;
      if (String(p).includes('skill-b')) return true;
      return false;
    });
    const { addCommand } = await import('../commands/add');
    await addCommand.parseAsync(argv('skill', 'skill-a'));
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('allows reinstall when installed directory was deleted', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '1.0.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    const os = await import('node:os');
    const { default: nodePath } = await import('node:path');
    const home = os.default.homedir();
    const deletedPath = nodePath.join(home, '.config', 'opencode', 'skills', 'skill-a');
    mockExistsSync.mockImplementation((p: string) => {
      // The global install dest no longer exists
      if (String(p) === deletedPath) return false;
      // everything else (bundled dirs, etc.) exists
      if (String(p).endsWith('skills')) return true;
      if (String(p).includes('skill-a')) return true;
      if (String(p).includes('skill-b')) return true;
      return false;
    });
    mockSelect.mockResolvedValueOnce('opencode').mockResolvedValueOnce('global');
    const { addCommand } = await import('../commands/add');
    await addCommand.parseAsync(argv('skill', 'skill-a'));
    expect(mockSelect).toHaveBeenCalled();
    expect(mockMkdirSync).toHaveBeenCalled();
  });
});

// ─── UP ───────────────────────────────────────────────────────────────────────
describe('up command', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
    vi.clearAllMocks();
    setupBundledSkills();
  });

  it('informs when no skills are installed', async () => {
    mockStore['installedSkills'] = {};
    const { upCommand } = await import('../commands/up');
    await upCommand.parseAsync(argv());
    expect(console.log).toHaveBeenCalled();
  });

  it('shows up to date when version matches', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '1.0.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    const { upCommand } = await import('../commands/up');
    await upCommand.parseAsync(argv());
    expect(console.log).toHaveBeenCalled();
  });

  it('notifies when a newer version is available', async () => {
    mockStore['installedSkills'] = {
      'skill-a': { version: '0.9.0', provider: 'opencode', scope: 'global', installedAt: '' },
    };
    const { upCommand } = await import('../commands/up');
    await upCommand.parseAsync(argv());
    expect(console.log).toHaveBeenCalled();
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/** Read the real current version from package.json so tests stay valid after bumps. */
const fsModule = await import('node:fs');
const CURRENT_VERSION = (
  JSON.parse(fsModule.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

describe('update command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBundledSkills();
    // Extend existsSync to also find package.json for the walk-up search
    const baseExistsSync = mockExistsSync.getMockImplementation();
    mockExistsSync.mockImplementation((p: string) => {
      if (String(p).endsWith('package.json')) return true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return baseExistsSync ? baseExistsSync(p) : false;
    });
    // Mock readFileSync for package.json version lookup
    mockReadFileSync.mockImplementation((p: string) => {
      if (String(p).includes('package.json')) return JSON.stringify({ version: CURRENT_VERSION });
      if (String(p).includes('skill-a')) return SKILL_A_MD;
      if (String(p).includes('skill-b')) return SKILL_B_MD;
      return '';
    });
  });

  it('shows already up to date when versions match', async () => {
    mockExecSync.mockReturnValue(CURRENT_VERSION + '\n');
    const { updateCommand } = await import('../commands/update');
    await updateCommand.parseAsync(argv());
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('runs npm install when a newer version is available', async () => {
    mockExecSync
      .mockReturnValueOnce('99.0.0\n') // npm view — always "newer"
      .mockReturnValueOnce(''); // npm install -g
    const { updateCommand } = await import('../commands/update');
    await updateCommand.parseAsync(argv());
    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });

  it('exits when version check fails', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('network error');
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const { updateCommand } = await import('../commands/update');
    await expect(updateCommand.parseAsync(argv())).rejects.toThrow('process.exit');
    exitSpy.mockRestore();
  });
});

// ─── UNINSTALL ────────────────────────────────────────────────────────────────
describe('uninstall command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs npm uninstall -g', async () => {
    mockExecSync.mockReturnValue('');
    const { uninstallCommand } = await import('../commands/uninstall');
    await uninstallCommand.parseAsync(argv());
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('npm uninstall -g'),
      expect.any(Object),
    );
  });

  it('exits when uninstall fails', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('permission denied');
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    const { uninstallCommand } = await import('../commands/uninstall');
    await expect(uninstallCommand.parseAsync(argv())).rejects.toThrow('process.exit');
    exitSpy.mockRestore();
  });
});
