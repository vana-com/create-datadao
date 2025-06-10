const { Command } = require('commander');
const Logger = require('../shared/logger');

// Import command handlers
const createCommand = require('./commands/create');
const statusCommand = require('./commands/status');
const deployCommand = require('./commands/deploy');

/**
 * Main CLI application setup
 * Extracted from the original bin/create-datadao.js for better organization
 */
class CLI {
  constructor() {
    this.program = new Command();
    this.logger = null;
  }

  /**
   * Initialize and run the CLI
   */
  async run() {
    // Set up the program
    this.program
      .name('create-datadao')
      .description('Create and manage DataDAO projects on the Vana network')
      .version('1.1.1');

    // Global options for verbosity
    this.program
      .option('-q, --quiet', 'Minimize output (errors only)')
      .option('-v, --verbose', 'Show detailed output')
      .option('--no-color', 'Disable colored output');

    // Register commands
    this._registerCommands();

    // Handle unknown commands gracefully
    this.program.on('command:*', () => {
      console.error('Unknown command. Use --help to see available commands.');
      process.exit(1);
    });

    // Parse and execute
    await this.program.parseAsync();
  }

  /**
   * Create logger based on options
   */
  _createLogger(options) {
    let verbosity = 'normal';
    if (options.quiet) verbosity = 'quiet';
    if (options.verbose) verbosity = 'verbose';

    return new Logger({
      verbosity,
      useColors: options.color
    });
  }

  /**
   * Register all CLI commands
   */
  _registerCommands() {
    // Main create command
    this.program
      .command('create [project-name]')
      .description('Create a new DataDAO project')
      .option('-c, --config <path>', 'Load configuration from JSON file')
      .option('--quick', 'Quick setup with minimal prompts')
      .action(async (projectName, options) => {
        const globalOpts = this.program.opts();
        const logger = this._createLogger(globalOpts);
        await createCommand.handler(projectName, options, logger);
      });

    // Status command - works from anywhere
    this.program
      .command('status [project-path]')
      .description('Check DataDAO project status')
      .action(async (projectPath) => {
        const globalOpts = this.program.opts();
        const logger = this._createLogger(globalOpts);
        await statusCommand.handler(projectPath, logger);
      });

    // Deploy commands - work from anywhere
    this.program
      .command('deploy:contracts [project-path]')
      .description('Deploy smart contracts for a DataDAO project')
      .action(async (projectPath) => {
        const globalOpts = this.program.opts();
        const logger = this._createLogger(globalOpts);
        await deployCommand.contracts(projectPath, logger);
      });

    this.program
      .command('register [project-path]')
      .description('Register DataDAO on the Vana network')
      .action(async (projectPath) => {
        const globalOpts = this.program.opts();
        const logger = this._createLogger(globalOpts);
        await deployCommand.register(projectPath, logger);
      });

    this.program
      .command('ui [project-path]')
      .description('Start the DataDAO UI development server')
      .action(async (projectPath) => {
        const globalOpts = this.program.opts();
        const logger = this._createLogger(globalOpts);
        await deployCommand.ui(projectPath, logger);
      });
  }
}

module.exports = CLI; 