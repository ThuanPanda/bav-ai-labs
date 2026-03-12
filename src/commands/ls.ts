import chalk from 'chalk';
import { Command } from 'commander';

import { getInstalledSkills } from '../config';
import { log } from '../utils/logger';
import { getBundledSkills } from '../utils/skills';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Wrap a long string into lines of at most `maxWidth` characters, each indented. */
function wrapText(text: string, maxWidth: number, indent: string): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);

  return lines.map((l) => `${indent}${l}`).join('\n');
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const lsCommand = new Command('ls').description('List all available skills').action(() => {
  const skills = getBundledSkills();

  if (skills.length === 0) {
    log.info('No skills found in this installation.');
    return;
  }

  const installed = getInstalledSkills();

  // Terminal width — cap at 100 for readability
  const termWidth = Math.min(process.stdout.columns ?? 80, 100);
  // Description text starts after "  │  " (5 chars)
  const descIndent = '  │  ';
  const descWidth = termWidth - descIndent.length;

  const topLine = `  ┌${'─'.repeat(termWidth - 3)}`;
  const divLine = `  ├${'─'.repeat(termWidth - 3)}`;
  const botLine = `  └${'─'.repeat(termWidth - 3)}`;

  console.log();
  console.log(chalk.dim(`  ${skills.length} skill${skills.length === 1 ? '' : 's'} available`));
  console.log(chalk.dim(topLine));

  for (const [idx, skill] of skills.entries()) {
    const entry = installed[skill.name];
    const badge = entry
      ? chalk.bgGreen.black(' INSTALLED ')
      : chalk.bgGray.white(' NOT INSTALLED ');

    const versionLabel = chalk.dim(`v${skill.version}`);
    const nameLabel = chalk.bold.cyan(skill.name);

    // Row 1: name + version + badge
    console.log(`  ${chalk.dim('│')}  ${nameLabel}  ${versionLabel}  ${badge}`);

    // Row 2: description (wrapped)
    const wrapped = wrapText(skill.description, descWidth, descIndent);
    console.log(chalk.dim(wrapped));

    // Separator or closing line
    if (idx < skills.length - 1) {
      console.log(chalk.dim(divLine));
    }
  }

  console.log(chalk.dim(botLine));
  console.log();
  log.info(`Run ${chalk.cyan('bv add skill <name>')} to install a skill.`);
  console.log();
});
