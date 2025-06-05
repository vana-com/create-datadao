const { checkPrerequisites } = require('../../lib/prerequisites');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process');

// Mock ora directly
const ora = require('ora');
jest.mock('ora');

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Prerequisites Module', () => {
  let mockConsoleLog;
  let mockConsoleError;
  let mockSpinner;

  beforeEach(() => {
    mockConsoleLog = jest.fn();
    mockConsoleError = jest.fn();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Setup ora mock
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      text: ''
    };
    ora.mockReturnValue(mockSpinner);

    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('checkPrerequisites', () => {
    test('returns true when all required dependencies are available', async () => {
      // Mock all commands to succeed
      execSync.mockImplementation((command) => {
        if (command.includes('git --version')) return 'git version 2.34.1';
        if (command.includes('docker --version')) return 'Docker version 20.10.17';
        if (command.includes('python3 --version')) return 'Python 3.9.7';
        if (command.includes('poetry --version')) return 'Poetry version 1.1.13';
        if (command.includes('gh --version')) return 'gh version 2.14.3';
        return '';
      });

      const result = await checkPrerequisites();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ All prerequisites found'));
    });

    test('returns false when Node.js version is too old', async () => {
      // Mock Node version to be old
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        configurable: true
      });

      execSync.mockImplementation((command) => {
        if (command.includes('git --version')) return 'git version 2.34.1';
        return '';
      });

      const result = await checkPrerequisites();

      expect(result).toBe(false);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('❌ Missing required dependencies:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Node.js v18.0.0+ required'));

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true
      });
    });

    test('returns false when Git is missing', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('git --version')) {
          throw new Error('git: command not found');
        }
        return '';
      });

      const result = await checkPrerequisites();

      expect(result).toBe(false);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('❌ Missing required dependencies:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Git is required for repository operations'));
    });

    test('shows warnings for missing optional tools but returns true', async () => {
      // Mock required tools to succeed, optional tools to fail
      execSync.mockImplementation((command) => {
        if (command.includes('git --version')) return 'git version 2.34.1';
        if (command.includes('docker --version')) {
          throw new Error('docker: command not found');
        }
        if (command.includes('python3 --version')) {
          throw new Error('python3: command not found');
        }
        if (command.includes('python --version')) {
          throw new Error('python: command not found');
        }
        if (command.includes('poetry --version')) {
          throw new Error('poetry: command not found');
        }
        if (command.includes('gh --version')) {
          throw new Error('gh: command not found');
        }
        return '';
      });

      const result = await checkPrerequisites();

      expect(result).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  Optional tools not found:'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Docker not found'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Python not found'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Poetry not found'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI not found'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ You can install these later'));
    });

    test('handles Python fallback from python3 to python', async () => {
      execSync.mockImplementation((command) => {
        if (command.includes('git --version')) return 'git version 2.34.1';
        if (command.includes('python3 --version')) {
          throw new Error('python3: command not found');
        }
        if (command.includes('python --version')) return 'Python 3.9.7';
        return '';
      });

      const result = await checkPrerequisites();

      expect(result).toBe(true);
      // Should not show Python warning since fallback succeeded
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Python not found'));
    });

    test('handles errors gracefully', async () => {
      // Mock process.version to throw an error when accessed
      Object.defineProperty(process, 'version', {
        get: () => {
          throw new Error('Unexpected error accessing process.version');
        },
        configurable: true
      });

      const result = await checkPrerequisites();

      expect(result).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error checking prerequisites:'),
        expect.any(String)
      );

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        configurable: true
      });
    });
  });
});