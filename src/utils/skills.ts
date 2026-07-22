import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SkillMeta {
  name: string;
  version: string;
  description: string;
  /** True when the skill is a bundle (no top-level SKILL.md, one or more nested sub-skills). */
  isBundle?: boolean;
  /** Names of the nested sub-skills (bundles only). */
  subSkills?: string[];
}

export interface SkillFile {
  /** File basename, e.g. `SKILL.md`. */
  name: string;
  /** Absolute path to the source file. */
  fullPath: string;
  /** Path relative to the skill directory, e.g. `gitnexus-cli/SKILL.md`. Preserves nested layout. */
  relPath: string;
}

// ─── PATHS ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the bundled skills/ directory (works when installed globally) */
export const getBundledSkillsDir = (): string => path.join(__dirname, 'skills');

/** Absolute path to a specific bundled skill directory */
export const getBundledSkillDir = (skillName: string): string =>
  path.join(getBundledSkillsDir(), skillName);

// ─── FRONTMATTER PARSER ──────────────────────────────────────────────────────

/** Parse YAML frontmatter from a SKILL.md string. Returns key-value pairs.
 *  Supports plain scalar values and YAML block scalars (> folded, | literal). */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rawVal = line
      .slice(colonIdx + 1)
      .trim()
      .replaceAll(/^["']|["']$/g, '');

    if (!key) {
      i++;
      continue;
    }

    // Block scalar: > (folded) or | (literal)
    if (rawVal === '>' || rawVal === '|') {
      i++;
      const blockLines: string[] = [];
      while (i < lines.length) {
        const next = lines[i];
        if (/^\s+/.test(next)) {
          blockLines.push(next.trim());
          i++;
        } else {
          break;
        }
      }
      // Folded (>) joins with spaces; literal (|) joins with newlines
      result[key] = rawVal === '>' ? blockLines.join(' ') : blockLines.join('\n');
    } else {
      result[key] = rawVal;
      i++;
    }
  }

  return result;
}

/** Strip YAML frontmatter from a SKILL.md string, returning only the body. */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trimStart();
}

// ─── REGISTRY ────────────────────────────────────────────────────────────────

/**
 * Find sub-directories (recursively) that contain a `SKILL.md`. Used to detect a
 * bundle skill — a directory with no top-level SKILL.md but one or more nested skills
 * (e.g. `gitnexus/gitnexus-cli/SKILL.md`). Returns the sub-skill names in sorted order.
 */
function findNestedSkillNames(dir: string): string[] {
  const names: string[] = [];

  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(current, entry.name);
      if (fs.existsSync(path.join(child, 'SKILL.md'))) {
        const fm = parseFrontmatter(fs.readFileSync(path.join(child, 'SKILL.md'), 'utf8'));
        names.push(fm['name'] ?? entry.name);
      } else {
        walk(child);
      }
    }
  };

  walk(dir);
  return names.toSorted((a, b) => a.localeCompare(b));
}

/**
 * Build metadata for a single skill directory. Handles two shapes:
 *  - **Flat skill** — `<dir>/SKILL.md` exists; metadata comes from its frontmatter.
 *  - **Bundle skill** — no top-level SKILL.md, but nested sub-skills exist; metadata is
 *    synthesised from the sub-skill names (`gitnexus` → its six sub-skills).
 * Returns undefined when the directory is neither.
 */
function buildSkillMeta(skillDir: string, fallbackName: string): SkillMeta | undefined {
  const skillMdPath = path.join(skillDir, 'SKILL.md');

  if (fs.existsSync(skillMdPath)) {
    const fm = parseFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
    return {
      name: fm['name'] ?? fallbackName,
      version: fm['version'] ?? '0.0.0',
      description: fm['description'] ?? '',
    };
  }

  const subSkills = findNestedSkillNames(skillDir);
  if (subSkills.length === 0) return undefined;

  return {
    name: fallbackName,
    version: '0.0.0',
    description: `Bundle of ${subSkills.length} skills: ${subSkills.join(', ')}`,
    isBundle: true,
    subSkills,
  };
}

/** Read all bundled skills and return their metadata. */
export function getBundledSkills(): SkillMeta[] {
  const skillsDir = getBundledSkillsDir();
  if (!fs.existsSync(skillsDir)) return [];

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = buildSkillMeta(path.join(skillsDir, entry.name), entry.name);
    if (meta) skills.push(meta);
  }

  return skills;
}

/** Read metadata for a single bundled skill. Returns undefined if not found. */
export function getBundledSkillMeta(skillName: string): SkillMeta | undefined {
  const skillDir = getBundledSkillDir(skillName);
  if (!fs.existsSync(skillDir)) return undefined;
  return buildSkillMeta(skillDir, skillName);
}

/**
 * List every file in a bundled skill directory, recursing into sub-directories so nested
 * bundle skills keep their layout. Each entry carries a `relPath` relative to the skill dir.
 */
export function getBundledSkillFiles(skillName: string): SkillFile[] {
  const skillDir = getBundledSkillDir(skillName);
  if (!fs.existsSync(skillDir)) return [];

  const files: SkillFile[] = [];

  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push({ name: entry.name, fullPath: full, relPath: path.relative(skillDir, full) });
      }
    }
  };

  walk(skillDir);
  return files;
}
