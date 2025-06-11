const statusCommand = require('../status');

// Mock dependencies
const mockLogger = {
  step: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn()
};

describe('StatusCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.exit spy
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exit.mockRestore();
  });

  describe('handler', () => {
    test('should handle status check with project path', async () => {
      await statusCommand.handler('/path/to/project', mockLogger);
      
      expect(mockLogger.step).toHaveBeenCalledWith(
        'Status Command',
        'This command is currently stubbed out'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Would check status for project at:')
      );
      expect(mockLogger.warning).toHaveBeenCalledWith(
        '🚧 Status command is not yet implemented'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'This is Phase 1 - setting up CLI foundation'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'The status functionality will be added in the next phase'
      );
    });

    test('should handle status check without project path', async () => {
      await statusCommand.handler(undefined, mockLogger);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Would check status for project in current directory'
      );
    });

    test('should handle relative project paths', async () => {
      await statusCommand.handler('./my-project', mockLogger);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Would check status for project at:')
      );
    });

    test('should handle errors in status check', async () => {
      const error = new Error('Status check error');
      mockLogger.step.mockImplementation(() => {
        throw error;
      });

      await statusCommand.handler('/path/to/project', mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking status: Status check error'
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(error.stack);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
}); 