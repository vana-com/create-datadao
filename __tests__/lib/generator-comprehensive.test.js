/**
 * Comprehensive Generator Tests
 * Tests actual generator functions from lib/generator.js with more complex scenarios
 */

const fs = require('fs-extra');
const path = require('path');

// Use real fs for testing actual file operations
jest.unmock('fs-extra');

// Mock external dependencies
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('ora', () => () => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis()
}));

jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  red: jest.fn(text => text),
  bold: jest.fn(text => text),
  cyan: jest.fn(text => text),
  gray: jest.fn(text => text)
}));

jest.mock('../../lib/wallet');

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000'))
  })),
  http: jest.fn()
}));

jest.mock('viem/chains', () => ({
  moksha: { id: 14800, name: 'Moksha' }
}));

const inquirer = require('inquirer');
const { execSync } = require('child_process');

// Set up wallet mock BEFORE requiring generator
const wallet = require('../../lib/wallet');
wallet.deriveWalletFromPrivateKey = jest.fn(() => ({
  address: '0x1234567890123456789012345678901234567890',
  publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
}));

// Require generator AFTER all mocks are set up
const {
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
} = require('../../lib/generator');

describe('Generator Functions - Comprehensive Tests', () => {
  let testDir;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(__dirname, 'generator-comprehensive-test');
    fs.ensureDirSync(testDir);
    
    // Mock console to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    jest.restoreAllMocks();
  });

  describe('GitHub CLI Detection', () => {
    test('accurately detects GitHub CLI availability and authentication', async () => {
      // Test when CLI is available and authenticated
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.30.0';
        }
        if (cmd.includes('gh auth status')) {
          return 'Logged in to github.com as testuser (keyring)';
        }
        return '';
      });

      const result = await checkGitHubCLI();
      expect(result).toEqual({
        available: true,
        authenticated: true
      });
    });

    test('handles partial GitHub CLI setup', async () => {
      // Test when CLI is available but not authenticated
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.30.0';
        }
        if (cmd.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        return '';
      });

      const result = await checkGitHubCLI();
      expect(result).toEqual({
        available: true,
        authenticated: false
      });
    });

    test('handles complete absence of GitHub CLI', async () => {
      execSync.mockImplementation(() => {
        throw new Error('command not found: gh');
      });

      const result = await checkGitHubCLI();
      expect(result).toEqual({
        available: false,
        authenticated: false
      });
    });
  });

  describe('Repository Creation', () => {
    test('creates repositories with sanitized names', async () => {
      const config = {
        dlpName: 'Test DAO With Spaces & Special-Characters!!!',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo view')) {
          throw new Error('Repository not found');
        }
        if (cmd.includes('gh repo create')) {
          // The actual sanitization only replaces spaces with dashes, not special chars
          expect(cmd).toContain('test-dao-with-spaces-&-special-characters!!!');
          return 'Repository created successfully';
        }
        return '';
      });

      const result = await createRepositoriesAutomatically(config);

      expect(result).toEqual({
        automated: true,
        proofRepo: 'https://github.com/testuser/test-dao-with-spaces-&-special-characters!!!-proof',
        refinerRepo: 'https://github.com/testuser/test-dao-with-spaces-&-special-characters!!!-refiner'
      });
    });

    test('handles mixed success/failure scenarios', async () => {
      const config = {
        dlpName: 'Mixed Test DAO',
        githubUsername: 'testuser'
      };

      let callCount = 0;
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo view')) {
          throw new Error('Repository not found');
        }
        if (cmd.includes('gh repo create')) {
          callCount++;
          if (callCount === 1) {
            // First repo succeeds
            return 'Repository created successfully';
          } else {
            // Second repo fails
            throw new Error('API rate limit exceeded');
          }
        }
        return '';
      });

      const result = await createRepositoriesAutomatically(config);

      // When partial success occurs, it returns what was created with automated: true
      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/mixed-test-dao-proof',
        refinerRepo: undefined, // Second repo failed to create
        automated: true
      });
    });
  });

  describe('Manual Repository Setup', () => {
    test('validates repository URLs correctly', async () => {
      const config = {
        dlpName: 'URL Validation Test DAO',
        githubUsername: 'testuser'
      };

      let validationCalls = [];
      inquirer.prompt.mockImplementation((questions) => {
        // Capture validation function calls
        questions.forEach(question => {
          if (question.validate) {
            validationCalls.push({
              field: question.name,
              validations: [
                question.validate('invalid-url'),
                question.validate('https://github.com/user/repo'),
                question.validate('https://gitlab.com/user/repo'), // Should be invalid
                question.validate('') // Empty should be invalid
              ]
            });
          }
        });

        return Promise.resolve({
          proofRepo: 'https://github.com/testuser/validated-proof-repo',
          refinerRepo: 'https://github.com/testuser/validated-refiner-repo'
        });
      });

      const result = await guideManualRepositorySetup(config);

      // Verify validation was called
      expect(validationCalls.length).toBe(2); // For proof and refiner repos

      // Verify validation logic
      expect(validationCalls[0].validations[0]).toBe('Please enter a valid GitHub URL'); // invalid-url
      expect(validationCalls[0].validations[1]).toBe(true); // valid GitHub URL
      expect(validationCalls[0].validations[2]).toBe('Please enter a valid GitHub URL'); // GitLab URL
      expect(validationCalls[0].validations[3]).toBe('Please enter a valid GitHub URL'); // empty string

      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/validated-proof-repo',
        refinerRepo: 'https://github.com/testuser/validated-refiner-repo',
        automated: false
      });
    });

    test('provides appropriate default URLs', async () => {
      const config = {
        dlpName: 'Default URL Test DAO',
        githubUsername: 'testuser'
      };

      let defaultValues = [];
      inquirer.prompt.mockImplementation((questions) => {
        questions.forEach(question => {
          if (question.default) {
            defaultValues.push({
              field: question.name,
              default: question.default
            });
          }
        });

        return Promise.resolve({
          proofRepo: 'https://github.com/testuser/default-url-test-dao-proof',
          refinerRepo: 'https://github.com/testuser/default-url-test-dao-refiner'
        });
      });

      await guideManualRepositorySetup(config);

      // Verify default URLs are properly generated
      expect(defaultValues).toEqual([
        {
          field: 'proofRepo',
          default: 'https://github.com/testuser/default-url-test-dao-proof'
        },
        {
          field: 'refinerRepo',
          default: 'https://github.com/testuser/default-url-test-dao-refiner'
        }
      ]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles missing required configuration gracefully', async () => {
      const incompleteConfig = {
        dlpName: 'Test DAO'
        // Missing githubUsername
      };

      await expect(createRepositoriesAutomatically(incompleteConfig))
        .rejects.toThrow('Missing required configuration');
      
      await expect(guideManualRepositorySetup(incompleteConfig))
        .rejects.toThrow('Missing required configuration');
    });

    test('handles network timeouts during GitHub operations', async () => {
      const config = {
        dlpName: 'Timeout Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo')) {
          const error = new Error('Request timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return '';
      });

      // Mock fallback to manual setup
      inquirer.prompt.mockResolvedValue({
        proofRepo: 'https://github.com/testuser/timeout-proof-repo',
        refinerRepo: 'https://github.com/testuser/timeout-refiner-repo'
      });

      const result = await createRepositoriesAutomatically(config);

      // Should gracefully fall back to manual setup
      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/timeout-proof-repo',
        refinerRepo: 'https://github.com/testuser/timeout-refiner-repo',
        automated: false
      });
    });
  });
});