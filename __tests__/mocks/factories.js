/**
 * Mock factories for creating test data
 */

const path = require('path');

/**
 * Create mock configuration object
 */
function createMockConfig(overrides = {}) {
  return {
    projectName: 'test-dao',
    dlpName: 'TestDAO',
    tokenName: 'TestToken',
    tokenSymbol: 'TEST',
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
    githubUsername: 'test-user',
    pinataApiKey: 'test-pinata-key',
    pinataApiSecret: 'test-pinata-secret',
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    network: 'moksha',
    rpcUrl: 'https://rpc.moksha.vana.org',
    chainId: 14800,
    proofRepo: 'https://github.com/test-user/test-proof',
    refinerRepo: 'https://github.com/test-user/test-refiner',
    ...overrides
  };
}

/**
 * Create mock deployment state
 */
function createMockDeployment(overrides = {}) {
  const config = createMockConfig();
  return {
    dlpName: config.dlpName,
    tokenName: config.tokenName,
    tokenSymbol: config.tokenSymbol,
    privateKey: config.privateKey,
    address: config.address,
    publicKey: config.publicKey,
    githubUsername: config.githubUsername,
    pinataApiKey: config.pinataApiKey,
    pinataApiSecret: config.pinataApiSecret,
    googleClientId: config.googleClientId,
    googleClientSecret: config.googleClientSecret,
    proofRepo: config.proofRepo,
    refinerRepo: config.refinerRepo,
    network: config.network,
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    state: {
      contractsDeployed: false,
      dataDAORegistered: false,
      proofConfigured: false,
      proofPublished: false,
      refinerConfigured: false,
      refinerPublished: false,
      uiConfigured: false,
      proofGitSetup: false,
      refinerGitSetup: false,
      ...overrides.state
    },
    tokenAddress: null,
    proxyAddress: null,
    dlpId: null,
    errors: {},
    ...overrides
  };
}

/**
 * Create mock wallet
 */
function createMockWallet(overrides = {}) {
  return {
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
    ...overrides
  };
}

/**
 * Create mock viem account
 */
function createMockViemAccount(overrides = {}) {
  return {
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
    ...overrides
  };
}

/**
 * Create mock blockchain client
 */
function createMockBlockchainClient(overrides = {}) {
  return {
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH
    readContract: jest.fn(),
    writeContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
    getTransactionReceipt: jest.fn(),
    simulateContract: jest.fn(),
    ...overrides
  };
}

/**
 * Create mock file system responses
 */
function createMockFs() {
  const mockFiles = new Map();
  
  return {
    existsSync: jest.fn((filePath) => mockFiles.has(filePath)),
    readFileSync: jest.fn((filePath, encoding) => {
      const content = mockFiles.get(filePath);
      if (!content) throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      return encoding === 'utf8' ? content : Buffer.from(content);
    }),
    writeFileSync: jest.fn((filePath, content) => {
      mockFiles.set(filePath, content.toString());
    }),
    readJson: jest.fn((filePath) => {
      const content = mockFiles.get(filePath);
      if (!content) throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      return JSON.parse(content);
    }),
    writeJson: jest.fn((filePath, data) => {
      mockFiles.set(filePath, JSON.stringify(data, null, 2));
    }),
    ensureDir: jest.fn().mockResolvedValue(),
    ensureDirSync: jest.fn(),
    copy: jest.fn().mockResolvedValue(),
    copyFileSync: jest.fn(),
    remove: jest.fn().mockResolvedValue(),
    removeSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn().mockReturnValue([]),
    statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
    
    // Helper methods for testing
    __setMockFile: (filePath, content) => mockFiles.set(filePath, content),
    __getMockFile: (filePath) => mockFiles.get(filePath),
    __clearMockFiles: () => mockFiles.clear(),
    __getAllMockFiles: () => Array.from(mockFiles.keys())
  };
}

/**
 * Create mock inquirer responses
 */
function createMockInquirer(responses = {}) {
  return {
    prompt: jest.fn().mockImplementation((questions) => {
      const answers = {};
      for (const question of Array.isArray(questions) ? questions : [questions]) {
        const response = responses[question.name] || question.default || '';
        answers[question.name] = response;
      }
      return Promise.resolve(answers);
    })
  };
}

/**
 * Create mock child_process
 */
function createMockChildProcess(outputs = {}) {
  return {
    execSync: jest.fn().mockImplementation((command) => {
      if (outputs[command]) {
        return outputs[command];
      }
      return 'Mock command output';
    }),
    exec: jest.fn().mockImplementation((command, options, callback) => {
      const output = outputs[command] || 'Mock command output';
      if (callback) {
        callback(null, output, '');
      }
      return { stdout: output, stderr: '' };
    })
  };
}

/**
 * Create mock template variables
 */
function createMockTemplateVars(overrides = {}) {
  return {
    projectName: 'test-dao',
    dlpName: 'TestDAO',
    tokenName: 'TestToken',
    tokenSymbol: 'TEST',
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
    address: '0x1234567890123456789012345678901234567890',
    publicKey: '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
    network: 'moksha',
    rpcUrl: 'https://rpc.moksha.vana.org',
    chainId: 14800,
    ...overrides
  };
}

module.exports = {
  createMockConfig,
  createMockDeployment,
  createMockWallet,
  createMockViemAccount,
  createMockBlockchainClient,
  createMockFs,
  createMockInquirer,
  createMockChildProcess,
  createMockTemplateVars
};