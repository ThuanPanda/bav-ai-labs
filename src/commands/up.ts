import chalk from 'chalk';
import { Command } from 'commander';

import { getInstalledSkills } from '../config';
import { log } from '../utils/logger';
import { providerLabel } from '../utils/providers';
import { getBundledSkillMeta } from '../utils/skills';

export const upCommand = new Command('up')
  .description('Check installed skills for available updates')
  .action(() => {
    const installed = getInstalledSkills();
    const names = Object.keys(installed);

    if (names.length === 0) {
      log.info(`No installed skills. Run ${chalk.cyan('bv add skill <name>')} to get started.`);
      return;
    }

    console.log();
    log.line();

    let updatesAvailable = 0;

    for (const name of names) {
      const entry = installed[name];
      const meta = getBundledSkillMeta(name);

      if (!meta) {
        log.label(
          chalk.bold(name),
          chalk.red('not found in this installation — may have been removed'),
        );
        continue;
      }

      if (entry.version === meta.version) {
        log.label(
          chalk.bold.cyan(name),
          `v${entry.version}  ${chalk.green('up to date')}  ${chalk.dim(providerLabel(entry.provider) + ' · ' + entry.scope)}`,
        );
      } else {
        log.label(
          chalk.bold.cyan(name),
          `v${entry.version} → ${chalk.yellow('v' + meta.version + ' available')}  ${chalk.dim(providerLabel(entry.provider) + ' · ' + entry.scope)}`,
        );
        updatesAvailable++;
      }
    }

    log.line();
    console.log();

    if (updatesAvailable > 0) {
      log.info(
        `${updatesAvailable} update(s) available. Run ${chalk.cyan('bv add skill <name>')} to reinstall with the latest version.`,
      );
    } else {
      log.success('All installed skills are up to date.');
    }

    console.log();
  });
