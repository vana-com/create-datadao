// Mock chalk manually since we need specific behavior
jest.mock('chalk', () => {
    const mockFn = (text) => `MOCKED:${text}`;
    return {
      red: mockFn,
      green: mockFn,
      yellow: mockFn,
      cyan: mockFn,
      gray: mockFn,
      blue: Object.assign(mockFn, {
        bold: mockFn
      })
    };
  });
  
  // Use automocking for ora - much simpler!
  jest.mock('ora');
  
  const Logger = require('../logger');
  const ora = require('ora');
  
  describe('Logger', () => {
    let logger;
    let consoleSpy;
    let mockSpinner;
  
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
      
      // Create a mock spinner instance that ora will return
      mockSpinner = {
        start: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        succeed: jest.fn().mockReturnThis(),
        fail: jest.fn().mockReturnThis(),
        text: ''
      };
      
      // Make ora return our mock spinner
      ora.mockReturnValue(mockSpinner);
      
      // Spy on console.log to capture output
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create a fresh logger instance
      logger = new Logger();
    });
  
    afterEach(() => {
      consoleSpy.mockRestore();
    });
  
    describe('Constructor and Configuration', () => {
      test('should create logger with default options', () => {
        const defaultLogger = new Logger();
        expect(defaultLogger.verbosity).toBe('normal');
        expect(defaultLogger.useColors).toBe(true);
        expect(defaultLogger.spinner).toBeNull();
      });
  
      test('should create logger with custom options', () => {
        const customLogger = new Logger({
          verbosity: 'verbose',
          useColors: false
        });
        expect(customLogger.verbosity).toBe('verbose');
        expect(customLogger.useColors).toBe(false);
      });
  
      test('should set verbosity level', () => {
        logger.setVerbosity('quiet');
        expect(logger.verbosity).toBe('quiet');
      });
    });
  
    describe('Always Shown Messages', () => {
      test('should always show error messages', () => {
        logger.error('test error');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:❌ test error');
      });
  
      test('should always show success messages', () => {
        logger.success('test success');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:✅ test success');
      });
  
      test('should always show warning messages', () => {
        logger.warning('test warning');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:⚠️ test warning');
      });
  
      test('should show error messages even in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.error('quiet error');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:❌ quiet error');
      });
    });
  
    describe('Normal Verbosity Messages', () => {
      test('should show info messages in normal mode', () => {
        logger.info('test info');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:ℹ️ test info');
      });
  
      test('should show log messages in normal mode', () => {
        logger.log('test log');
        expect(consoleSpy).toHaveBeenCalledWith('test log');
      });
  
      test('should show step messages in normal mode', () => {
        logger.step('Test Step', 'Step description');
        expect(consoleSpy).toHaveBeenNthCalledWith(1); // Empty line (no args)
        expect(consoleSpy).toHaveBeenNthCalledWith(2, 'MOCKED:🔄 Test Step');
        expect(consoleSpy).toHaveBeenNthCalledWith(3, 'MOCKED:   Step description');
        expect(consoleSpy).toHaveBeenNthCalledWith(4); // Empty line (no args)
      });
  
      test('should not show info messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.info('quiet info');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should show forced info messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.info('forced info', { force: true });
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:ℹ️ forced info');
      });
  
      test('should not show log messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.log('quiet log');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should show forced log messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.log('forced log', { force: true });
        expect(consoleSpy).toHaveBeenCalledWith('forced log');
      });
  
      test('should not show step messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.step('Quiet Step');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });
  
    describe('Verbose-Only Messages', () => {
      test('should not show verbose messages in normal mode', () => {
        logger.verbose('verbose message');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should not show debug messages in normal mode', () => {
        logger.debug('debug message');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should show verbose messages in verbose mode', () => {
        logger.setVerbosity('verbose');
        logger.verbose('verbose message');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:🔍 verbose message');
      });
  
      test('should show debug messages in verbose mode', () => {
        logger.setVerbosity('verbose');
        logger.debug('debug message');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:[DEBUG] debug message');
      });
  
      test('should not show verbose messages in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.verbose('quiet verbose');
        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });
  
    describe('Spinner Functionality', () => {
      test('should start spinner in normal mode', () => {
        logger.startSpinner('Loading...');
        expect(ora).toHaveBeenCalledWith('Loading...');
        expect(mockSpinner.start).toHaveBeenCalled();
        expect(logger.spinner).toBe(mockSpinner);
      });
  
      test('should not start spinner in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.startSpinner('Loading...');
        expect(ora).not.toHaveBeenCalled();
      });
  
      test('should update spinner text', () => {
        logger.startSpinner('Loading...');
        logger.updateSpinner('Still loading...');
        expect(mockSpinner.text).toBe('Still loading...');
      });
  
      test('should succeed spinner', () => {
        logger.startSpinner('Loading...');
        logger.succeedSpinner('Done!');
        expect(mockSpinner.succeed).toHaveBeenCalledWith('Done!');
        expect(logger.spinner).toBeNull();
      });
  
      test('should fail spinner', () => {
        logger.startSpinner('Loading...');
        logger.failSpinner('Failed!');
        expect(mockSpinner.fail).toHaveBeenCalledWith('Failed!');
        expect(logger.spinner).toBeNull();
      });
  
      test('should stop spinner before showing other messages', () => {
        logger.startSpinner('Loading...');
        logger.info('Info message');
        expect(mockSpinner.stop).toHaveBeenCalled();
        expect(logger.spinner).toBeNull();
      });
    });
  
    describe('Color Functionality', () => {
      test('should apply colors when useColors is true', () => {
        const colorLogger = new Logger({ useColors: true });
        colorLogger.error('colored error');
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:❌ colored error');
      });
  
      test('should not apply colors when useColors is false', () => {
        const noColorLogger = new Logger({ useColors: false });
        noColorLogger.error('plain error');
        expect(consoleSpy).toHaveBeenCalledWith('❌ plain error');
      });
    });
  
    describe('Section and Helper Methods', () => {
      test('should show section with string items', () => {
        const items = ['Item 1', 'Item 2', 'Item 3'];
        logger.showSection('Test Section', items);
        
        expect(consoleSpy).toHaveBeenNthCalledWith(1); // Empty line (no args)
        expect(consoleSpy).toHaveBeenNthCalledWith(2, 'MOCKED:📋 Test Section');
        expect(consoleSpy).toHaveBeenNthCalledWith(3, '  • Item 1');
        expect(consoleSpy).toHaveBeenNthCalledWith(4, '  • Item 2');
        expect(consoleSpy).toHaveBeenNthCalledWith(5, '  • Item 3');
        expect(consoleSpy).toHaveBeenNthCalledWith(6); // Empty line (no args)
      });
  
      test('should show section with object items', () => {
        const items = [
          { label: 'Name', value: 'Test' },
          { label: 'Version', value: '1.0.0' }
        ];
        logger.showSection('Config', items);
        
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• MOCKED:Name: Test'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• MOCKED:Version: 1.0.0'));
      });
  
      test('should not show section in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.showSection('Quiet Section', ['Item']);
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should show next steps', () => {
        const steps = ['Step 1', 'Step 2'];
        logger.showNextSteps(steps);
        
        expect(consoleSpy).toHaveBeenNthCalledWith(1); // Empty line (no args)
        expect(consoleSpy).toHaveBeenNthCalledWith(2, 'MOCKED:🚀 Next Steps:');
        expect(consoleSpy).toHaveBeenNthCalledWith(3, '  1. Step 1');
        expect(consoleSpy).toHaveBeenNthCalledWith(4, '  2. Step 2');
        expect(consoleSpy).toHaveBeenNthCalledWith(5); // Empty line (no args)
      });
  
      test('should not show next steps in quiet mode', () => {
        logger.setVerbosity('quiet');
        logger.showNextSteps(['Step']);
        expect(consoleSpy).not.toHaveBeenCalled();
      });
  
      test('should show exit message', () => {
        logger.showExitMessage();
        expect(consoleSpy).toHaveBeenNthCalledWith(1); // Empty line (no args)
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MOCKED:━'));
        expect(consoleSpy).toHaveBeenCalledWith('MOCKED:📋 Useful Commands:');
        // Should contain help text
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('create-datadao status'));
      });
    });
  
    describe('Edge Cases', () => {
      test('should handle updateSpinner when no spinner exists', () => {
        expect(() => {
          logger.updateSpinner('No spinner');
        }).not.toThrow();
      });
  
      test('should handle succeedSpinner when no spinner exists', () => {
        expect(() => {
          logger.succeedSpinner('No spinner');
        }).not.toThrow();
      });
  
      test('should handle failSpinner when no spinner exists', () => {
        expect(() => {
          logger.failSpinner('No spinner');
        }).not.toThrow();
      });
  
      test('should handle step with empty description', () => {
        logger.step('Test Step');
        expect(consoleSpy).toHaveBeenNthCalledWith(2, 'MOCKED:🔄 Test Step');
        // Should only be 3 calls: empty line, step title, empty line
        expect(consoleSpy).toHaveBeenCalledTimes(3);
      });
    });
  }); 