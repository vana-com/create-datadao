// Mock Logger first to avoid hoisting issues
const mockLoggerInstance = {
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn()
};

const MockLogger = jest.fn().mockImplementation(() => mockLoggerInstance);
jest.mock('../../shared/logger', () => MockLogger);

// Mock the command modules
const mockCreateCommand = {
  handler: jest.fn()
};

const mockStatusCommand = {
  handler: jest.fn()
};

const mockDeployCommand = {
  contracts: jest.fn(),
  register: jest.fn(),
  ui: jest.fn()
};

jest.mock('../commands/create', () => mockCreateCommand);
jest.mock('../commands/status', () => mockStatusCommand);
jest.mock('../commands/deploy', () => mockDeployCommand);

const CLI = require('../index');

describe('CLI', () => {
  let cli;
  let mockExit;
  let mockConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    cli = new CLI();
    
    // Mock process.exit to prevent tests from actually exiting
    mockExit = jest.spyOn(process, 'exit').mockImplementation();
    
    // Mock console.error
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
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
      
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'normal',
        useColors: undefined
      });
    });

    test('should create logger with quiet option', () => {
      const logger = cli._createLogger({ quiet: true });
      
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'quiet',
        useColors: undefined
      });
    });

    test('should create logger with verbose option', () => {
      const logger = cli._createLogger({ verbose: true });
      
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'verbose',
        useColors: undefined
      });
    });

    test('should create logger with color option', () => {
      const logger = cli._createLogger({ color: false });
      
      expect(MockLogger).toHaveBeenCalledWith({
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

    test('should handle unknown commands', async () => {
      // Mock parseAsync to prevent actual parsing
      jest.spyOn(cli.program, 'parseAsync').mockResolvedValue();
      
      // Run the CLI to set up event listeners
      await cli.run();
      
      // Simulate unknown command event
      cli.program.emit('command:*', ['unknown-command']);
      
      expect(mockConsoleError).toHaveBeenCalledWith('Unknown command. Use --help to see available commands.');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Integration Tests', () => {
    test('should create logger with mixed options', () => {
      const logger1 = cli._createLogger({ quiet: true, color: false });
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'quiet',
        useColors: false
      });

      const logger2 = cli._createLogger({ verbose: true, color: true });
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'verbose',
        useColors: true
      });
    });

    test('should handle verbose and quiet options precedence', () => {
      // Verbose should take precedence over quiet
      const logger = cli._createLogger({ quiet: true, verbose: true });
      expect(MockLogger).toHaveBeenCalledWith({
        verbosity: 'verbose',
        useColors: undefined
      });
    });
  });
}); 