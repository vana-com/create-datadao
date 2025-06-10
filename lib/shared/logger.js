const chalk = require('chalk');
const ora = require('ora');

/**
 * Centralized logger with verbosity control
 * Consolidates console.log, chalk, ora, and output.js approaches
 */
class Logger {
  constructor(options = {}) {
    this.verbosity = options.verbosity || 'normal'; // quiet, normal, verbose
    this.useColors = options.useColors !== false; // default true
    this.spinner = null;
  }

  /**
   * Set verbosity level
   * @param {string} level - quiet, normal, verbose
   */
  setVerbosity(level) {
    this.verbosity = level;
  }

  /**
   * Always shown messages (errors, critical info)
   */
  error(message) {
    this._stopSpinner();
    console.log(this._colorize(chalk.red, `❌ ${message}`));
  }

  success(message) {
    this._stopSpinner();
    console.log(this._colorize(chalk.green, `✅ ${message}`));
  }

  warning(message) {
    this._stopSpinner();
    console.log(this._colorize(chalk.yellow, `⚠️  ${message}`));
  }

  /**
   * Normal verbosity messages
   */
  info(message, options = {}) {
    if (this.verbosity === 'quiet' && !options.force) return;
    this._stopSpinner();
    console.log(this._colorize(chalk.cyan, `ℹ️  ${message}`));
  }

  log(message, options = {}) {
    if (this.verbosity === 'quiet' && !options.force) return;
    this._stopSpinner();
    console.log(message);
  }

  step(title, description = '') {
    if (this.verbosity === 'quiet') return;
    this._stopSpinner();
    console.log();
    console.log(this._colorize(chalk.blue.bold, `🔄 ${title}`));
    if (description) {
      console.log(this._colorize(chalk.gray, `   ${description}`));
    }
    console.log();
  }

  /**
   * Verbose-only messages (debug info)
   */
  verbose(message) {
    if (this.verbosity !== 'verbose') return;
    this._stopSpinner();
    console.log(this._colorize(chalk.gray, `🔍 ${message}`));
  }

  debug(message) {
    if (this.verbosity !== 'verbose') return;
    this._stopSpinner();
    console.log(this._colorize(chalk.gray, `[DEBUG] ${message}`));
  }

  /**
   * Spinner for long operations
   */
  startSpinner(message) {
    if (this.verbosity === 'quiet') return;
    this.spinner = ora(message).start();
  }

  updateSpinner(message) {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeedSpinner(message) {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  failSpinner(message) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  _stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Apply colors if enabled
   */
  _colorize(chalkFunction, text) {
    return this.useColors ? chalkFunction(text) : text;
  }

  /**
   * Show helpful sections
   */
  showSection(title, items) {
    if (this.verbosity === 'quiet') return;
    console.log();
    console.log(this._colorize(chalk.blue.bold, `📋 ${title}`));
    items.forEach(item => {
      if (typeof item === 'string') {
        console.log(`  • ${item}`);
      } else {
        console.log(`  • ${this._colorize(chalk.cyan, item.label)}: ${item.value}`);
      }
    });
    console.log();
  }

  showNextSteps(steps) {
    if (this.verbosity === 'quiet') return;
    console.log();
    console.log(this._colorize(chalk.blue.bold, '🚀 Next Steps:'));
    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    console.log();
  }

  showExitMessage() {
    console.log();
    console.log(this._colorize(chalk.blue, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(this._colorize(chalk.blue.bold, '📌 Useful Commands:'));
    console.log();
    console.log(this._colorize(chalk.cyan, '  create-datadao status     ') + '- Check progress & resume setup');
    console.log(this._colorize(chalk.cyan, '  create-datadao status .   ') + '- Status for current directory');
    console.log();
    console.log(this._colorize(chalk.gray, '💡 Tip: Run commands from your project directory'));
    console.log(this._colorize(chalk.gray, '💡 Tip: Provide config via JSON: --config my-config.json'));
    console.log(this._colorize(chalk.gray, '💡 Tip: Get testnet VANA at https://faucet.vana.org'));
    console.log(this._colorize(chalk.blue, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }
}

module.exports = Logger; 