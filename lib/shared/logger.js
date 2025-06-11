const chalk = require('chalk');
const ora = require('ora');
const { SYMBOLS, MESSAGES } = require('./constants');
const MessageFormatter = require('./messages');

/**
 * Centralized logger with verbosity control
 * Consolidates console.log, chalk, ora, and output.js approaches
 * Now uses SSOT constants for consistent messaging
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
    console.log(this._colorize(chalk.red, `${SYMBOLS.ERROR} ${message}`));
  }

  success(message) {
    this._stopSpinner();
    console.log(this._colorize(chalk.green, `${SYMBOLS.SUCCESS} ${message}`));
  }

  warning(message) {
    this._stopSpinner();
    console.log(this._colorize(chalk.yellow, `${SYMBOLS.WARNING} ${message}`));
  }

  /**
   * Normal verbosity messages
   */
  info(message, options = {}) {
    if (this.verbosity === 'quiet' && !options.force) return;
    this._stopSpinner();
    console.log(this._colorize(chalk.cyan, `${SYMBOLS.INFO} ${message}`));
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
    console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.STEP} ${title}`));
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
    console.log(this._colorize(chalk.gray, `${SYMBOLS.SEARCH} ${message}`));
  }

  debug(message) {
    if (this.verbosity !== 'verbose') return;
    this._stopSpinner();
    console.log(this._colorize(chalk.gray, `[DEBUG] ${message}`));
  }

  /**
   * Progress message
   */
  progress(message) {
    if (this.verbosity === 'quiet') return;
    this._stopSpinner();
    console.log(this._colorize(chalk.blue, `${SYMBOLS.PROGRESS} ${message}`));
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
   * Show helpful sections using SSOT formatting
   */
  showSection(title, items) {
    if (this.verbosity === 'quiet') return;
    console.log();
    console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.CLIPBOARD} ${title}`));
    items.forEach(item => {
      if (typeof item === 'string') {
        console.log(`  ${SYMBOLS.BULLET} ${item}`);
      } else {
        console.log(`  ${SYMBOLS.BULLET} ${this._colorize(chalk.cyan, item.label)}: ${item.value}`);
      }
    });
    console.log();
  }

  showNextSteps(steps) {
    if (this.verbosity === 'quiet') return;
    console.log();
    console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.ROCKET} ${MESSAGES.HELP.USEFUL_COMMANDS.replace('Useful Commands:', 'Next Steps:')}`));
    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    console.log();
  }

  /**
   * Show exit message with help using SSOT messages
   */
  showExitMessage() {
    console.log();
    console.log(this._colorize(chalk.blue, SYMBOLS.DIVIDER.repeat(40)));
    console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.CLIPBOARD} ${MESSAGES.HELP.USEFUL_COMMANDS}`));
    console.log();
    console.log(this._colorize(chalk.cyan, '  create-datadao status     ') + '- ' + MESSAGES.HELP.STATUS_CHECK.split(' - ')[1]);
    console.log(this._colorize(chalk.cyan, '  create-datadao status .   ') + '- ' + MESSAGES.HELP.STATUS_CURRENT.split(' - ')[1]);
    console.log();
    console.log(this._colorize(chalk.gray, `${SYMBOLS.INFO} ${MESSAGES.HELP.TIPS.RUN_FROM_PROJECT}`));
    console.log(this._colorize(chalk.gray, `${SYMBOLS.INFO} ${MESSAGES.HELP.TIPS.CONFIG_VIA_JSON}`));
    console.log(this._colorize(chalk.gray, `${SYMBOLS.INFO} ${MESSAGES.HELP.TIPS.GET_TESTNET_VANA}`));
    console.log(this._colorize(chalk.blue, SYMBOLS.DIVIDER.repeat(40)));
  }

  /**
   * Show summary with status icons using SSOT formatting
   */
  showSummary(title, items) {
    if (this.verbosity === 'quiet') return;
    console.log();
    console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.CHART} ${title}`));
    
    items.forEach(item => {
      const symbol = item.completed ? SYMBOLS.SUCCESS : SYMBOLS.PAUSE;
      console.log(`  ${symbol} ${item.description}`);
    });
    console.log();
  }

  /**
   * Show completion message using SSOT messages
   */
  showCompletion(isFullyConfigured, actions = []) {
    console.log();
    
    if (isFullyConfigured) {
      console.log(this._colorize(chalk.green, `${SYMBOLS.CELEBRATION} ${MESSAGES.COMPLETION.FULL_SUCCESS}`));
      console.log();
      console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.TARGET} ${MESSAGES.COMPLETION.WHAT_NOW_HEADER}`));
    } else {
      console.log(this._colorize(chalk.yellow, `${SYMBOLS.WARNING} ${MESSAGES.COMPLETION.PARTIAL_WARNING}`));
      console.log();
      console.log(this._colorize(chalk.blue.bold, `${SYMBOLS.TARGET} ${MESSAGES.COMPLETION.COMPLETE_SETUP_HEADER}`));
    }
    
    actions.forEach(action => {
      console.log(`  ${SYMBOLS.BULLET} ${action}`);
    });
    console.log();
  }

  /**
   * Show project location and commands using SSOT messages
   */
  showProjectInfo(projectPath) {
    console.log();
    console.log(this._colorize(chalk.blue, `${SYMBOLS.FOLDER} ${MessageFormatter.interpolate(MESSAGES.HELP.PROJECT_LOCATION, { path: projectPath })}`));
    console.log(this._colorize(chalk.blue, `${SYMBOLS.BOOKS} ${MESSAGES.HELP.CHECK_PROGRESS}`));
    console.log(this._colorize(chalk.blue, `${SYMBOLS.BOOKS} ${MESSAGES.HELP.RESUME_SETUP}`));
  }

  /**
   * Show step with consistent formatting using SSOT
   */
  showStep(stepKey, variables = {}) {
    const stepMessages = MESSAGES.STEPS[stepKey];
    if (!stepMessages) {
      this.error(`Unknown step: ${stepKey}`);
      return;
    }

    this.step(
      MessageFormatter.interpolate(stepMessages.TITLE, variables),
      MessageFormatter.interpolate(stepMessages.DESCRIPTION, variables)
    );

    if (stepMessages.WARNING) {
      this.warning(MessageFormatter.interpolate(stepMessages.WARNING, variables));
    }
  }

  /**
   * Show operation progress with SSOT formatting
   */
  showOperationProgress(operationKey, variables = {}) {
    const operation = MESSAGES.OPERATIONS[operationKey];
    if (operation) {
      this.progress(MessageFormatter.interpolate(operation, variables));
    }
  }
}

module.exports = Logger; 