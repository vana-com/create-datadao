/**
 * Additional tests for uncovered lines in validation.js
 * Current coverage: 92.15%
 * Target: 100% coverage
 * 
 * Uncovered lines: 38,86,129,133
 */

const {
  validateInput,
  validateConfig,
  validateRequired,
  validatePrivateKey,
  normalizePrivateKey
} = require('../../lib/validation');

// Mock wallet module to test error paths
jest.mock('../../lib/wallet', () => ({
  deriveWalletFromPrivateKey: jest.fn()
}));

const { deriveWalletFromPrivateKey } = require('../../lib/wallet');

describe('Validation Functions - Additional Coverage', () => {
  // Common required fields for test configs
  const requiredExternalServices = {
    pinataApiKey: 'test-pinata-key',
    pinataApiSecret: 'test-pinata-secret',
    googleClientId: 'test-google-client-id',
    googleClientSecret: 'test-google-client-secret'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePrivateKey - error paths', () => {
    test('returns error message when deriveWalletFromPrivateKey throws (line 38)', () => {
      // Mock deriveWalletFromPrivateKey to throw an error
      deriveWalletFromPrivateKey.mockImplementation(() => {
        throw new Error('Mock wallet derivation error');
      });

      const result = validatePrivateKey('0x' + 'a'.repeat(64));
      expect(result).toBe('Invalid private key: Unable to derive wallet credentials');
      expect(deriveWalletFromPrivateKey).toHaveBeenCalled();
    });

    test('catches and handles wallet derivation errors gracefully', () => {
      // Mock deriveWalletFromPrivateKey to throw different types of errors
      deriveWalletFromPrivateKey.mockImplementation(() => {
        throw new Error('Any error from wallet derivation');
      });

      const result = validatePrivateKey('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
      expect(result).toBe('Invalid private key: Unable to derive wallet credentials');
      expect(typeof result).toBe('string');
    });

    test('provides user-friendly error message for invalid keys', () => {
      // Test that the validation module handles derivation errors with a user-friendly message
      deriveWalletFromPrivateKey.mockImplementation(() => {
        throw new Error('Complex internal viem error with technical details');
      });

      const result = validatePrivateKey('0x' + 'f'.repeat(64));
      expect(result).toBe('Invalid private key: Unable to derive wallet credentials');
      expect(result).not.toContain('Complex internal viem error');
    });
  });

  describe('validateInput.tokenSymbol - edge cases', () => {
    test('validates token symbols must be 3-5 characters (line 86)', () => {
      // Test the "Token symbol is required" path (line 86)
      expect(validateInput.tokenSymbol('')).toBe('Token symbol is required');
      expect(validateInput.tokenSymbol('   ')).toBe('Token symbol is required');
      expect(validateInput.tokenSymbol(null)).toBe('Token symbol is required');
      expect(validateInput.tokenSymbol(undefined)).toBe('Token symbol is required');
    });

    test('rejects 2-character symbols', () => {
      expect(validateInput.tokenSymbol('AB')).toBe('Token symbol must be 3-5 characters');
      expect(validateInput.tokenSymbol('XY')).toBe('Token symbol must be 3-5 characters');
    });

    test('rejects 6-character symbols', () => {
      expect(validateInput.tokenSymbol('ABCDEF')).toBe('Token symbol must be 3-5 characters');
      expect(validateInput.tokenSymbol('TOOLONG')).toBe('Token symbol must be 3-5 characters');
    });

    test('accepts exactly 3-character symbols', () => {
      expect(validateInput.tokenSymbol('ABC')).toBe(true);
      expect(validateInput.tokenSymbol('XYZ')).toBe(true);
    });

    test('accepts exactly 5-character symbols', () => {
      expect(validateInput.tokenSymbol('ABCDE')).toBe(true);
      expect(validateInput.tokenSymbol('TOKEN')).toBe(true);
    });
  });

  describe('validateConfig - validation paths', () => {
    beforeEach(() => {
      // Mock successful wallet derivation for valid private key tests
      deriveWalletFromPrivateKey.mockReturnValue({
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      });
    });

    test('validates address format when present (line 129)', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: 'invalid-address',  // Invalid format
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid address format. Must be a 0x-prefixed 40-character hex string');
    });

    test('accepts valid 0x-prefixed 40-character addresses', () => {
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',  // Valid format
        ...requiredExternalServices
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('rejects addresses without 0x prefix', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: '742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',  // Missing 0x prefix
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid address format. Must be a 0x-prefixed 40-character hex string');
    });

    test('rejects addresses that are too short', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652',  // Too short
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid address format. Must be a 0x-prefixed 40-character hex string');
    });

    test('rejects addresses that are too long', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7abc',  // Too long
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid address format. Must be a 0x-prefixed 40-character hex string');
    });

    test('allows missing address (will be derived)', () => {
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        ...requiredExternalServices
        // No address field - should be fine
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('validateConfig - publicKey validation', () => {
    beforeEach(() => {
      // Mock successful wallet derivation for valid private key tests
      deriveWalletFromPrivateKey.mockReturnValue({
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      });
    });

    test('validates publicKey format when present (line 133)', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        publicKey: '04abc123def456789...',  // Missing 0x prefix
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid public key format. Must be a 0x-prefixed hex string');
    });

    test('accepts valid 0x-prefixed public keys', () => {
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        publicKey: '0x04abc123def456789...',  // Valid format
        ...requiredExternalServices
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('rejects public keys without 0x prefix', () => {
      const invalidConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        publicKey: 'abc123def456789...',  // Missing 0x prefix
        ...requiredExternalServices
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Invalid public key format. Must be a 0x-prefixed hex string');
    });

    test('allows missing publicKey (will be derived)', () => {
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        ...requiredExternalServices
        // No publicKey field - should be fine
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('validates publicKey length appropriately', () => {
      // Even short public keys should be accepted as long as they have 0x prefix
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        publicKey: '0x04',  // Short but valid format
        ...requiredExternalServices
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('validateConfig - external services validation', () => {
    beforeEach(() => {
      // Mock successful wallet derivation for valid private key tests
      deriveWalletFromPrivateKey.mockReturnValue({
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      });
    });

    test('requires pinataApiKey field', () => {
      const configWithoutPinataKey = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        pinataApiSecret: 'test-secret',
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret'
        // Missing pinataApiKey
      };

      expect(() => validateConfig(configWithoutPinataKey)).toThrow('Missing required field: pinataApiKey');
    });

    test('requires pinataApiSecret field', () => {
      const configWithoutPinataSecret = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        pinataApiKey: 'test-key',
        googleClientId: 'test-client-id',
        googleClientSecret: 'test-client-secret'
        // Missing pinataApiSecret
      };

      expect(() => validateConfig(configWithoutPinataSecret)).toThrow('Missing required field: pinataApiSecret');
    });

    test('requires googleClientId field', () => {
      const configWithoutGoogleId = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        pinataApiKey: 'test-key',
        pinataApiSecret: 'test-secret',
        googleClientSecret: 'test-client-secret'
        // Missing googleClientId
      };

      expect(() => validateConfig(configWithoutGoogleId)).toThrow('Missing required field: googleClientId');
    });

    test('requires googleClientSecret field', () => {
      const configWithoutGoogleSecret = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        pinataApiKey: 'test-key',
        pinataApiSecret: 'test-secret',
        googleClientId: 'test-client-id'
        // Missing googleClientSecret
      };

      expect(() => validateConfig(configWithoutGoogleSecret)).toThrow('Missing required field: googleClientSecret');
    });

    test('accepts config with all required external services', () => {
      const validConfig = {
        dlpName: 'Test DAO',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        privateKey: '0x' + 'a'.repeat(64),
        ...requiredExternalServices
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });
  });

  describe('edge cases and error messages', () => {
    beforeEach(() => {
      // Mock successful wallet derivation for valid private key tests
      deriveWalletFromPrivateKey.mockReturnValue({
        address: '0x742D4C2a3A7A40D52fE50000a3B25F3E1A652fE7',
        publicKey: '0x04abc123...'
      });
    });

    test('provides clear error messages for each validation failure', () => {
      // Test each validation function provides specific error messages
      expect(validateInput.dlpName('')).toBe('DataDAO name is required');
      expect(validateInput.tokenName('')).toBe('Token name is required');
      expect(validateInput.tokenSymbol('')).toBe('Token symbol is required');
      expect(validateInput.tokenSymbol('AB')).toBe('Token symbol must be 3-5 characters');
      expect(validateInput.tokenSymbol('abc')).toBe('Token symbol must be uppercase letters only'); // Valid length but lowercase
      expect(validatePrivateKey('')).toBe('Private key is required');
      expect(validatePrivateKey('invalid')).toBe('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
    });

    test('handles null/undefined values appropriately', () => {
      // Test that functions handle null/undefined gracefully
      expect(validateInput.dlpName(null)).toBe('DataDAO name is required');
      expect(validateInput.dlpName(undefined)).toBe('DataDAO name is required');
      expect(validateInput.tokenName(null)).toBe('Token name is required');
      expect(validateInput.tokenName(undefined)).toBe('Token name is required');
      expect(validateInput.tokenSymbol(null)).toBe('Token symbol is required');
      expect(validateInput.tokenSymbol(undefined)).toBe('Token symbol is required');
      expect(validatePrivateKey(null)).toBe('Private key is required');
      expect(validatePrivateKey(undefined)).toBe('Private key is required');
    });

    test('validates hex string formats correctly', () => {
      // Test that hex validation works for private keys
      expect(validatePrivateKey('0x' + 'g'.repeat(64))).toBe('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
      expect(validatePrivateKey('0x' + '!'.repeat(64))).toBe('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
      expect(validatePrivateKey('0x' + ' '.repeat(64))).toBe('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
    });

    test('handles case sensitivity in hex validation', () => {
      // Test that hex validation accepts both uppercase and lowercase
      const lowercaseHex = '0x' + 'abcdef0123456789'.repeat(4);
      const uppercaseHex = '0x' + 'ABCDEF0123456789'.repeat(4);
      const mixedCaseHex = '0x' + 'AbCdEf0123456789'.repeat(4);
      
      expect(validatePrivateKey(lowercaseHex)).toBe(true);
      expect(validatePrivateKey(uppercaseHex)).toBe(true);
      expect(validatePrivateKey(mixedCaseHex)).toBe(true);
    });
  });
});