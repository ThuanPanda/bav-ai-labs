/* eslint-disable no-console */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ') + '  ' + msg),
  success: (msg: string) => console.log(chalk.green('✔') + '  ' + msg),
  error: (msg: string) => console.error(chalk.red('✖') + '  ' + msg),
  warn: (msg: string) => console.warn(chalk.yellow('⚠') + '  ' + msg),
  line: () => console.log(chalk.gray('─'.repeat(50))),
  label: (key: string, value: string) =>
    console.log(`  ${chalk.dim(key.padEnd(14))} ${chalk.white(value)}`),
};

export const spin = (text: string): Ora => ora({ text, color: 'cyan' }).start();
