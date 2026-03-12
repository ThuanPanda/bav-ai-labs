import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SkillMeta {
  name: string;
  version: string;
  description: string;
}

export interface SkillFile {
  name: string;
  fullPath: string;
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

/** Read all bundled skills and return their metadata. */
export function getBundledSkills(): SkillMeta[] {
  const skillsDir = getBundledSkillsDir();
  if (!fs.existsSync(skillsDir)) return [];

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf8');
    const fm = parseFrontmatter(content);

    skills.push({
      name: fm['name'] ?? entry.name,
      version: fm['version'] ?? '0.0.0',
      description: fm['description'] ?? '',
    });
  }

  return skills;
}

/** Read metadata for a single bundled skill. Returns undefined if not found. */
export function getBundledSkillMeta(skillName: string): SkillMeta | undefined {
  const skillMdPath = path.join(getBundledSkillDir(skillName), 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return undefined;

  const content = fs.readFileSync(skillMdPath, 'utf8');
  const fm = parseFrontmatter(content);

  return {
    name: fm['name'] ?? skillName,
    version: fm['version'] ?? '0.0.0',
    description: fm['description'] ?? '',
  };
}

/** List all files in a bundled skill directory. */
export function getBundledSkillFiles(skillName: string): SkillFile[] {
  const skillDir = getBundledSkillDir(skillName);
  if (!fs.existsSync(skillDir)) return [];

  return fs
    .readdirSync(skillDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => ({ name: e.name, fullPath: path.join(skillDir, e.name) }));
}
