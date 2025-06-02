/**
 * Comprehensive Config Tests
 * Tests actual configuration logic and validation without excessive mocking
 */

const { 
  setupConfig,
  validateConfiguration,
  promptForMissingCredentials,
  generateWalletIfNeeded,
  sanitizeProjectName
} = require('../../lib/config');

// Only mock user input, not our validation logic
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('../../lib/wallet', () => ({
  generateWallet: jest.fn(),
  deriveFromPrivateKey: jest.fn()
}));

const inquirer = require('inquirer');
const { generateWallet, deriveFromPrivateKey } = require('../../lib/wallet');

describe('Configuration Functions - Real Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    test('validates complete configuration correctly', () => {
      const validConfig = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken', 
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      };

      const result = validateConfiguration(validConfig);

      expect(result).toEqual({
        isValid: true,
        missingFields: [],
        invalidFields: [],
        warnings: []
      });
    });

    test('identifies missing required fields', () => {
      const incompleteConfig = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken'
        // Missing other required fields
      };

      const result = validateConfiguration(incompleteConfig);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(expect.arrayContaining([
        'tokenSymbol',
        'privateKey',
        'address',
        'pinataApiKey',
        'pinataApiSecret',
        'googleClientId',
        'googleClientSecret'
      ]));
    });

    test('validates private key format', () => {
      const configWithBadKey = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: 'invalid-private-key',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      const result = validateConfiguration(configWithBadKey);

      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(expect.arrayContaining([
        { field: 'privateKey', reason: 'Invalid private key format (must be 0x followed by 64 hex characters)' }
      ]));
    });

    test('validates Ethereum address format', () => {
      const configWithBadAddress = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: 'invalid-address'
      };

      const result = validateConfiguration(configWithBadAddress);

      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(expect.arrayContaining([
        { field: 'address', reason: 'Invalid Ethereum address format' }
      ]));
    });

    test('validates token symbol format', () => {
      const configWithBadSymbol = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'invalid-symbol-too-long',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      const result = validateConfiguration(configWithBadSymbol);

      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(expect.arrayContaining([
        { field: 'tokenSymbol', reason: 'Token symbol must be 2-6 uppercase characters' }
      ]));
    });

    test('validates Google OAuth client ID format', () => {
      const configWithBadGoogleId = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        googleClientId: 'invalid-client-id'
      };

      const result = validateConfiguration(configWithBadGoogleId);

      expect(result.isValid).toBe(false);
      expect(result.invalidFields).toEqual(expect.arrayContaining([
        { field: 'googleClientId', reason: 'Google Client ID must end with .apps.googleusercontent.com' }
      ]));
    });

    test('provides warnings for potential issues', () => {
      const configWithWarnings = {
        dlpName: 'test', // Too short
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      };

      const result = validateConfiguration(configWithWarnings);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([
        'DLP name is very short - consider a more descriptive name'
      ]));
    });
  });

  describe('Project Name Sanitization', () => {
    test('sanitizes project names correctly', () => {
      const testCases = [
        { input: 'My Great Project!', expected: 'my-great-project' },
        { input: 'Test_Project_123', expected: 'test-project-123' },
        { input: 'UPPERCASE', expected: 'uppercase' },
        { input: 'spaces   everywhere', expected: 'spaces-everywhere' },
        { input: 'special@#$%chars', expected: 'specialchars' },
        { input: '-leading-and-trailing-', expected: 'leading-and-trailing' },
        { input: 'multiple---dashes', expected: 'multiple-dashes' }
      ];

      for (const testCase of testCases) {
        const result = sanitizeProjectName(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    test('handles edge cases', () => {
      expect(sanitizeProjectName('')).toBe('my-datadao');
      expect(sanitizeProjectName('   ')).toBe('my-datadao');
      expect(sanitizeProjectName('!@#$%^&*()')).toBe('my-datadao');
      expect(sanitizeProjectName('123')).toBe('123');
    });
  });

  describe('Wallet Generation', () => {
    test('generates new wallet when needed', async () => {
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt.mockResolvedValue({ generateWallet: true });

      const result = await generateWalletIfNeeded();

      expect(generateWallet).toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });

    test('derives wallet from provided private key', async () => {
      const privateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        privateKey,
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      deriveFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt.mockResolvedValue({ 
        generateWallet: false,
        privateKey 
      });

      const result = await generateWalletIfNeeded();

      expect(deriveFromPrivateKey).toHaveBeenCalledWith(privateKey);
      expect(result).toEqual(mockWallet);
    });

    test('validates private key format during input', async () => {
      deriveFromPrivateKey.mockImplementation((key) => {
        if (!key.match(/^0x[a-fA-F0-9]{64}$/)) {
          throw new Error('Invalid private key format');
        }
        return {
          privateKey: key,
          address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
        };
      });

      inquirer.prompt
        .mockResolvedValueOnce({ generateWallet: false })
        .mockResolvedValueOnce({ privateKey: 'invalid-key' })
        .mockResolvedValueOnce({ privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51' });

      const result = await generateWalletIfNeeded();

      expect(inquirer.prompt).toHaveBeenCalledTimes(3); // Should retry after invalid key
      expect(result.privateKey).toBe('0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51');
    });
  });

  describe('Credential Prompting', () => {
    test('prompts for missing Pinata credentials', async () => {
      const incompleteConfig = {
        dlpName: 'TestDAO',
        pinataApiKey: 'existing-key'
        // Missing pinataApiSecret
      };

      inquirer.prompt.mockResolvedValue({
        pinataApiSecret: 'new-secret'
      });

      const result = await promptForMissingCredentials(incompleteConfig);

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'pinataApiSecret',
            type: 'password',
            message: expect.stringContaining('Pinata API Secret')
          })
        ])
      );

      expect(result).toEqual({
        ...incompleteConfig,
        pinataApiSecret: 'new-secret'
      });
    });

    test('prompts for missing Google OAuth credentials', async () => {
      const incompleteConfig = {
        dlpName: 'TestDAO'
        // Missing Google credentials
      };

      inquirer.prompt.mockResolvedValue({
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      });

      const result = await promptForMissingCredentials(incompleteConfig);

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'googleClientId',
            message: expect.stringContaining('Google OAuth Client ID')
          }),
          expect.objectContaining({
            name: 'googleClientSecret',
            type: 'password',
            message: expect.stringContaining('Google OAuth Client Secret')
          })
        ])
      );

      expect(result).toEqual({
        ...incompleteConfig,
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      });
    });

    test('validates input during prompting', async () => {
      const incompleteConfig = {
        dlpName: 'TestDAO'
      };

      inquirer.prompt.mockImplementation((questions) => {
        // Simulate validation
        for (const question of questions) {
          if (question.validate) {
            const validationResult = question.validate('test-value');
            if (validationResult !== true) {
              throw new Error(`Validation failed: ${validationResult}`);
            }
          }
        }
        return Promise.resolve({
          googleClientId: 'valid-client-id.apps.googleusercontent.com',
          googleClientSecret: 'valid-secret'
        });
      });

      const result = await promptForMissingCredentials(incompleteConfig);

      expect(result.googleClientId).toBe('valid-client-id.apps.googleusercontent.com');
    });
  });

  describe('Full Configuration Setup', () => {
    test('creates complete configuration from user input', async () => {
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'My Test DAO',
          tokenName: 'MyTestToken',
          tokenSymbol: 'MTT'
        })
        .mockResolvedValueOnce({ generateWallet: true })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key',
          pinataApiSecret: 'test-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'test-client-id.apps.googleusercontent.com',
          googleClientSecret: 'test-client-secret'
        });

      const result = await setupConfig();

      expect(result).toEqual({
        dlpName: 'My Test DAO',
        tokenName: 'MyTestToken',
        tokenSymbol: 'MTT',
        privateKey: mockWallet.privateKey,
        address: mockWallet.address,
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      });

      // Validate the final result
      const validation = validateConfiguration(result);
      expect(validation.isValid).toBe(true);
    });

    test('handles configuration from file', async () => {
      const fileConfig = {
        dlpName: 'File DAO',
        tokenName: 'FileToken',
        tokenSymbol: 'FILE',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51'
      };

      deriveFromPrivateKey.mockReturnValue({
        privateKey: fileConfig.privateKey,
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      });

      inquirer.prompt.mockResolvedValue({
        pinataApiKey: 'file-pinata-key',
        pinataApiSecret: 'file-pinata-secret',
        googleClientId: 'file-client-id.apps.googleusercontent.com',
        googleClientSecret: 'file-client-secret'
      });

      const result = await setupConfig(fileConfig);

      expect(result).toEqual({
        dlpName: 'File DAO',
        tokenName: 'FileToken',
        tokenSymbol: 'FILE',
        privateKey: fileConfig.privateKey,
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        pinataApiKey: 'file-pinata-key',
        pinataApiSecret: 'file-pinata-secret',
        googleClientId: 'file-client-id.apps.googleusercontent.com',
        googleClientSecret: 'file-client-secret'
      });
    });

    test('merges file config with user input correctly', async () => {
      const partialFileConfig = {
        dlpName: 'Partial DAO',
        pinataApiKey: 'existing-pinata-key'
      };

      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          tokenName: 'PartialToken',
          tokenSymbol: 'PART'
        })
        .mockResolvedValueOnce({ generateWallet: true })
        .mockResolvedValueOnce({
          pinataApiSecret: 'new-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'new-client-id.apps.googleusercontent.com',
          googleClientSecret: 'new-client-secret'
        });

      const result = await setupConfig(partialFileConfig);

      expect(result).toEqual({
        dlpName: 'Partial DAO',
        tokenName: 'PartialToken', 
        tokenSymbol: 'PART',
        privateKey: mockWallet.privateKey,
        address: mockWallet.address,
        pinataApiKey: 'existing-pinata-key', // From file
        pinataApiSecret: 'new-pinata-secret', // From prompt
        googleClientId: 'new-client-id.apps.googleusercontent.com',
        googleClientSecret: 'new-client-secret'
      });
    });
  });
});