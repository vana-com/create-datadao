const CLI = require('../index');

// Mock the command modules
jest.mock('../commands/create', () => ({
  handler: jest.fn()
}));

jest.mock('../commands/status', () => ({
  handler: jest.fn()
}));

jest.mock('../commands/deploy', () => ({
  contracts: jest.fn(),
  register: jest.fn(),
  ui: jest.fn()
}));

// Mock Logger
jest.mock('../../shared/logger');

describe('CLI', () => {
  let cli;
  let mockExit;

  beforeEach(() => {
    jest.clearAllMocks();
    cli = new CLI();
    
    // Mock process.exit to prevent tests from actually exiting
    mockExit = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('Constructor', () => {
    test('should initialize CLI with commander program', () => {
      expect(cli.program).toBeDefined();
      expect(cli.logger).toBeNull();
    });
  });

  describe('Logger Creation', () => {
    test('should create logger with default options', () => {
      const logger = cli._createLogger({});
      const Logger = require('../../shared/logger');
      
      expect(Logger).toHaveBeenCalledWith({
        verbosity: 'normal',
        useColors: undefined
      });
    });

    test('should create logger with quiet option', () => {
      const logger = cli._createLogger({ quiet: true });
      const Logger = require('../../shared/logger');
      
      expect(Logger).toHaveBeenCalledWith({
        verbosity: 'quiet',
        useColors: undefined
      });
    });

    test('should create logger with verbose option', () => {
      const logger = cli._createLogger({ verbose: true });
      const Logger = require('../../shared/logger');
      
      expect(Logger).toHaveBeenCalledWith({
        verbosity: 'verbose',
        useColors: undefined
      });
    });

    test('should create logger with color option', () => {
      const logger = cli._createLogger({ color: false });
      const Logger = require('../../shared/logger');
      
      expect(Logger).toHaveBeenCalledWith({
        verbosity: 'normal',
        useColors: false
      });
    });
  });

  describe('Command Registration', () => {
    test('should register all commands', () => {
      // This tests that the commands are registered without errors
      expect(() => {
        cli._registerCommands();
      }).not.toThrow();
    });

    test('should register create command with correct options', () => {
      cli._registerCommands();
      const commands = cli.program.commands;
      const createCommand = commands.find(cmd => cmd.name() === 'create');
      
      expect(createCommand).toBeDefined();
      expect(createCommand.description()).toBe('Create a new DataDAO project');
      
      // Check options
      const options = createCommand.options;
      expect(options.some(opt => opt.long === '--config')).toBe(true);
      expect(options.some(opt => opt.long === '--quick')).toBe(true);
    });

    test('should register status command', () => {
      cli._registerCommands();
      const commands = cli.program.commands;
      const statusCommand = commands.find(cmd => cmd.name() === 'status');
      
      expect(statusCommand).toBeDefined();
      expect(statusCommand.description()).toBe('Check DataDAO project status');
    });

    test('should register deploy commands', () => {
      cli._registerCommands();
      const commands = cli.program.commands;
      
      const deployContractsCommand = commands.find(cmd => cmd.name() === 'deploy:contracts');
      const registerCommand = commands.find(cmd => cmd.name() === 'register');
      const uiCommand = commands.find(cmd => cmd.name() === 'ui');
      
      expect(deployContractsCommand).toBeDefined();
      expect(registerCommand).toBeDefined();
      expect(uiCommand).toBeDefined();
    });
  });

  describe('Program Configuration', () => {
    test('should set correct program metadata', async () => {
      // Mock parseAsync to prevent actual parsing
      jest.spyOn(cli.program, 'parseAsync').mockResolvedValue();
      
      await cli.run();
      
      expect(cli.program.name()).toBe('create-datadao');
      expect(cli.program.description()).toBe('Create and manage DataDAO projects on the Vana network');
      expect(cli.program.version()).toBe('1.1.1');
    });

    test('should register global options', async () => {
      jest.spyOn(cli.program, 'parseAsync').mockResolvedValue();
      
      await cli.run();
      
      const options = cli.program.options;
      expect(options.some(opt => opt.long === '--quiet')).toBe(true);
      expect(options.some(opt => opt.long === '--verbose')).toBe(true);
      expect(options.some(opt => opt.long === '--no-color')).toBe(true);
    });
  });
}); 