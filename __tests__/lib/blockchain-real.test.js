/**
 * Real Blockchain Tests
 * Tests the actual blockchain functions that exist in lib/blockchain.js
 */

const { 
  pollEncryptionKey,
  getDlpId,
  extractRefinerIdFromLogs,
  waitForRefinerRegistration
} = require('../../lib/blockchain');

// Mock viem to avoid real network calls
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
  parseAbi: jest.fn()
}));

jest.mock('viem/chains', () => ({
  moksha: { id: 14800 }
}));

const { createPublicClient } = require('viem');

describe('Blockchain Functions - Real Tests', () => {
  let mockClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      readContract: jest.fn(),
      waitForTransactionReceipt: jest.fn(),
      getLogs: jest.fn()
    };
    
    createPublicClient.mockReturnValue(mockClient);
    
    // Mock console to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('pollEncryptionKey', () => {
    test('returns encryption key when found', async () => {
      const mockKey = 'test-encryption-key-12345';
      mockClient.readContract.mockResolvedValue(mockKey);

      const result = await pollEncryptionKey(42);

      expect(result).toBe(mockKey);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: '0xd25Eb66EA2452cf3238A2eC6C1FD1B7F5B320490', // QUERY_ENGINE_ADDRESS
        abi: expect.any(Array),
        functionName: 'dlpPubKeys',
        args: [BigInt(42)]
      });
    });

    test('retries when key is not available initially', async () => {
      const mockKey = 'delayed-encryption-key';
      mockClient.readContract
        .mockResolvedValueOnce('') // First call returns empty
        .mockResolvedValueOnce('') // Second call returns empty
        .mockResolvedValueOnce(mockKey); // Third call returns key

      const result = await pollEncryptionKey(42, 5);

      expect(result).toBe(mockKey);
      expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    });

    test('throws error after max attempts', async () => {
      mockClient.readContract.mockResolvedValue(''); // Always returns empty

      await expect(pollEncryptionKey(42, 3)).rejects.toThrow('Failed to retrieve encryption key');
      expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    });

    test('handles network errors gracefully', async () => {
      mockClient.readContract.mockRejectedValue(new Error('Network timeout'));

      await expect(pollEncryptionKey(42, 2)).rejects.toThrow('Failed to retrieve encryption key');
      expect(mockClient.readContract).toHaveBeenCalledTimes(2);
    });

    test('uses correct default max attempts', async () => {
      mockClient.readContract.mockResolvedValue(''); // Always returns empty

      const startTime = Date.now();
      const promise = pollEncryptionKey(42); // Should use default 60 attempts
      
      // Cancel the test after a reasonable time to avoid waiting 30 minutes
      setTimeout(() => promise.catch(() => {}), 1000);
      
      await expect(promise).rejects.toThrow('Failed to retrieve encryption key');
      
      // Should have tried multiple times
      expect(mockClient.readContract).toHaveBeenCalledTimes(60);
    }, 35000); // Set timeout to 35 seconds
  });

  describe('getDlpId', () => {
    test('returns dlpId for registered DLP', async () => {
      const mockDlpId = BigInt(123);
      mockClient.readContract.mockResolvedValue(mockDlpId);

      const result = await getDlpId('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(123);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: '0x4D59880a924526d1dD33260552Ff4328b1E18a43', // DLP_REGISTRY_ADDRESS
        abi: expect.any(Array),
        functionName: 'dlpIds',
        args: ['0x1234567890abcdef1234567890abcdef12345678']
      });
    });

    test('returns 0 for unregistered DLP', async () => {
      mockClient.readContract.mockResolvedValue(BigInt(0));

      const result = await getDlpId('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(0);
    });

    test('handles contract call errors', async () => {
      mockClient.readContract.mockRejectedValue(new Error('Contract call failed'));

      const result = await getDlpId('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toBe(0);
    });

    test('handles invalid addresses gracefully', async () => {
      mockClient.readContract.mockRejectedValue(new Error('Invalid address'));

      const result = await getDlpId('invalid-address');

      expect(result).toBe(0);
    });
  });

  describe('extractRefinerIdFromLogs', () => {
    test('extracts refiner ID from transaction logs', () => {
      const mockLogs = [
        {
          topics: ['0x1234', '0x0000000000000000000000000000000000000000000000000000000000000042'],
          address: '0xcontract1'
        },
        {
          topics: ['0x5678', '0x0000000000000000000000000000000000000000000000000000000000000099'],
          address: '0xcontract2'
        }
      ];

      const result = extractRefinerIdFromLogs(mockLogs);

      // Should extract the numeric ID from the first log's second topic
      expect(result).toBe(66); // 0x42 = 66 in decimal
    });

    test('returns null for empty logs', () => {
      const result = extractRefinerIdFromLogs([]);
      expect(result).toBeNull();
    });

    test('returns null for logs without topics', () => {
      const mockLogs = [
        { address: '0xcontract1' },
        { topics: [], address: '0xcontract2' }
      ];

      const result = extractRefinerIdFromLogs(mockLogs);
      expect(result).toBeNull();
    });

    test('handles logs with insufficient topics', () => {
      const mockLogs = [
        {
          topics: ['0x1234'], // Only one topic
          address: '0xcontract1'
        }
      ];

      const result = extractRefinerIdFromLogs(mockLogs);
      expect(result).toBeNull();
    });

    test('extracts ID from hex topic correctly', () => {
      const testCases = [
        { hex: '0x0000000000000000000000000000000000000000000000000000000000000001', expected: 1 },
        { hex: '0x00000000000000000000000000000000000000000000000000000000000000ff', expected: 255 },
        { hex: '0x0000000000000000000000000000000000000000000000000000000000001000', expected: 4096 }
      ];

      for (const testCase of testCases) {
        const mockLogs = [{
          topics: ['0x1234', testCase.hex],
          address: '0xcontract1'
        }];

        const result = extractRefinerIdFromLogs(mockLogs);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('waitForRefinerRegistration', () => {
    test('returns refiner ID when found in logs', async () => {
      const mockReceipt = {
        logs: [
          {
            topics: ['0x1234', '0x0000000000000000000000000000000000000000000000000000000000000042'],
            address: '0xcontract1'
          }
        ]
      };

      mockClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const result = await waitForRefinerRegistration('0xabcdef123456789');

      expect(result).toBe(66); // 0x42 = 66
      expect(mockClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xabcdef123456789'
      });
    });

    test('throws error when no refiner ID found in logs', async () => {
      const mockReceipt = {
        logs: [] // No logs
      };

      mockClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      await expect(waitForRefinerRegistration('0xabcdef123456789')).rejects.toThrow(
        'Could not extract refiner ID from transaction logs'
      );
    });

    test('handles transaction receipt errors', async () => {
      mockClient.waitForTransactionReceipt.mockRejectedValue(new Error('Transaction failed'));

      await expect(waitForRefinerRegistration('0xabcdef123456789')).rejects.toThrow(
        'Transaction failed'
      );
    });

    test('handles malformed transaction hash', async () => {
      mockClient.waitForTransactionReceipt.mockRejectedValue(new Error('Invalid transaction hash'));

      await expect(waitForRefinerRegistration('invalid-hash')).rejects.toThrow(
        'Invalid transaction hash'
      );
    });
  });

  describe('Integration Tests', () => {
    test('complete encryption key retrieval flow', async () => {
      // First check if DLP is registered
      mockClient.readContract
        .mockResolvedValueOnce(BigInt(42)) // getDlpId returns 42
        .mockResolvedValueOnce('encryption-key-for-dlp-42'); // pollEncryptionKey returns key

      // Test the typical flow: get dlpId, then get encryption key
      const dlpAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      const dlpId = await getDlpId(dlpAddress);
      expect(dlpId).toBe(42);
      
      const encryptionKey = await pollEncryptionKey(dlpId, 1); // Only 1 attempt for test
      expect(encryptionKey).toBe('encryption-key-for-dlp-42');
    });

    test('complete refiner registration flow', async () => {
      const mockReceipt = {
        logs: [
          {
            topics: ['0x1234', '0x0000000000000000000000000000000000000000000000000000000000000123'],
            address: '0xrefiner-contract'
          }
        ]
      };

      mockClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const refinerId = await waitForRefinerRegistration('0xtransaction-hash');
      expect(refinerId).toBe(291); // 0x123 = 291

      // Verify the refiner ID is valid
      expect(refinerId).toBeGreaterThan(0);
      expect(Number.isInteger(refinerId)).toBe(true);
    });
  });
});