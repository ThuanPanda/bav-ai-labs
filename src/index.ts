import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import { addCommand } from './commands/add';
import { infoCommand } from './commands/info';
import { lsCommand } from './commands/ls';
import { newCommand } from './commands/new';
import { uninstallCommand } from './commands/uninstall';
import { upCommand } from './commands/up';
import { updateCommand } from './commands/update';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8')) as {
  version: string;
  description: string;
};

const program = new Command();

program
  .name('bv')
  .description(pkg.description)
  .version(pkg.version, '-v, --version', 'Show CLI version')
  .helpOption('-h, --help', 'Show help')
  .helpCommand('help [command]', 'Display help for a command');

program.addCommand(lsCommand);
program.addCommand(addCommand);
program.addCommand(newCommand);
program.addCommand(upCommand);
program.addCommand(infoCommand);
program.addCommand(updateCommand);
program.addCommand(uninstallCommand);

// Show help if no subcommand given
program.action(() => program.help());

program.parse(process.argv);
