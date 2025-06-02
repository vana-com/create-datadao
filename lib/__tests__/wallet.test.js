const { deriveWalletFromPrivateKey, validatePrivateKey } = require('../wallet');
const { createMockViemAccount } = require('../../__tests__/mocks/factories');

// Mock viem/accounts
jest.mock('viem/accounts');
const { privateKeyToAccount } = require('viem/accounts');

describe('Wallet Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deriveWalletFromPrivateKey', () => {
    test('derives wallet from valid private key with 0x prefix', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const mockAccount = createMockViemAccount();
      
      privateKeyToAccount.mockReturnValue(mockAccount);
      
      const result = deriveWalletFromPrivateKey(privateKey);
      
      expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey);
      expect(result).toEqual({
        address: mockAccount.address,
        publicKey: mockAccount.publicKey
      });
    });

    test('normalizes private key without 0x prefix', () => {
      const privateKey = '1234567890123456789012345678901234567890123456789012345678901234';
      const expectedNormalized = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const mockAccount = createMockViemAccount();
      
      privateKeyToAccount.mockReturnValue(mockAccount);
      
      const result = deriveWalletFromPrivateKey(privateKey);
      
      expect(privateKeyToAccount).toHaveBeenCalledWith(expectedNormalized);
      expect(result).toEqual({
        address: mockAccount.address,
        publicKey: mockAccount.publicKey
      });
    });

    test('throws error for invalid private key length', () => {
      const privateKey = '0x123'; // Too short
      
      expect(() => deriveWalletFromPrivateKey(privateKey))
        .toThrow('Invalid private key format. Must be a 64-character hex string');
      
      expect(privateKeyToAccount).not.toHaveBeenCalled();
    });

    test('throws error for non-hex characters', () => {
      const privateKey = '0x123456789012345678901234567890123456789012345678901234567890123g'; // 'g' is not hex
      
      expect(() => deriveWalletFromPrivateKey(privateKey))
        .toThrow('Invalid private key format. Must be a 64-character hex string');
      
      expect(privateKeyToAccount).not.toHaveBeenCalled();
    });

    test('throws error when viem throws', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const viemError = new Error('Invalid private key');
      
      privateKeyToAccount.mockImplementation(() => {
        throw viemError;
      });
      
      expect(() => deriveWalletFromPrivateKey(privateKey))
        .toThrow('Failed to derive wallet from private key: Invalid private key');
    });

    test('handles edge case private keys', () => {
      const testCases = [
        '0x0000000000000000000000000000000000000000000000000000000000000001', // Minimum valid
        '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140', // Just under secp256k1 max
        '0x1111111111111111111111111111111111111111111111111111111111111111', // All 1s
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // All a's
      ];
      
      testCases.forEach(privateKey => {
        const mockAccount = createMockViemAccount({ address: `0x${privateKey.slice(2, 42)}` });
        privateKeyToAccount.mockReturnValue(mockAccount);
        
        const result = deriveWalletFromPrivateKey(privateKey);
        
        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('publicKey');
      });
    });
  });

  describe('validatePrivateKey', () => {
    test('returns true for valid private key that can derive wallet', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const mockAccount = createMockViemAccount();
      
      privateKeyToAccount.mockReturnValue(mockAccount);
      
      const result = validatePrivateKey(privateKey);
      
      expect(result).toBe(true);
      expect(privateKeyToAccount).toHaveBeenCalledWith(privateKey);
    });

    test('returns false for invalid private key format', () => {
      const privateKey = '0x123'; // Too short
      
      const result = validatePrivateKey(privateKey);
      
      expect(result).toBe(false);
      expect(privateKeyToAccount).not.toHaveBeenCalled();
    });

    test('returns false when viem throws error', () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      privateKeyToAccount.mockImplementation(() => {
        throw new Error('Invalid key');
      });
      
      const result = validatePrivateKey(privateKey);
      
      expect(result).toBe(false);
    });

    test('handles key without 0x prefix', () => {
      const privateKey = '1234567890123456789012345678901234567890123456789012345678901234';
      const mockAccount = createMockViemAccount();
      
      privateKeyToAccount.mockReturnValue(mockAccount);
      
      const result = validatePrivateKey(privateKey);
      
      expect(result).toBe(true);
      expect(privateKeyToAccount).toHaveBeenCalledWith('0x' + privateKey);
    });

    test('validates multiple private key formats', () => {
      const validKeys = [
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '1234567890123456789012345678901234567890123456789012345678901234',
        '0xAABBCCDDEEFF11223344556677889900AABBCCDDEEFF11223344556677889900',
        'aabbccddeeff11223344556677889900aabbccddeeff11223344556677889900'
      ];
      
      validKeys.forEach(key => {
        privateKeyToAccount.mockReturnValue(createMockViemAccount());
        
        const result = validatePrivateKey(key);
        expect(result).toBe(true);
      });
    });

    test('rejects invalid private key formats', () => {
      const invalidKeys = [
        '0x123', // Too short
        '0x12345678901234567890123456789012345678901234567890123456789012345', // Too long
        '0x123456789012345678901234567890123456789012345678901234567890123g', // Invalid hex
        '123', // Too short without prefix
        '', // Empty
        '0x', // Just prefix
        'not-a-key', // Not hex at all
      ];
      
      invalidKeys.forEach(key => {
        const result = validatePrivateKey(key);
        expect(result).toBe(false);
      });
    });
  });
});