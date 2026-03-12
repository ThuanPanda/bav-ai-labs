import { execSync } from 'node:child_process';

import chalk from 'chalk';
import { Command } from 'commander';

import { log, spin } from '../utils/logger';

const PKG_NAME = '@thuanpanda/bv';

export const uninstallCommand = new Command('uninstall')
  .description('Uninstall bv CLI from your machine')
  .action(() => {
    log.warn(`This will remove ${chalk.bold('bv')} from your machine.`);
    const spinner = spin('Uninstalling…');

    try {
      execSync(`npm uninstall -g ${PKG_NAME}`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
      spinner.succeed('bv has been uninstalled.');
    } catch (error) {
      spinner.fail('Uninstall failed');
      log.error((error as Error).message);
      process.exit(1);
    }
  });
