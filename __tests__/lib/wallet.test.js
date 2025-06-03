/**
 * Tests for wallet.js - Currently 13.33% coverage
 * Target: 100% coverage
 */

const {
  deriveWalletFromPrivateKey,
  validatePrivateKey
} = require('../../lib/wallet');

// Mock viem/accounts
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn()
}));

const { privateKeyToAccount } = require('viem/accounts');

describe('Wallet Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deriveWalletFromPrivateKey', () => {
    describe('successful derivation', () => {
      test('derives wallet from private key with 0x prefix', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const result = deriveWalletFromPrivateKey(privateKey);

        expect(result).toEqual({
          address: mockAccount.address,
          publicKey: mockAccount.publicKey
        });
        expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey);
      });

      test('derives wallet from private key without 0x prefix', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const privateKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const result = deriveWalletFromPrivateKey(privateKey);

        expect(result).toEqual({
          address: mockAccount.address,
          publicKey: mockAccount.publicKey
        });
        expect(privateKeyToAccount).toHaveBeenCalledWith('0x' + privateKey);
      });

      test('normalizes private key by adding 0x prefix when missing', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const privateKeyWithoutPrefix = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        deriveWalletFromPrivateKey(privateKeyWithoutPrefix);

        expect(privateKeyToAccount).toHaveBeenCalledWith('0x' + privateKeyWithoutPrefix);
      });

      test('returns object with address and publicKey properties', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const result = deriveWalletFromPrivateKey(privateKey);

        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('publicKey');
        expect(typeof result.address).toBe('string');
        expect(typeof result.publicKey).toBe('string');
      });

      test('calls privateKeyToAccount with normalized key', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        deriveWalletFromPrivateKey(privateKey);

        expect(privateKeyToAccount).toHaveBeenCalledTimes(1);
        expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey);
      });
    });

    describe('error handling', () => {
      test('throws error for invalid private key format (not 64 hex chars)', () => {
        expect(() => deriveWalletFromPrivateKey('0x123')).toThrow('Invalid private key format');
      });

      test('throws error for private key that is too short', () => {
        const shortKey = '0x' + 'a'.repeat(32); // 32 chars instead of 64
        expect(() => deriveWalletFromPrivateKey(shortKey)).toThrow('Invalid private key format');
      });

      test('throws error for private key that is too long', () => {
        const longKey = '0x' + 'a'.repeat(66); // 66 chars instead of 64
        expect(() => deriveWalletFromPrivateKey(longKey)).toThrow('Invalid private key format');
      });

      test('throws error for private key with invalid characters', () => {
        const invalidKey = '0x' + 'g'.repeat(64); // 'g' is not a valid hex character
        expect(() => deriveWalletFromPrivateKey(invalidKey)).toThrow('Invalid private key format');
      });

      test('throws error for empty private key', () => {
        expect(() => deriveWalletFromPrivateKey('')).toThrow('Invalid private key format');
      });

      test('throws error for null private key', () => {
        expect(() => deriveWalletFromPrivateKey(null)).toThrow('Failed to derive wallet from private key');
      });

      test('throws error for undefined private key', () => {
        expect(() => deriveWalletFromPrivateKey(undefined)).toThrow('Failed to derive wallet from private key');
      });

      test('wraps viem errors with descriptive message', () => {
        privateKeyToAccount.mockImplementation(() => {
          throw new Error('viem internal error');
        });

        const validKey = '0x' + 'a'.repeat(64);
        expect(() => deriveWalletFromPrivateKey(validKey)).toThrow('Failed to derive wallet from private key: viem internal error');
      });

      test('preserves original error message in thrown error', () => {
        privateKeyToAccount.mockImplementation(() => {
          throw new Error('specific viem error');
        });

        const validKey = '0x' + 'a'.repeat(64);
        expect(() => deriveWalletFromPrivateKey(validKey)).toThrow('specific viem error');
      });
    });

    describe('edge cases', () => {
      test('handles private key with mixed case hex characters', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const mixedCaseKey = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890';
        const result = deriveWalletFromPrivateKey(mixedCaseKey);

        expect(result).toEqual({
          address: mockAccount.address,
          publicKey: mockAccount.publicKey
        });
        expect(privateKeyToAccount).toHaveBeenCalledWith(mixedCaseKey);
      });

      test('handles private key that is exactly 64 characters', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const exactly64CharsKey = '0x' + 'a'.repeat(64);
        const result = deriveWalletFromPrivateKey(exactly64CharsKey);

        expect(result).toEqual({
          address: mockAccount.address,
          publicKey: mockAccount.publicKey
        });
      });

      test('rejects private key with spaces', () => {
        const keyWithSpaces = '0x abcd ef1234567890abcdef1234567890abcdef1234567890abcdef123456789';
        expect(() => deriveWalletFromPrivateKey(keyWithSpaces)).toThrow('Invalid private key format');
      });

      test('rejects private key with special characters', () => {
        const keyWithSpecialChars = '0x@bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        expect(() => deriveWalletFromPrivateKey(keyWithSpecialChars)).toThrow('Invalid private key format');
      });
    });
  });

  describe('validatePrivateKey', () => {
    describe('valid keys', () => {
      beforeEach(() => {
        // Mock successful privateKeyToAccount for valid key tests
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);
      });

      test('returns true for valid private key with 0x prefix', () => {
        const validKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        expect(validatePrivateKey(validKey)).toBe(true);
      });

      test('returns true for valid private key without 0x prefix', () => {
        const validKey = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        expect(validatePrivateKey(validKey)).toBe(true);
      });

      test('returns true for private key with lowercase hex', () => {
        const lowercaseKey = '0x' + 'a'.repeat(64);
        expect(validatePrivateKey(lowercaseKey)).toBe(true);
      });

      test('returns true for private key with uppercase hex', () => {
        const uppercaseKey = '0x' + 'A'.repeat(64);
        expect(validatePrivateKey(uppercaseKey)).toBe(true);
      });

      test('returns true for private key with mixed case hex', () => {
        const mixedCaseKey = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890';
        expect(validatePrivateKey(mixedCaseKey)).toBe(true);
      });
    });

    describe('invalid keys', () => {
      test('returns false for invalid private key format', () => {
        expect(validatePrivateKey('0x123')).toBe(false);
      });

      test('returns false for empty string', () => {
        expect(validatePrivateKey('')).toBe(false);
      });

      test('returns false for null', () => {
        expect(validatePrivateKey(null)).toBe(false);
      });

      test('returns false for undefined', () => {
        expect(validatePrivateKey(undefined)).toBe(false);
      });

      test('returns false for private key that is too short', () => {
        const shortKey = '0x' + 'a'.repeat(32);
        expect(validatePrivateKey(shortKey)).toBe(false);
      });

      test('returns false for private key that is too long', () => {
        const longKey = '0x' + 'a'.repeat(66);
        expect(validatePrivateKey(longKey)).toBe(false);
      });

      test('returns false for private key with invalid characters', () => {
        const invalidKey = '0x' + 'g'.repeat(64);
        expect(validatePrivateKey(invalidKey)).toBe(false);
      });

      test('returns false when deriveWalletFromPrivateKey throws', () => {
        // Set up mock to throw an error
        privateKeyToAccount.mockImplementation(() => {
          throw new Error('mock error');
        });

        const validKey = '0x' + 'a'.repeat(64);
        expect(validatePrivateKey(validKey)).toBe(false);
      });
    });

    describe('integration with deriveWalletFromPrivateKey', () => {
      test('calls deriveWalletFromPrivateKey internally', () => {
        const mockAccount = {
          address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
          publicKey: '0x04abc123...'
        };
        privateKeyToAccount.mockReturnValue(mockAccount);

        const validKey = '0x' + 'a'.repeat(64);
        validatePrivateKey(validKey);

        // validatePrivateKey should call deriveWalletFromPrivateKey internally
        expect(privateKeyToAccount).toHaveBeenCalledWith(validKey);
      });

      test('catches and suppresses errors from deriveWalletFromPrivateKey', () => {
        privateKeyToAccount.mockImplementation(() => {
          throw new Error('internal error');
        });

        const invalidKey = '0x' + 'a'.repeat(64);
        
        // Should not throw, should return false instead
        expect(() => validatePrivateKey(invalidKey)).not.toThrow();
        expect(validatePrivateKey(invalidKey)).toBe(false);
      });

      test('does not expose internal error details', () => {
        privateKeyToAccount.mockImplementation(() => {
          throw new Error('sensitive internal details');
        });

        const invalidKey = '0x' + 'a'.repeat(64);
        const result = validatePrivateKey(invalidKey);

        // Should return false without exposing error details
        expect(result).toBe(false);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('viem integration', () => {
    test('uses viem privateKeyToAccount correctly', () => {
      const mockAccount = {
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      };
      privateKeyToAccount.mockReturnValue(mockAccount);

      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      deriveWalletFromPrivateKey(privateKey);

      expect(privateKeyToAccount).toHaveBeenCalledTimes(1);
      expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey);
    });

    test('handles viem account object structure', () => {
      const mockAccount = {
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...',
        extraProperty: 'should be ignored'
      };
      privateKeyToAccount.mockReturnValue(mockAccount);

      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = deriveWalletFromPrivateKey(privateKey);

      // Should only extract address and publicKey
      expect(result).toEqual({
        address: mockAccount.address,
        publicKey: mockAccount.publicKey
      });
      expect(result).not.toHaveProperty('extraProperty');
    });

    test('extracts address from viem account', () => {
      const expectedAddress = '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7';
      const mockAccount = {
        address: expectedAddress,
        publicKey: '0x04abc123...'
      };
      privateKeyToAccount.mockReturnValue(mockAccount);

      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = deriveWalletFromPrivateKey(privateKey);

      expect(result.address).toBe(expectedAddress);
    });

    test('extracts publicKey from viem account', () => {
      const expectedPublicKey = '0x04abc123def456...';
      const mockAccount = {
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: expectedPublicKey
      };
      privateKeyToAccount.mockReturnValue(mockAccount);

      const privateKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = deriveWalletFromPrivateKey(privateKey);

      expect(result.publicKey).toBe(expectedPublicKey);
    });
  });
});