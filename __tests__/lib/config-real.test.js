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
  deriveWalletFromPrivateKey: jest.fn()
}));

const inquirer = require('inquirer');
const { deriveWalletFromPrivateKey } = require('../../lib/wallet');

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
      const testPrivateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      
      // Mock wallet derivation
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      // Mock user inputs - matching the actual function flow
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'My Test DataDAO',
          tokenName: 'MyTestToken',
          tokenSymbol: 'MTT'
        })
        .mockResolvedValueOnce({
          privateKey: testPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'test-pinata-key-123',
          pinataApiSecret: 'test-pinata-secret-456',
          googleClientId: 'test-client-id.apps.googleusercontent.com',
          googleClientSecret: 'test-google-secret-789'
        })
        .mockResolvedValueOnce({
          githubUsername: 'test-user'
        });

      const result = await setupConfig();

      // Verify the configuration is complete and valid
      expect(result).toEqual({
        dlpName: 'My Test DataDAO',
        tokenName: 'MyTestToken',
        tokenSymbol: 'MTT',
        privateKey: testPrivateKey,
        address: mockWallet.address,
        publicKey: mockWallet.publicKey,
        pinataApiKey: 'test-pinata-key-123',
        pinataApiSecret: 'test-pinata-secret-456',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-google-secret-789',
        githubUsername: 'test-user',
        // Default network configuration
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });

      // Verify that deriveWalletFromPrivateKey was called
      expect(deriveWalletFromPrivateKey).toHaveBeenCalledWith(testPrivateKey);
    });

    test('uses provided private key correctly', async () => {
      const existingPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockWallet = {
        address: '0x9876543210fedcba9876543210fedcba98765432',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Existing Wallet DAO',
          tokenName: 'ExistingToken',
          tokenSymbol: 'EXT'
        })
        .mockResolvedValueOnce({
          privateKey: existingPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'existing-pinata-key',
          pinataApiSecret: 'existing-pinata-secret',
          googleClientId: 'existing-client-id.apps.googleusercontent.com',
          googleClientSecret: 'existing-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'existing-user'
        });

      const result = await setupConfig();

      expect(result.privateKey).toBe(existingPrivateKey);
      expect(result.address).toBe(mockWallet.address);
      expect(result.publicKey).toBe(mockWallet.publicKey);
      expect(deriveWalletFromPrivateKey).toHaveBeenCalledWith(existingPrivateKey);
    });

    test('works with basic configuration flow', async () => {
      const testPrivateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Basic DAO',
          tokenName: 'BasicToken',
          tokenSymbol: 'BSC'
        })
        .mockResolvedValueOnce({
          privateKey: testPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'basic-pinata-key',
          pinataApiSecret: 'basic-pinata-secret',
          googleClientId: 'basic-client-id.apps.googleusercontent.com',
          googleClientSecret: 'basic-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'basic-user'
        });

      const result = await setupConfig();

      expect(result).toEqual({
        dlpName: 'Basic DAO',
        tokenName: 'BasicToken',
        tokenSymbol: 'BSC',
        privateKey: testPrivateKey,
        address: mockWallet.address,
        publicKey: mockWallet.publicKey,
        pinataApiKey: 'basic-pinata-key',
        pinataApiSecret: 'basic-pinata-secret',
        googleClientId: 'basic-client-id.apps.googleusercontent.com',
        googleClientSecret: 'basic-google-secret',
        githubUsername: 'basic-user',
        network: 'moksha',
        rpcUrl: 'https://rpc.moksha.vana.org',
        chainId: 14800
      });
    });

    test('validates user input during prompting', async () => {
      const testPrivateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      // Test that validation functions are called during prompting
      inquirer.prompt.mockImplementation((questions) => {
        // Find questions with validation and test them
        for (const question of questions) {
          if (question.validate) {
            // Test private key validation
            if (question.name === 'privateKey') {
              expect(question.validate('invalid')).toBe('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
              expect(question.validate('0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51')).toBe(true);
              expect(question.validate('3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51')).toBe(true);
            }
          }
        }

        // Return mock responses based on what's being asked
        if (questions.some(q => q.name === 'dlpName')) {
          return Promise.resolve({
            dlpName: 'Test DAO',
            tokenName: 'TestToken',
            tokenSymbol: 'TEST'
          });
        }
        if (questions.some(q => q.name === 'privateKey')) {
          return Promise.resolve({
            privateKey: testPrivateKey
          });
        }
        if (questions.some(q => q.name === 'pinataApiKey')) {
          return Promise.resolve({
            pinataApiKey: 'test-key',
            pinataApiSecret: 'test-secret',
            googleClientId: 'test-id.apps.googleusercontent.com',
            googleClientSecret: 'test-secret'
          });
        }
        if (questions.some(q => q.name === 'githubUsername')) {
          return Promise.resolve({
            githubUsername: 'test-user'
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

    test('handles wallet derivation errors gracefully', async () => {
      deriveWalletFromPrivateKey.mockImplementation(() => {
        throw new Error('Failed to derive wallet from private key: Invalid private key');
      });

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Error Test DAO',
          tokenName: 'ErrorToken',
          tokenSymbol: 'ERR'
        })
        .mockResolvedValueOnce({
          privateKey: 'invalid-key'
        });

      await expect(setupConfig()).rejects.toThrow('Failed to derive wallet from private key: Invalid private key');
    });

    test('handles normalization errors', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Error Test DAO',
          tokenName: 'ErrorToken',
          tokenSymbol: 'ERR'
        })
        .mockResolvedValueOnce({
          privateKey: null  // This will trigger the normalizePrivateKey error
        });

      await expect(setupConfig()).rejects.toThrow('Private key must be a non-empty string');
    });

    test('prompts for all required fields in correct order', async () => {
      const testPrivateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Complete DAO',
          tokenName: 'CompleteToken',
          tokenSymbol: 'CMP'
        })
        .mockResolvedValueOnce({
          privateKey: testPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'complete-pinata-key',
          pinataApiSecret: 'complete-pinata-secret',
          googleClientId: 'complete-client-id.apps.googleusercontent.com',
          googleClientSecret: 'complete-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'complete-user'
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
      expect(secondCall.some(q => q.name === 'privateKey')).toBe(true);

      // Check that service credentials are prompted third
      const thirdCall = inquirer.prompt.mock.calls[2][0];
      expect(thirdCall.some(q => q.name === 'pinataApiKey')).toBe(true);
      expect(thirdCall.some(q => q.name === 'googleClientId')).toBe(true);
      
      // Check that GitHub username is prompted last
      const fourthCall = inquirer.prompt.mock.calls[3][0];
      expect(fourthCall.some(q => q.name === 'githubUsername')).toBe(true);
    });

    test('includes default network configuration', async () => {
      const testPrivateKey = '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51';
      const mockWallet = {
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0x0279e3b8a4e7e63be1d5a1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5e1b8b7e3e5'
      };
      deriveWalletFromPrivateKey.mockReturnValue(mockWallet);

      inquirer.prompt
        .mockResolvedValueOnce({
          dlpName: 'Network Test DAO',
          tokenName: 'NetworkToken',
          tokenSymbol: 'NET'
        })
        .mockResolvedValueOnce({
          privateKey: testPrivateKey
        })
        .mockResolvedValueOnce({
          pinataApiKey: 'network-pinata-key',
          pinataApiSecret: 'network-pinata-secret',
          googleClientId: 'network-client-id.apps.googleusercontent.com',
          googleClientSecret: 'network-google-secret'
        })
        .mockResolvedValueOnce({
          githubUsername: 'network-user'
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