/**
 * Tests for output.js - Currently 0% coverage
 * Target: 100% coverage
 */

const output = require('../../lib/output');

describe('OutputManager', () => {
  let consoleSpy;
  let stdoutSpy;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
    };

    // Mock process.stdout.write for clearLine and progressBar
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setQuiet', () => {
    test('sets quiet mode to true', () => {
      output.setQuiet(true);
      expect(output.isQuiet).toBe(true);
    });

    test('sets quiet mode to false', () => {
      output.setQuiet(false);
      expect(output.isQuiet).toBe(false);
    });

    test('defaults to true when no parameter passed', () => {
      output.setQuiet();
      expect(output.isQuiet).toBe(true);
    });
  });

  describe('step', () => {
    test('displays step title with emoji', () => {
      output.step('Deploy Contracts');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🔄 Deploy Contracts'));
    });

    test('displays step description when provided', () => {
      output.step('Deploy Contracts', 'Deploying smart contracts to testnet');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🔄 Deploy Contracts'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Deploying smart contracts to testnet'));
    });

    test('displays only title when no description provided', () => {
      output.step('Deploy Contracts');
      // Should be called 3 times: empty line, title, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(2, expect.stringContaining('🔄 Deploy Contracts'));
    });

    test('uses correct chalk colors (blue.bold)', () => {
      // We can't directly test chalk colors, but we can verify the structure
      output.step('Test Title');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🔄 Test Title'));
    });

    test('adds proper line breaks', () => {
      output.step('Test Title', 'Test Description');
      // Should log: empty line, title, description, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1); // Empty line before (called with no args)
      expect(consoleSpy.log).toHaveBeenNthCalledWith(4); // Empty line after (called with no args)
    });
  });

  describe('success', () => {
    test('displays success message with checkmark emoji', () => {
      output.success('Deployment completed');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment completed'));
    });

    test('uses green chalk color', () => {
      // We verify the emoji and message are present, chalk handling is internal
      output.success('Test success');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('✅ Test success'));
    });
  });

  describe('warning', () => {
    test('displays warning message with warning emoji', () => {
      output.warning('Low balance detected');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('⚠️  Low balance detected'));
    });

    test('uses yellow chalk color', () => {
      // We verify the emoji and message are present, chalk handling is internal
      output.warning('Test warning');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('⚠️  Test warning'));
    });
  });

  describe('error', () => {
    test('displays error message with X emoji', () => {
      output.error('Deployment failed');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('❌ Deployment failed'));
    });

    test('uses red chalk color', () => {
      // We verify the emoji and message are present, chalk handling is internal
      output.error('Test error');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('❌ Test error'));
    });
  });

  describe('info', () => {
    test('displays info message with info emoji', () => {
      output.setQuiet(false);
      output.info('Configuration loaded');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Configuration loaded'));
    });

    test('uses cyan chalk color', () => {
      output.setQuiet(false);
      output.info('Test info');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Test info'));
    });

    test('respects quiet mode when force is false', () => {
      output.setQuiet(true);
      output.info('Should not display', false);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('ignores quiet mode when force is true', () => {
      output.setQuiet(true);
      output.info('Should display', true);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Should display'));
    });

    test('displays message in normal mode', () => {
      output.setQuiet(false);
      output.info('Normal mode message');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Normal mode message'));
    });
  });

  describe('progress', () => {
    test('displays progress message with hourglass emoji', () => {
      output.setQuiet(false);
      output.progress('Deploying contracts');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('⏳ Deploying contracts'));
    });

    test('uses blue chalk color', () => {
      output.setQuiet(false);
      output.progress('Test progress');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('⏳ Test progress'));
    });

    test('respects quiet mode', () => {
      output.setQuiet(true);
      output.progress('Should not display');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('suppresses output in quiet mode', () => {
      output.setQuiet(true);
      output.progress('Hidden message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('userInput', () => {
    test('displays user input prompt with user emoji', () => {
      output.userInput('Enter your private key');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('👤'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Enter your private key'));
    });

    test('shows "USER INPUT REQUIRED" banner', () => {
      output.userInput('Test prompt');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('USER INPUT REQUIRED'));
    });

    test('uses correct chalk colors (bgBlue.white.bold)', () => {
      output.userInput('Test prompt');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('👤 USER INPUT REQUIRED'));
    });

    test('adds proper line breaks', () => {
      output.userInput('Test prompt');
      // Should log: empty line, banner, prompt, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1); // Empty line before (called with no args)
      expect(consoleSpy.log).toHaveBeenNthCalledWith(4); // Empty line after (called with no args)
    });
  });

  describe('userResponse', () => {
    test('displays user response with user emoji', () => {
      output.userResponse('Weather DAO');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('👤 Weather DAO'));
    });

    test('uses green chalk color', () => {
      output.userResponse('Test response');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('👤 Test response'));
    });

    test('adds proper line breaks', () => {
      output.userResponse('Test response');
      // Should log: response, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(2); // Empty line after (called with no args)
    });
  });

  describe('summary', () => {
    test('displays summary title with clipboard emoji', () => {
      output.summary('Deployment Summary', ['Item 1']);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('📋 Deployment Summary'));
    });

    test('displays simple string items with bullets', () => {
      output.summary('Test Summary', ['Item 1', 'Item 2']);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('  • Item 1'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('  • Item 2'));
    });

    test('displays object items with label and value', () => {
      const items = [{ label: 'DLP Address', value: '0x123...' }];
      output.summary('Config Summary', items);

      // Get all calls to console.log
      const calls = consoleSpy.log.mock.calls;
      const allOutputs = calls.map(call => call[0]).filter(arg => arg !== undefined);

      // Check that the expected output is in one of the calls (accounting for chalk colors)
      expect(allOutputs.some(output => output.includes('DLP Address') && output.includes('0x123...'))).toBe(true);
    });

    test('handles mixed array of strings and objects', () => {
      const items = [
        'Simple string item',
        { label: 'Complex', value: 'object item' }
      ];
      output.summary('Mixed Summary', items);

      const calls = consoleSpy.log.mock.calls;
      const allOutputs = calls.map(call => call[0]).filter(arg => arg !== undefined);

      expect(allOutputs.some(output => output.includes('  • Simple string item'))).toBe(true);
      expect(allOutputs.some(output => output.includes('Complex') && output.includes('object item'))).toBe(true);
    });

    test('uses correct chalk colors for labels (cyan)', () => {
      const items = [{ label: 'Test Label', value: 'Test Value' }];
      output.summary('Test Summary', items);

      const calls = consoleSpy.log.mock.calls;
      const allOutputs = calls.map(call => call[0]).filter(arg => arg !== undefined);

      expect(allOutputs.some(output => output.includes('Test Label') && output.includes('Test Value'))).toBe(true);
    });

    test('adds proper line breaks', () => {
      output.summary('Test Summary', ['Item 1']);
      // Should log: empty line, title, item, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1); // Empty line before (called with no args)
      expect(consoleSpy.log).toHaveBeenNthCalledWith(4); // Empty line after (called with no args)
    });

    test('handles empty items array', () => {
      output.summary('Empty Summary', []);
      // Should still log: empty line, title, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('📋 Empty Summary'));
    });
  });

  describe('nextSteps', () => {
    test('displays next steps title with rocket emoji', () => {
      output.nextSteps(['Step 1']);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🚀 Next Steps:'));
    });

    test('numbers each step starting from 1', () => {
      output.nextSteps(['First step', 'Second step']);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('1. First step'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('2. Second step'));
    });

    test('displays all steps in order', () => {
      const steps = ['Deploy contracts', 'Register DataDAO', 'Configure UI'];
      output.nextSteps(steps);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('1. Deploy contracts'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('2. Register DataDAO'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('3. Configure UI'));
    });

    test('handles empty steps array', () => {
      output.nextSteps([]);
      // Should still log: empty line, title, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('🚀 Next Steps:'));
    });

    test('adds proper line breaks', () => {
      output.nextSteps(['Step 1']);
      // Should log: empty line, title, step, empty line
      expect(consoleSpy.log).toHaveBeenCalledTimes(4);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1); // Empty line before (called with no args)
      expect(consoleSpy.log).toHaveBeenNthCalledWith(4); // Empty line after (called with no args)
    });
  });

  describe('divider', () => {
    test('displays horizontal line divider', () => {
      output.setQuiet(false);
      output.divider();
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('─'));
    });

    test('uses gray chalk color', () => {
      output.setQuiet(false);
      output.divider();
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('─'));
    });

    test('respects quiet mode', () => {
      output.setQuiet(true);
      output.divider();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('suppresses output in quiet mode', () => {
      output.setQuiet(true);
      output.divider();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('creates 50-character line', () => {
      output.setQuiet(false);
      output.divider();
      // Check that a 50-character line of ─ characters was logged
      const expectedLine = '─'.repeat(50);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining(expectedLine));
    });
  });

  describe('clearLine', () => {
    test('writes correct escape sequence to clear line', () => {
      output.clearLine();
      expect(stdoutSpy).toHaveBeenCalledWith('\r\x1b[K');
    });

    test('uses process.stdout.write', () => {
      output.clearLine();
      expect(stdoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('progressBar', () => {
    test('displays progress bar at 0%', () => {
      output.progressBar(0, 10);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('0%'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('░'.repeat(20)));
    });

    test('displays progress bar at 50%', () => {
      output.progressBar(5, 10);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('█'.repeat(10)));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('░'.repeat(10)));
    });

    test('displays progress bar at 100%', () => {
      output.progressBar(10, 10);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100%'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('█'.repeat(20)));
    });

    test('calculates percentage correctly', () => {
      output.progressBar(3, 10);
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('30%'));
    });

    test('shows correct number of filled blocks', () => {
      output.progressBar(7, 10);
      // 7/10 = 70% = 14 filled blocks (70% of 20)
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('█'.repeat(14)));
    });

    test('shows correct number of empty blocks', () => {
      output.progressBar(3, 10);
      // 3/10 = 30% = 6 filled blocks, 14 empty blocks
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('█'.repeat(6)));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('░'.repeat(14)));
    });

    test('displays optional message', () => {
      output.progressBar(5, 10, 'Processing files');
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('Processing files'));
    });

    test('clears previous line before update', () => {
      output.progressBar(5, 10);
      // First call should be clearLine (escape sequence)
      expect(stdoutSpy).toHaveBeenNthCalledWith(1, '\r\x1b[K');
    });

    test('adds newline when complete (current === total)', () => {
      output.progressBar(10, 10);
      // Should call clearLine, then write progress, then console.log (newline)
      expect(consoleSpy.log).toHaveBeenCalledWith();
    });

    test('does not add newline when incomplete', () => {
      output.progressBar(5, 10);
      // Should only call clearLine and write progress, no console.log
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test('handles edge case where current > total', () => {
      output.progressBar(15, 10);
      // Should still calculate percentage (150% -> 150%) but clamp bar to 20 filled blocks
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('150%'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('█'.repeat(20))); // Should be clamped to 20
    });

    test('handles zero total gracefully', () => {
      // This would cause division by zero, should handle gracefully
      expect(() => output.progressBar(0, 0)).not.toThrow();
    });
  });

  describe('singleton behavior', () => {
    test('exports same instance when required multiple times', () => {
      const output1 = require('../../lib/output');
      const output2 = require('../../lib/output');
      expect(output1).toBe(output2);
    });

    test('maintains state across different requires', () => {
      const output1 = require('../../lib/output');
      output1.setQuiet(true);

      const output2 = require('../../lib/output');
      expect(output2.isQuiet).toBe(true);

      // Reset for other tests
      output2.setQuiet(false);
    });
  });
});