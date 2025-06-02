/**
 * Jest test setup - configure mocks and global test environment
 */

// Mock console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
global.process.exit = jest.fn();

// Mock fs-extra module
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  ensureDirSync: jest.fn(),
  copy: jest.fn(),
  copyFileSync: jest.fn(),
  remove: jest.fn(),
  removeSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
  execSync: jest.fn(),
  spawn: jest.fn(),
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

// Mock ora (spinner)
jest.mock('ora', () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: '',
  };
  return jest.fn(() => mockSpinner);
});

// Mock open
jest.mock('open', () => jest.fn());

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  parseEther: jest.fn(),
  formatEther: jest.fn(),
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn(),
  generatePrivateKey: jest.fn(),
}));

jest.mock('viem/chains', () => ({
  moksha: {
    id: 14800,
    name: 'Moksha',
    rpcUrls: {
      default: {
        http: ['https://rpc.moksha.vana.org'],
      },
    },
  },
}));

// Setup test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});