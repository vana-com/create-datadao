// Mock the CLI module before importing it
const mockCLI = {
  run: jest.fn()
};

jest.mock('../../lib/cli/index', () => {
  return jest.fn().mockImplementation(() => mockCLI);
});

describe('create-datadao binary', () => {
  let processExitSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.exit to prevent actual exits in tests
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    // Mock console.error to capture error output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear any existing event listeners
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
    
    // Reset the module registry to get a fresh import
    jest.resetModules();
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should successfully run CLI', async () => {
    // Make CLI.run() resolve successfully
    mockCLI.run.mockResolvedValue();

    // Import and run the binary
    require('../create-datadao');

    // Give the async main function time to complete
    await new Promise(resolve => setImmediate(resolve));

    // Verify CLI was instantiated and run
    const CLI = require('../../lib/cli/index');
    expect(CLI).toHaveBeenCalled();
    expect(mockCLI.run).toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  test('should handle CLI errors gracefully', async () => {
    // Make CLI.run() reject with an error
    const testError = new Error('CLI error');
    mockCLI.run.mockRejectedValue(testError);

    // Import and run the binary
    require('../create-datadao');

    // Give the async main function time to complete
    await new Promise(resolve => setImmediate(resolve));

    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', 'CLI error');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test('should show stack trace in development environment', async () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Make CLI.run() reject with an error
    const testError = new Error('CLI error');
    testError.stack = 'Error stack trace';
    mockCLI.run.mockRejectedValue(testError);

    // Import and run the binary
    require('../create-datadao');

    // Give the async main function time to complete
    await new Promise(resolve => setImmediate(resolve));

    // Verify error handling with stack trace
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', 'CLI error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error stack trace');
    expect(processExitSpy).toHaveBeenCalledWith(1);

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test('should handle unhandled promise rejections', async () => {
    // Import the binary to set up event handlers
    require('../create-datadao');

    // Create a promise that we'll reject but won't cause unhandled rejection in test
    const testReason = 'Unhandled rejection reason';
    const testPromise = new Promise((resolve, reject) => {
      // Don't actually reject it immediately to avoid test issues
      setTimeout(() => reject(testReason), 0);
    });
    
    // Add a catch to prevent actual unhandled rejection during test
    testPromise.catch(() => {});
    
    // Emit the unhandled rejection event manually
    process.emit('unhandledRejection', testReason, testPromise);

    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection at:', 
      testPromise, 
      'reason:', 
      testReason
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test('should handle uncaught exceptions', async () => {
    // Import the binary to set up event handlers
    require('../create-datadao');

    // Emit an uncaught exception
    const testError = new Error('Uncaught exception');
    process.emit('uncaughtException', testError);

    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalledWith('Uncaught Exception:', testError);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
}); 