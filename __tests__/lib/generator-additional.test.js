/**
 * Additional tests for uncovered lines in generator.js
 * Current coverage: 67.44%
 * Target: 100% coverage
 * 
 * Uncovered lines: 21-24,53,96-102,170,219-220,263-264,290-291,365-366,
 * 406-423,432,458-469,479,516-526,534,539,564-574,582,587,606-616,625,
 * 645-669,693-699,790-822,841-842,866-982,1086-1087,1089,1128
 */

const {
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
} = require('../../lib/generator');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('ora');
jest.mock('inquirer');
jest.mock('../../lib/wallet');
jest.mock('viem');
jest.mock('../../lib/template-engine');

const fs = require('fs-extra');
const { execSync } = require('child_process');
const ora = require('ora');
const inquirer = require('inquirer');
const { deriveWalletFromPrivateKey } = require('../../lib/wallet');
const { createPublicClient } = require('viem');
const TemplateEngine = require('../../lib/template-engine');

describe('Generator Functions - Additional Coverage', () => {
  let mockSpinner;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ora spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      text: ''
    };
    ora.mockReturnValue(mockSpinner);

    // Mock fs-extra
    fs.ensureDirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn();
    fs.existsSync = jest.fn();

    // Mock execSync
    execSync.mockReturnValue('mock output');

    // Mock template engine
    const mockTemplateEngine = {
      processTemplateToFile: jest.fn(),
      getDefaultVanaConfig: jest.fn().mockReturnValue({})
    };
    TemplateEngine.mockReturnValue(mockTemplateEngine);
  });
  describe('generateTemplate - uncovered paths', () => {
    test('derives wallet when address or publicKey is missing (lines 21-24)', async () => {
      // Mock deriveWalletFromPrivateKey to return wallet credentials
      const mockWallet = {
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      // Config without address or publicKey
      const config = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        githubUsername: 'testuser',
        network: 'moksha'
      };

      // Mock fs.writeFileSync to prevent actual file writes during testing
      fs.writeFileSync.mockImplementation(() => {});

      try {
        await generateTemplate('/test/path', config);
      } catch (error) {
        // Expected to fail on other parts, but wallet derivation should have been called
      }

      expect(deriveWalletFromPrivateKey).toHaveBeenCalledWith(config.privateKey);
      expect(config.address).toBe(mockWallet.address);
      expect(config.publicKey).toBe(mockWallet.publicKey);
    });

    test('handles wallet derivation errors', async () => {
      // Mock deriveWalletFromPrivateKey to throw an error
      deriveWalletFromPrivateKey.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      const config = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: 'invalid-key',
        githubUsername: 'testuser',
        network: 'moksha'
      };

      await expect(generateTemplate('/test/path', config)).rejects.toThrow();
      expect(deriveWalletFromPrivateKey).toHaveBeenCalledWith(config.privateKey);
    });

    test('skips wallet derivation when address and publicKey are provided', async () => {
      const config = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...',
        githubUsername: 'testuser',
        network: 'moksha'
      };

      // Mock fs.writeFileSync to prevent actual file writes during testing
      fs.writeFileSync.mockImplementation(() => {});

      try {
        await generateTemplate('/test/path', config);
      } catch (error) {
        // Expected to fail on other parts, but wallet derivation should be skipped
      }

      expect(deriveWalletFromPrivateKey).not.toHaveBeenCalled();
    });
    test.todo('handles git clone errors with detailed error messages (lines 96-102)');
    test.todo('handles deployment.json write errors (line 170)');
  });

  describe('configureGitHubRepositories - error paths', () => {
    test.todo('handles automated repository creation when gh CLI available (lines 219-220)');
    test.todo('falls back to manual setup when automation fails (lines 263-264)');
    test.todo('handles errors during automated repository creation (lines 290-291)');
  });

  describe('createRepositoriesAutomatically - edge cases', () => {
    test.todo('handles repository already exists scenario (lines 365-366)');
    test.todo('handles gh repo create failures with detailed errors (lines 406-423)');
    test.todo('handles fork command execution (line 432)');
    test.todo('handles push command failures (lines 458-469)');
    test.todo('handles repository URL extraction errors (line 479)');
  });

  describe('guideManualRepositorySetup - validation', () => {
    test.todo('validates GitHub URLs during manual input (lines 516-526)');
    test.todo('handles invalid URL formats (line 534)');
    test.todo('handles user cancellation (line 539)');
  });

  describe('deployContracts - error handling', () => {
    test.todo('handles npm install failures (lines 564-574)');
    test.todo('handles deployment script execution errors (line 582)');
    test.todo('handles missing deployment script (line 587)');
    test.todo('handles contract deployment failures with recovery options (lines 606-616)');
    test.todo('updates deployment.json after successful deployment (line 625)');
  });

  describe('deployComponents - error paths', () => {
    test.todo('handles proof deployment failures (lines 645-669)');
    test.todo('handles refiner deployment failures');
    test.todo('handles UI deployment failures');
    test.todo('prompts for component selection when some fail');
  });

  describe('registerDataDAO - comprehensive', () => {
    test.todo('handles missing deployer address (lines 693-699)');
    test.todo('executes registration script successfully (lines 790-822)');
    test.todo('handles registration failures with detailed errors');
    test.todo('updates deployment state after registration');
    test.todo('handles missing registration script');
  });

  describe('resumeFromState - state recovery', () => {
    test.todo('resumes from contracts deployment state (lines 841-842)');
    test.todo('resumes from component deployment state');
    test.todo('resumes from registration state');
    test.todo('handles corrupted deployment.json');
    test.todo('handles missing state properties');
  });

  describe('guideNextSteps - interactive flow', () => {
    test.todo('provides helpful next steps based on current state (lines 866-982)');
    test.todo('handles quick mode execution');
    test.todo('handles user choosing not to continue');
    test.todo('displays appropriate messages for each incomplete step');
    test.todo('handles all deployment states correctly');
  });

  describe('guided setup completion', () => {
    test.todo('shows celebration message on full completion (lines 1086-1087)');
    test.todo('handles final state update (line 1089)');
    test.todo('provides post-completion guidance');
  });

  describe('utility functions', () => {
    test.todo('extractDlpAddressFromOutput handles various output formats (line 1128)');
    test.todo('handles malformed output from deployment scripts');
    test.todo('handles missing addresses in output');
  });

  describe('error recovery flows', () => {
    test.todo('provides manual recovery options for all failure types');
    test.todo('allows retry after fixing issues');
    test.todo('saves partial progress in deployment.json');
    test.todo('handles network errors gracefully');
    test.todo('handles file system errors');
  });

  describe('interactive prompts', () => {
    test.todo('handles all inquirer prompt scenarios');
    test.todo('validates user inputs appropriately');
    test.todo('provides helpful default values');
    test.todo('handles Ctrl+C interruption gracefully');
  });
});