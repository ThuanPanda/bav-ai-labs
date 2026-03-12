import chalk from 'chalk';
import { Command } from 'commander';

import { getInstalledSkills } from '../config';
import { log } from '../utils/logger';
import { providerLabel } from '../utils/providers';
import { getBundledSkillMeta } from '../utils/skills';

export const infoCommand = new Command('info')
  .description('Show details about a skill')
  .argument('<skill>', 'Skill name')
  .action((skillName: string) => {
    const meta = getBundledSkillMeta(skillName);

    if (!meta) {
      log.error(`Skill "${skillName}" not found.`);
      log.info(`Run ${chalk.cyan('bv ls')} to see all available skills.`);
      process.exit(1);
    }

    const installed = getInstalledSkills();
    const entry = installed[skillName];

    console.log();
    log.line();
    log.label('Skill', chalk.bold.cyan(meta.name));
    log.label('Description', meta.description.split('\n')[0]?.trim() ?? '');
    log.label('Version', `v${meta.version}`);

    if (entry) {
      log.label('Status', chalk.green('● Installed'));
      log.label('Provider', providerLabel(entry.provider));
      log.label('Scope', entry.scope);
      log.label('Installed', chalk.dim(entry.installedAt));

      if (entry.version !== meta.version) {
        log.label(
          'Update',
          chalk.yellow(
            `v${entry.version} → v${meta.version} available — run ${chalk.cyan('bv up')} to update`,
          ),
        );
      }
    } else {
      log.label('Status', chalk.gray('○ Not installed'));
      console.log();
      log.info(`Run ${chalk.cyan('bv add skill ' + skillName)} to install.`);
    }

    log.line();
    console.log();
  });
