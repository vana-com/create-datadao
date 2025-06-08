/**
 * Comprehensive Configuration Tests
 * Tests actual configuration functions from lib/config.js and lib/validation.js
 */

const inquirer = require('inquirer');
const { setupConfig } = require('../../lib/config');
const { 
  validatePrivateKey, 
  normalizePrivateKey, 
  validateConfig,
  validateInput 
} = require('../../lib/validation');

// Mock dependencies
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  red: jest.fn(text => text),
  cyan: jest.fn(text => text),
  gray: jest.fn(text => text)
}));

jest.mock('../../lib/wallet', () => ({
  deriveWalletFromPrivateKey: jest.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
  })
}));

describe('Configuration Functions - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure the wallet mock is properly set up
    const { deriveWalletFromPrivateKey } = require('../../lib/wallet');
    deriveWalletFromPrivateKey.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
    });
    
    // Mock console to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Private Key Validation', () => {
    test('validates correct private keys', () => {
      const validKeys = [
        '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      ];

      validKeys.forEach(key => {
        expect(validatePrivateKey(key)).toBe(true);
      });
    });

    test('rejects invalid private keys', () => {
      const invalidKeys = [
        '',
        '0x',
        '123',
        '0x123',
        'not-a-hex-string',
        '0xZZZ572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf5', // too short
        '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf511' // too long
      ];

      invalidKeys.forEach(key => {
        const result = validatePrivateKey(key);
        expect(result).not.toBe(true);
        expect(typeof result).toBe('string'); // Should return error message
      });
    });

    test('provides helpful error messages for invalid keys', () => {
      expect(validatePrivateKey('')).toContain('required');
      expect(validatePrivateKey('123')).toContain('64 hex characters');
      expect(validatePrivateKey('0xZZZ')).toContain('64 hex characters');
    });
  });

  describe('Private Key Normalization', () => {
    test('normalizes private keys correctly', () => {
      const testCases = [
        {
          input: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
          expected: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        },
        {
          input: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
          expected: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        },
        {
          input: 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
          expected: '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizePrivateKey(input)).toBe(expected);
      });
    });

    test('throws error for invalid input', () => {
      expect(() => normalizePrivateKey('')).toThrow('must be a non-empty string');
      expect(() => normalizePrivateKey(null)).toThrow('must be a non-empty string');
      expect(() => normalizePrivateKey(undefined)).toThrow('must be a non-empty string');
      expect(() => normalizePrivateKey(123)).toThrow('must be a non-empty string');
    });
  });

  describe('Configuration Validation', () => {
    test('validates complete valid configuration', () => {
      const validConfig = {
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x1234567890123456789012345678901234567890',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        pinataApiKey: 'test-api-key',
        pinataApiSecret: 'test-api-secret',
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret',
        githubUsername: 'testuser',
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('throws error for missing required fields', () => {
      const incompleteConfig = {
        dlpName: 'Test DataDAO',
        // missing other required fields
      };

      expect(() => validateConfig(incompleteConfig)).toThrow();
    });

    test('throws error for invalid private key in configuration', () => {
      const configWithBadKey = {
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: 'invalid-key',
        address: '0x1234567890123456789012345678901234567890',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret',
        githubUsername: 'testuser',
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      };

      expect(() => validateConfig(configWithBadKey)).toThrow();
    });
  });

  describe('Input Validation', () => {
    test('validates DLP name input', () => {
      expect(validateInput.dlpName('Valid DataDAO Name')).toBe(true);
      expect(validateInput.dlpName('A')).not.toBe(true);
      expect(validateInput.dlpName('')).not.toBe(true);
      expect(validateInput.dlpName('A'.repeat(101))).not.toBe(true);
    });

    test('validates token name input', () => {
      expect(validateInput.tokenName('ValidToken')).toBe(true);
      expect(validateInput.tokenName('A')).not.toBe(true);
      expect(validateInput.tokenName('')).not.toBe(true);
      expect(validateInput.tokenName('A'.repeat(51))).not.toBe(true);
    });

    test('validates token symbol input', () => {
      expect(validateInput.tokenSymbol('TOK')).toBe(true);
      expect(validateInput.tokenSymbol('TOKEN')).toBe(true);
      expect(validateInput.tokenSymbol('TO')).not.toBe(true);
      expect(validateInput.tokenSymbol('TOOLONG')).not.toBe(true);
      expect(validateInput.tokenSymbol('123')).not.toBe(true);
      expect(validateInput.tokenSymbol('tok')).not.toBe(true); // Must be uppercase
    });

    test('validates using required function', () => {
      expect(validateInput.required('some value')).toBe(true);
      expect(validateInput.required('')).not.toBe(true);
      expect(validateInput.required('   ')).not.toBe(true);
    });
  });

  describe('Setup Configuration Flow', () => {
    test('collects complete configuration from user input', async () => {
      // Mock inquirer responses
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Test DataDAO',
          tokenName: 'TestToken', 
          tokenSymbol: 'TEST'
        })
        .mockResolvedValueOnce({
          privateKey: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret',
          googleClientId: 'test-google-id',
          googleClientSecret: 'test-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'testuser'
        });

      const config = await setupConfig();

      // Verify all expected fields are present
      expect(config).toMatchObject({
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x1234567890123456789012345678901234567890',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-google-id',
        googleClientSecret: 'test-google-secret',
        githubUsername: 'testuser',
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });

      // Verify inquirer was called the right number of times
      expect(inquirer.prompt).toHaveBeenCalledTimes(4);
    });

    test('validates private key during input', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Test DataDAO',
          tokenName: 'TestToken',
          tokenSymbol: 'TEST'
        })
        .mockResolvedValueOnce({
          privateKey: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret',
          googleClientId: 'test-google-id',
          googleClientSecret: 'test-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'testuser'
        });

      await setupConfig();

      // Get the private key validation function
      const walletPromptCall = inquirer.prompt.mock.calls.find(call => 
        call[0].some(question => question.name === 'privateKey')
      );
      
      expect(walletPromptCall).toBeDefined();
      
      const privateKeyQuestion = walletPromptCall[0].find(q => q.name === 'privateKey');
      expect(privateKeyQuestion.validate).toBeDefined();
      
      // Test the validation function
      expect(privateKeyQuestion.validate('invalid')).not.toBe(true);
      expect(privateKeyQuestion.validate('3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51')).toBe(true);
    });

    test('validates GitHub username during input', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Test DataDAO',
          tokenName: 'TestToken',
          tokenSymbol: 'TEST'
        })
        .mockResolvedValueOnce({
          privateKey: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret',
          googleClientId: 'test-google-id',
          googleClientSecret: 'test-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'testuser'
        });

      await setupConfig();

      // Get the GitHub username validation function
      const githubPromptCall = inquirer.prompt.mock.calls.find(call =>
        call[0].some(question => question.name === 'githubUsername')
      );
      
      expect(githubPromptCall).toBeDefined();
      
      const githubQuestion = githubPromptCall[0].find(q => q.name === 'githubUsername');
      expect(githubQuestion.validate).toBeDefined();
      
      // Test the validation function
      expect(githubQuestion.validate('')).not.toBe(true);
      expect(githubQuestion.validate('validuser')).toBe(true);
    });

    test('provides default values for basic configuration', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'MyDataDAO', // Using default
          tokenName: 'MyDataToken', // Using default
          tokenSymbol: 'MDT' // Using default
        })
        .mockResolvedValueOnce({
          privateKey: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret',
          googleClientId: 'test-google-id',
          googleClientSecret: 'test-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'testuser'
        });

      const config = await setupConfig();

      expect(config.dlpName).toBe('MyDataDAO');
      expect(config.tokenName).toBe('MyDataToken');
      expect(config.tokenSymbol).toBe('MDT');

      // Verify default values are provided in prompts
      const basicPromptCall = inquirer.prompt.mock.calls[0];
      const basicQuestions = basicPromptCall[0];
      
      expect(basicQuestions.find(q => q.name === 'dlpName').default).toBe('MyDataDAO');
      expect(basicQuestions.find(q => q.name === 'tokenName').default).toBe('MyDataToken');
      expect(basicQuestions.find(q => q.name === 'tokenSymbol').default).toBe('MDT');
    });
  });

  describe('Network Configuration', () => {
    test('includes default network configuration', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Test DataDAO',
          tokenName: 'TestToken',
          tokenSymbol: 'TEST'
        })
        .mockResolvedValueOnce({
          privateKey: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret',
          googleClientId: 'test-google-id',
          googleClientSecret: 'test-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'testuser'
        });

      const config = await setupConfig();

      expect(config.network).toBe('moksha');
      expect(config.rpcUrl).toBe('https://rpc.moksha.vana.org');
      expect(config.chainId).toBe(14800);
    });
  });
});