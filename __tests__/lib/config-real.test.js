/**
 * Real Config Tests
 * Tests the actual setupConfig function from lib/config.js
 */

const { setupConfig } = require('../../lib/config');

// Mock only external dependencies, not our logic
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('../../lib/wallet', () => ({
  generateWallet: jest.fn(),
  deriveFromPrivateKey: jest.fn()
}));

const inquirer = require('inquirer');
const { generateWallet, deriveFromPrivateKey } = require('../../lib/wallet');

describe('Config Setup - Real Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setupConfig function', () => {
    test('creates complete configuration from user prompts', async () => {
      // Mock wallet generation
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };
      generateWallet.mockReturnValue(mockWallet);

      // Mock user inputs
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'My Test DataDAO',
          tokenName: 'MyTestToken',
          tokenSymbol: 'MTT'
        })
        .mockResolvedValueOnce({
          useExistingWallet: false
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key-123',
          pinataApiSecret: 'test-pinata-secret-456'
        })
        .mockResolvedValueOnce({
          googleClientId: 'test-client-id.apps.googleusercontent.com',
          googleClientSecret: 'test-google-secret-789'
        });

      const result = await setupConfig();

      // Verify the configuration is complete and valid
      expect(result).toEqual({
        dlpName: 'My Test DataDAO',
        tokenName: 'MyTestToken',
        tokenSymbol: 'MTT',
        privateKey: mockWallet.privateKey,
        address: mockWallet.address,
        pinataApiKey: 'test-pinata-key-123',
        pinataApiSecret: 'test-pinata-secret-456',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-google-secret-789',
        // Default network configuration
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });

      // Verify that generateWallet was called
      expect(generateWallet).toHaveBeenCalled();
    });

    test('uses existing wallet when user provides private key', async () => {
      const existingPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockWallet = {
        privateKey: existingPrivateKey,
        address: '0x9876543210fedcba9876543210fedcba98765432'
      };
      deriveFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Existing Wallet DAO',
          tokenName: 'ExistingToken',
          tokenSymbol: 'EXT'
        })
        .mockResolvedValueOnce({
          useExistingWallet: true,
          privateKey: existingPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'existing-pinata-key',
          pinataApiSecret: 'existing-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'existing-client-id.apps.googleusercontent.com',
          googleClientSecret: 'existing-google-secret'
        });

      const result = await setupConfig();

      expect(result.privateKey).toBe(existingPrivateKey);
      expect(result.address).toBe(mockWallet.address);
      expect(deriveFromPrivateKey).toHaveBeenCalledWith(existingPrivateKey);
      expect(generateWallet).not.toHaveBeenCalled();
    });

    test('merges provided config with user input', async () => {
      const providedConfig = {
        dlpName: 'Predefined DAO',
        pinataApiKey: 'predefined-pinata-key'
      };

      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };
      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          tokenName: 'PredefinedToken',
          tokenSymbol: 'PDT'
        })
        .mockResolvedValueOnce({
          useExistingWallet: false
        })
        .mockResolvedValueOnce({
          pinataApiSecret: 'new-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'new-client-id.apps.googleusercontent.com',
          googleClientSecret: 'new-google-secret'
        });

      const result = await setupConfig(providedConfig);

      expect(result).toEqual({
        dlpName: 'Predefined DAO', // From provided config
        tokenName: 'PredefinedToken', // From user input
        tokenSymbol: 'PDT', // From user input
        privateKey: mockWallet.privateKey,
        address: mockWallet.address,
        pinataApiKey: 'predefined-pinata-key', // From provided config
        pinataApiSecret: 'new-pinata-secret', // From user input
        googleClientId: 'new-client-id.apps.googleusercontent.com',
        googleClientSecret: 'new-google-secret',
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });
    });

    test('validates user input during prompting', async () => {
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };
      generateWallet.mockReturnValue(mockWallet);

      // Test that validation functions are called during prompting
      inquirer.prompt.mockImplementation((questions) => {
        // Find questions with validation and test them
        for (const question of questions) {
          if (question.validate) {
            // Test token symbol validation
            if (question.name === 'tokenSymbol') {
              expect(question.validate('test')).toBe('Token symbol must be 2-6 uppercase characters');
              expect(question.validate('TEST')).toBe(true);
              expect(question.validate('TOOLONG')).toBe('Token symbol must be 2-6 uppercase characters');
            }
            
            // Test private key validation
            if (question.name === 'privateKey') {
              expect(question.validate('invalid')).toBe('Private key must be 64 hex characters (with or without 0x prefix)');
              expect(question.validate('0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51')).toBe(true);
              expect(question.validate('3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51')).toBe(true);
            }

            // Test Google Client ID validation
            if (question.name === 'googleClientId') {
              expect(question.validate('invalid-id')).toBe('Google Client ID must end with .apps.googleusercontent.com');
              expect(question.validate('test-id.apps.googleusercontent.com')).toBe(true);
            }
          }
        }

        // Return mock responses
        if (questions.some(q => q.name === 'dlpName')) {
          return Promise.resolve({
            dlpName: 'Test DAO',
            tokenName: 'TestToken',
            tokenSymbol: 'TEST'
          });
        }
        if (questions.some(q => q.name === 'useExistingWallet')) {
          return Promise.resolve({ useExistingWallet: false });
        }
        if (questions.some(q => q.name === 'pinataApiKey')) {
          return Promise.resolve({
            pinataApiKey: 'test-key',
            pinataApiSecret: 'test-secret'
          });
        }
        if (questions.some(q => q.name === 'googleClientId')) {
          return Promise.resolve({
            googleClientId: 'test-id.apps.googleusercontent.com',
            googleClientSecret: 'test-secret'
          });
        }
        return Promise.resolve({});
      });

      const result = await setupConfig();

      expect(result).toMatchObject({
        dlpName: 'Test DAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      });
    });

    test('handles wallet generation errors gracefully', async () => {
      generateWallet.mockImplementation(() => {
        throw new Error('Wallet generation failed');
      });

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Error Test DAO',
          tokenName: 'ErrorToken',
          tokenSymbol: 'ERR'
        })
        .mockResolvedValueOnce({
          useExistingWallet: false
        });

      await expect(setupConfig()).rejects.toThrow('Wallet generation failed');
    });

    test('handles private key derivation errors', async () => {
      const invalidPrivateKey = '0xinvalid';
      deriveFromPrivateKey.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Error Test DAO',
          tokenName: 'ErrorToken',
          tokenSymbol: 'ERR'
        })
        .mockResolvedValueOnce({
          useExistingWallet: true,
          privateKey: invalidPrivateKey
        });

      await expect(setupConfig()).rejects.toThrow('Invalid private key');
    });

    test('prompts for all required fields in correct order', async () => {
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };
      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Complete DAO',
          tokenName: 'CompleteToken',
          tokenSymbol: 'CMP'
        })
        .mockResolvedValueOnce({
          useExistingWallet: false
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'complete-pinata-key',
          pinataApiSecret: 'complete-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'complete-client-id.apps.googleusercontent.com',
          googleClientSecret: 'complete-google-secret'
        });

      await setupConfig();

      // Verify the correct sequence of prompts
      expect(inquirer.prompt).toHaveBeenCalledTimes(4);

      // Check that basic project info is prompted first
      const firstCall = inquirer.prompt.mock.calls[0][0];
      expect(firstCall.some(q => q.name === 'dlpName')).toBe(true);
      expect(firstCall.some(q => q.name === 'tokenName')).toBe(true);
      expect(firstCall.some(q => q.name === 'tokenSymbol')).toBe(true);

      // Check that wallet setup is prompted second
      const secondCall = inquirer.prompt.mock.calls[1][0];
      expect(secondCall.some(q => q.name === 'useExistingWallet')).toBe(true);

      // Check that service credentials are prompted last
      const thirdCall = inquirer.prompt.mock.calls[2][0];
      expect(thirdCall.some(q => q.name === 'pinataApiKey')).toBe(true);
      
      const fourthCall = inquirer.prompt.mock.calls[3][0];
      expect(fourthCall.some(q => q.name === 'googleClientId')).toBe(true);
    });

    test('includes default network configuration', async () => {
      const mockWallet = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };
      generateWallet.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Network Test DAO',
          tokenName: 'NetworkToken',
          tokenSymbol: 'NET'
        })
        .mockResolvedValueOnce({
          useExistingWallet: false
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'network-pinata-key',
          pinataApiSecret: 'network-pinata-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'network-client-id.apps.googleusercontent.com',
          googleClientSecret: 'network-google-secret'
        });

      const result = await setupConfig();

      // Verify default network configuration is included
      expect(result).toMatchObject({
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });
    });
  });
});