import fs from 'node:fs';
import path from 'node:path';

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { getInstalledSkills, type Provider, type Scope, setInstalledSkill } from '../config';
import { log } from '../utils/logger';
import { getInstallDir, providerLabel } from '../utils/providers';
import { getBundledSkillFiles, getBundledSkills } from '../utils/skills';

// ─── COPY LOGIC ──────────────────────────────────────────────────────────────

function copySkill(skillName: string, provider: Provider, scope: Scope, cwd: string): string {
  const installDir = getInstallDir(provider, scope, cwd);
  const destDir = path.join(installDir, skillName);
  fs.mkdirSync(destDir, { recursive: true });
  const files = getBundledSkillFiles(skillName);
  for (const file of files) {
    fs.copyFileSync(file.fullPath, path.join(destDir, file.name));
  }
  return destDir;
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const addCommand = new Command('add').description('Install a skill').addCommand(
  new Command('skill')
    .description('Install a skill from the bundled registry')
    .argument('<name>', 'Skill name to install')
    .action(async (skillName: string) => {
      const skills = getBundledSkills();
      const skill = skills.find((s) => s.name === skillName);

      if (!skill) {
        log.error(`Skill "${skillName}" not found.`);
        log.info(`Run ${chalk.cyan('bv ls')} to see available skills.`);
        process.exit(1);
      }

      // Check already installed — but only block if the install directory still exists
      const installed = getInstalledSkills();
      if (installed[skillName]) {
        const entry = installed[skillName];
        const cwd = process.cwd();

        // Guard against a corrupt/incomplete config entry (e.g. written by an older CLI version)
        if (entry.provider && entry.scope) {
          const installDir = getInstallDir(entry.provider, entry.scope, cwd);
          const destDir = path.join(installDir, skillName);

          if (fs.existsSync(destDir)) {
            log.warn(
              `"${skillName}" is already installed (${providerLabel(entry.provider)}, ${entry.scope}).`,
            );
            log.info(`Run ${chalk.cyan('bv up')} to check for updates.`);
            return;
          }
        }

        // Directory was removed or entry is incomplete — allow reinstall (will overwrite config entry)
      }

      console.log();

      // Step 1 — Pick provider
      const provider = await select<Provider>({
        message: 'Which AI tool are you installing for?',
        choices: [
          { name: 'OpenCode', value: 'opencode' },
          { name: 'Claude Code', value: 'claude' },
          { name: 'Antigravity', value: 'antigravity' },
        ],
      });

      // Step 2 — Pick scope
      const cwd = process.cwd();
      const installDir = getInstallDir(provider, 'global', cwd);
      const projectDir = getInstallDir(provider, 'project', cwd);

      const scope = await select<Scope>({
        message: 'Install scope?',
        choices: [
          { name: `Global   (${installDir})`, value: 'global' },
          { name: `Project  (${projectDir})`, value: 'project' },
        ],
      });

      // Step 3 — Copy files
      try {
        const dest = copySkill(skillName, provider, scope, cwd);
        setInstalledSkill(skillName, skill.version, provider, scope);
        console.log();
        log.success(
          `${chalk.bold.cyan(skillName)} v${skill.version} installed → ${chalk.dim(dest)}`,
        );
        console.log();
      } catch (error) {
        log.error(`Failed to install ${skillName}: ${(error as Error).message}`);
        process.exit(1);
      }
    }),
);
