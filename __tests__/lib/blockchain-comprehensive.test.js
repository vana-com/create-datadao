/**
 * Comprehensive Blockchain Tests
 * Tests actual blockchain logic and error handling without excessive mocking
 */

const { 
  checkWalletBalance, 
  registerDataDAO, 
  deployDataDAOContracts,
  createViemClients,
  handleTransactionError,
  retryWithExponentialBackoff
} = require('../../lib/blockchain');

// Only mock external network calls, not our own logic
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  parseEther: jest.fn(val => BigInt(val * 1e18)),
  formatEther: jest.fn(val => Number(val) / 1e18),
  moksha: { id: 14800 }
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn()
}));

const { createPublicClient, createWalletClient, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

describe('Blockchain Functions - Real Logic Tests', () => {
  let mockPublicClient, mockWalletClient, mockAccount;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAccount = {
      address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
    };
    
    mockPublicClient = {
      getBalance: jest.fn(),
      readContract: jest.fn(),
      waitForTransactionReceipt: jest.fn()
    };
    
    mockWalletClient = {
      writeContract: jest.fn()
    };
    
    createPublicClient.mockReturnValue(mockPublicClient);
    createWalletClient.mockReturnValue(mockWalletClient);
    privateKeyToAccount.mockReturnValue(mockAccount);
  });

  describe('Wallet Balance Checking', () => {
    test('correctly identifies sufficient balance', async () => {
      // 2 VANA in wei
      mockPublicClient.getBalance.mockResolvedValue(BigInt('2000000000000000000'));
      
      const result = await checkWalletBalance('0x123', BigInt('1000000000000000000')); // 1 VANA minimum
      
      expect(result).toEqual({
        hasBalance: true,
        balance: BigInt('2000000000000000000'),
        balanceInVana: 2.0,
        required: BigInt('1000000000000000000'),
        requiredInVana: 1.0
      });
    });

    test('correctly identifies insufficient balance', async () => {
      // 0.5 VANA in wei
      mockPublicClient.getBalance.mockResolvedValue(BigInt('500000000000000000'));
      
      const result = await checkWalletBalance('0x123', BigInt('1000000000000000000')); // 1 VANA minimum
      
      expect(result).toEqual({
        hasBalance: false,
        balance: BigInt('500000000000000000'),
        balanceInVana: 0.5,
        required: BigInt('1000000000000000000'),
        requiredInVana: 1.0
      });
    });

    test('handles network errors gracefully', async () => {
      mockPublicClient.getBalance.mockRejectedValue(new Error('Network timeout'));
      
      const result = await checkWalletBalance('0x123', BigInt('1000000000000000000'));
      
      expect(result).toEqual({
        hasBalance: false,
        error: 'Network timeout',
        balance: BigInt(0),
        balanceInVana: 0,
        required: BigInt('1000000000000000000'),
        requiredInVana: 1.0
      });
    });

    test('calculates VANA conversion correctly', async () => {
      // Test various balance amounts
      const testCases = [
        { wei: BigInt('1000000000000000000'), vana: 1.0 },
        { wei: BigInt('500000000000000000'), vana: 0.5 },
        { wei: BigInt('2500000000000000000'), vana: 2.5 },
        { wei: BigInt('0'), vana: 0.0 }
      ];

      for (const testCase of testCases) {
        mockPublicClient.getBalance.mockResolvedValue(testCase.wei);
        
        const result = await checkWalletBalance('0x123', BigInt('1000000000000000000'));
        
        expect(result.balanceInVana).toBe(testCase.vana);
      }
    });
  });

  describe('Transaction Error Handling', () => {
    test('provides specific error messages for common failures', () => {
      const testCases = [
        {
          error: new Error('insufficient funds for gas * price + value'),
          expectedType: 'INSUFFICIENT_FUNDS',
          expectedMessage: 'Insufficient VANA for transaction',
          expectedSuggestions: ['Get testnet VANA from faucet: https://faucet.vana.org']
        },
        {
          error: new Error('execution reverted: DLP already registered'),
          expectedType: 'EXECUTION_REVERTED',
          expectedMessage: 'Transaction was rejected by the contract',
          expectedSuggestions: ['DLP already registered']
        },
        {
          error: new Error('network timeout'),
          expectedType: 'NETWORK_ERROR',
          expectedMessage: 'Network connection failed',
          expectedSuggestions: ['Check internet connection']
        },
        {
          error: new Error('nonce too low'),
          expectedType: 'NONCE_ERROR',
          expectedMessage: 'Transaction nonce conflict',
          expectedSuggestions: ['Wait for pending transactions to complete']
        }
      ];

      for (const testCase of testCases) {
        const result = handleTransactionError(testCase.error);
        
        expect(result.type).toBe(testCase.expectedType);
        expect(result.userFriendlyMessage).toBe(testCase.expectedMessage);
        expect(result.recoverySuggestions).toEqual(expect.arrayContaining(testCase.expectedSuggestions));
      }
    });

    test('includes original error details in result', () => {
      const originalError = new Error('Custom contract error');
      originalError.code = 'CALL_EXCEPTION';
      originalError.transaction = { hash: '0x123' };

      const result = handleTransactionError(originalError);

      expect(result.originalError).toBe(originalError);
      expect(result.details).toEqual({
        message: 'Custom contract error',
        code: 'CALL_EXCEPTION',
        transaction: { hash: '0x123' }
      });
    });
  });

  describe('Exponential Backoff Retry Logic', () => {
    test('retries failed operations with exponential backoff', async () => {
      let attempts = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary network error');
        }
        return { success: true, attempts };
      });

      const result = await retryWithExponentialBackoff(mockOperation, {
        maxAttempts: 5,
        initialDelay: 10,
        backoffMultiplier: 2
      });

      expect(result).toEqual({ success: true, attempts: 3 });
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('fails after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(retryWithExponentialBackoff(mockOperation, {
        maxAttempts: 3,
        initialDelay: 10
      })).rejects.toThrow('Persistent error');

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('does not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('insufficient funds');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(retryWithExponentialBackoff(mockOperation, {
        maxAttempts: 3,
        retryableErrors: ['network timeout', 'connection reset']
      })).rejects.toThrow('insufficient funds');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('calculates delay correctly', async () => {
      const delays = [];
      let attempts = 0;
      
      const mockOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 4) {
          throw new Error('network timeout');
        }
        return { success: true };
      });

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      await retryWithExponentialBackoff(mockOperation, {
        maxAttempts: 5,
        initialDelay: 100,
        backoffMultiplier: 2
      });

      global.setTimeout = originalSetTimeout;

      // Should have delays: 100, 200, 400 (for attempts 2, 3, 4)
      expect(delays).toEqual([100, 200, 400]);
    });
  });

  describe('DataDAO Registration Logic', () => {
    test('validates required configuration fields', async () => {
      const incompleteConfig = {
        // Missing required fields
      };

      await expect(registerDataDAO(incompleteConfig)).rejects.toThrow();
    });

    test('constructs registration parameters correctly', async () => {
      const config = {
        dlpName: 'TestDAO',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A'
      };

      mockPublicClient.getBalance.mockResolvedValue(BigInt('2000000000000000000')); // 2 VANA
      mockWalletClient.writeContract.mockResolvedValue('0x123456789abcdef');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345,
        gasUsed: 50000
      });

      // Mock dlpId retrieval
      mockPublicClient.readContract.mockResolvedValue(BigInt(42));

      const result = await registerDataDAO(config);

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith({
        address: expect.any(String),
        abi: expect.any(Array),
        functionName: 'registerDlp',
        args: [
          {
            dlpAddress: config.proxyAddress,
            ownerAddress: config.address,
            treasuryAddress: config.address,
            name: config.dlpName,
            iconUrl: '',
            website: '',
            metadata: ''
          }
        ],
        value: BigInt('1000000000000000000') // 1 VANA in wei
      });

      expect(result).toEqual({
        success: true,
        dlpId: 42,
        transactionHash: '0x123456789abcdef',
        blockNumber: 12345,
        gasUsed: 50000
      });
    });

    test('handles registration failures appropriately', async () => {
      const config = {
        dlpName: 'TestDAO',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A'
      };

      mockPublicClient.getBalance.mockResolvedValue(BigInt('2000000000000000000'));
      mockWalletClient.writeContract.mockRejectedValue(new Error('execution reverted: DLP already registered'));

      const result = await registerDataDAO(config);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'EXECUTION_REVERTED',
          userFriendlyMessage: 'Transaction was rejected by the contract',
          recoverySuggestions: expect.arrayContaining(['DLP already registered']),
          originalError: expect.any(Error),
          details: expect.any(Object)
        }
      });
    });

    test('checks balance before attempting registration', async () => {
      const config = {
        dlpName: 'TestDAO',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A'
      };

      // Insufficient balance
      mockPublicClient.getBalance.mockResolvedValue(BigInt('500000000000000000')); // 0.5 VANA

      const result = await registerDataDAO(config);

      expect(result).toEqual({
        success: false,
        error: {
          type: 'INSUFFICIENT_FUNDS',
          userFriendlyMessage: 'Insufficient VANA for registration (need 1.1 VANA, have 0.5 VANA)',
          recoverySuggestions: expect.arrayContaining(['Get testnet VANA from faucet: https://faucet.vana.org']),
          balanceInfo: {
            current: 0.5,
            required: 1.1,
            address: config.address
          }
        }
      });

      // Should not attempt transaction
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });

  describe('Client Creation', () => {
    test('creates viem clients with correct configuration', () => {
      const config = {
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        rpcUrl: 'https://rpc.moksha.vana.org'
      };

      const clients = createViemClients(config);

      expect(createPublicClient).toHaveBeenCalledWith({
        chain: { id: 14800 },
        transport: expect.any(Function)
      });

      expect(createWalletClient).toHaveBeenCalledWith({
        account: mockAccount,
        chain: { id: 14800 },
        transport: expect.any(Function)
      });

      expect(privateKeyToAccount).toHaveBeenCalledWith(config.privateKey);

      expect(clients).toEqual({
        publicClient: mockPublicClient,
        walletClient: mockWalletClient,
        account: mockAccount
      });
    });
  });

  describe('Contract Deployment Logic', () => {
    test('processes hardhat output correctly', async () => {
      const config = {
        dlpName: 'TestDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      };

      const mockHardhatOutput = `
Token Address: 0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e
DataLiquidityPoolProxy deployed to: 0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A
Vesting Wallet Address: 0x28554ce95758A5824292B664Dd752d2C12a836E6
      `;

      // Mock the actual deployment execution
      const mockExecSync = jest.fn().mockReturnValue(mockHardhatOutput);
      jest.doMock('child_process', () => ({ execSync: mockExecSync }));

      const result = await deployDataDAOContracts(config, '/test/project/path');

      expect(result).toEqual({
        success: true,
        addresses: {
          tokenAddress: '0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e',
          proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A',
          vestingAddress: '0x28554ce95758A5824292B664Dd752d2C12a836E6'
        },
        deploymentData: {
          dlpName: config.dlpName,
          tokenName: config.tokenName,
          tokenSymbol: config.tokenSymbol,
          contracts: {
            tokenAddress: '0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e',
            proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A',
            vestingAddress: '0x28554ce95758A5824292B664Dd752d2C12a836E6'
          }
        }
      });
    });

    test('handles deployment failures gracefully', async () => {
      const config = {
        dlpName: 'TestDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      };

      const mockExecSync = jest.fn().mockImplementation(() => {
        throw new Error('Gas estimation failed');
      });
      jest.doMock('child_process', () => ({ execSync: mockExecSync }));

      const result = await deployDataDAOContracts(config, '/test/project/path');

      expect(result).toEqual({
        success: false,
        error: {
          type: 'DEPLOYMENT_FAILED',
          userFriendlyMessage: 'Smart contract deployment failed',
          recoverySuggestions: expect.arrayContaining(['Check wallet balance']),
          originalError: expect.any(Error),
          details: {
            step: 'contract_deployment',
            command: expect.stringContaining('hardhat deploy'),
            workingDirectory: '/test/project/path'
          }
        }
      });
    });
  });
});