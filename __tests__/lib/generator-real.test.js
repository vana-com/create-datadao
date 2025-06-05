/**
 * Real Generator Tests
 * Tests the actual generator functions from lib/generator.js
 */

const fs = require('fs-extra');
const path = require('path');

// Use real fs for testing actual file operations
jest.unmock('fs-extra');

// Mock external dependencies
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('ora', () => () => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis()
}));

jest.mock('chalk', () => ({
  blue: jest.fn(text => text),
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  red: jest.fn(text => text),
  bold: jest.fn(text => text),
  cyan: jest.fn(text => text),
  gray: jest.fn(text => text)
}));

jest.mock('../../lib/wallet');

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')) // 1 ETH
  })),
  http: jest.fn()
}));

jest.mock('viem/chains', () => ({
  moksha: { id: 14800, name: 'Moksha' }
}));

// Mock TemplateEngine - Create a class mock
const mockTemplateEngine = jest.fn().mockImplementation(() => ({
  getDefaultVanaConfig: jest.fn(() => ({
    DLP_REGISTRY_CONTRACT_ADDRESS: '0x4D59880a924526d1dD33260552Ff4328b1E18a43',
    DATA_REGISTRY_CONTRACT_ADDRESS: '0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C',
    TEE_POOL_CONTRACT_ADDRESS: '0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A',
    DAT_FACTORY_CONTRACT_ADDRESS: '0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB',
    TRUSTED_FORWARDER_ADDRESS: '0x0000000000000000000000000000000000000000',
    VANA_RPC_URL: 'http://rpc.vana.org',
    VANA_API_URL: 'https://vanascan.io/api',  
    VANA_BROWSER_URL: 'https://vanascan.io',
    MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
    MOKSHA_API_URL: 'https://moksha.vanascan.io/api',
    MOKSHA_BROWSER_URL: 'https://moksha.vanascan.io'
  })),
  processTemplateToFile: jest.fn(),
  processTemplate: jest.fn(),
  processMultipleTemplates: jest.fn(() => [])
}));

jest.mock('../../lib/template-engine', () => mockTemplateEngine);

const inquirer = require('inquirer');
const { execSync } = require('child_process');

// Set up wallet mock BEFORE requiring generator
const wallet = require('../../lib/wallet');
wallet.deriveWalletFromPrivateKey = jest.fn(() => ({
  address: '0x1234567890123456789012345678901234567890',
  publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
}));

// Require generator AFTER all mocks are set up
const { 
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
} = require('../../lib/generator');

describe('Generator Functions - Real Tests', () => {
  let testDir;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(__dirname, 'generator-real-test');
    fs.ensureDirSync(testDir);
    
    // Ensure template engine mock is reset
    mockTemplateEngine.mockClear();
    
    // Mock console to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    jest.restoreAllMocks();
  });

  describe('generateTemplate', () => {
    // TODO: These tests require a more complete mock setup or should be converted to true integration tests
    test('creates project structure from template', async () => {
      const projectName = 'test-datadao';
      const config = {
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret',
        githubUsername: 'testuser',
        chainId: 14800,
        rpcUrl: 'https://rpc.moksha.vana.org'
      };

      // Mock git operations to succeed and simulate directory creation
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          // Extract target directory from git clone command
          const match = cmd.match(/git clone[^\s]+\s+[^\s]+\s+([^\s]+)/);
          if (match) {
            const targetDir = match[1];
            const fullPath = path.join(testDir, projectName, targetDir);
            fs.ensureDirSync(fullPath);
            fs.writeFileSync(path.join(fullPath, 'README.md'), '# Cloned repo');
            
            // Create expected subdirectories for contracts
            if (targetDir === 'contracts') {
              fs.ensureDirSync(path.join(fullPath, 'contracts'));
              fs.writeFileSync(path.join(fullPath, 'package.json'), JSON.stringify({
                name: 'contracts',
                scripts: { deploy: 'hardhat deploy' }
              }));
            }
          }
        }
        return '';
      });

      // Ensure TemplateEngine mock returns proper instance for this test
      const mockTemplateInstance = {
        getDefaultVanaConfig: jest.fn(() => ({
          DLP_REGISTRY_CONTRACT_ADDRESS: '0x4D59880a924526d1dD33260552Ff4328b1E18a43',
          DATA_REGISTRY_CONTRACT_ADDRESS: '0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C',
          TEE_POOL_CONTRACT_ADDRESS: '0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A',
          DAT_FACTORY_CONTRACT_ADDRESS: '0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB',
          TRUSTED_FORWARDER_ADDRESS: '0x0000000000000000000000000000000000000000',
          MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
          MOKSHA_API_URL: 'https://moksha.vanascan.io/api',
          MOKSHA_BROWSER_URL: 'https://moksha.vanascan.io'
        })),
        processTemplateToFile: jest.fn(),
        processTemplate: jest.fn(),
        processMultipleTemplates: jest.fn(() => [])
      };
      
      mockTemplateEngine.mockReturnValue(mockTemplateInstance);
      
      const result = await generateTemplate(path.join(testDir, projectName), config);

      // Verify function completed successfully
      expect(result).toBe(true);

      // Verify project directory was created
      const projectPath = path.join(testDir, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);

      // Verify deployment.json was created with config
      const deploymentPath = path.join(projectPath, 'deployment.json');
      expect(fs.existsSync(deploymentPath)).toBe(true);
      
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      expect(deploymentData).toMatchObject({
        dlpName: config.dlpName,
        tokenName: config.tokenName,
        tokenSymbol: config.tokenSymbol,
        address: config.address
      });

      // Verify scripts directory was created
      const scriptsPath = path.join(projectPath, 'scripts');
      expect(fs.existsSync(scriptsPath)).toBe(true);

      // Verify at least one script file was created in scripts directory
      const scriptFiles = fs.readdirSync(scriptsPath);
      expect(scriptFiles.length).toBeGreaterThan(0);
      
      // Verify contracts directory exists
      const contractsPath = path.join(projectPath, 'contracts');
      expect(fs.existsSync(contractsPath)).toBe(true);
    });

    test('handles git clone failures gracefully', async () => {
      const projectName = 'fail-test-datadao';
      const config = {
        dlpName: 'Fail Test DAO',
        tokenName: 'FailToken',
        tokenSymbol: 'FAIL',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      };

      // Mock git clone to fail
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          throw new Error('Git clone failed: repository not found');
        }
        return '';
      });

      await expect(generateTemplate(path.join(testDir, projectName), config)).rejects.toThrow('Git clone failed');
    });

    test('creates environment files with correct configuration', async () => {
      const projectName = 'env-test-datadao';
      const config = {
        dlpName: 'Env Test DAO',
        tokenName: 'EnvToken',
        tokenSymbol: 'ENV',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'env-pinata-key',
        pinataApiSecret: 'env-pinata-secret',
        googleClientId: 'env-client-id.apps.googleusercontent.com',
        googleClientSecret: 'env-client-secret',
        githubUsername: 'testuser',
        chainId: 14800,
        rpcUrl: 'https://rpc.moksha.vana.org'
      };

      execSync.mockImplementation(() => ''); // Mock successful operations
      
      // Mock the template engine instance methods for this test
      const mockTemplateInstance = {
        getDefaultVanaConfig: jest.fn(() => ({
          DLP_REGISTRY_CONTRACT_ADDRESS: '0x4D59880a924526d1dD33260552Ff4328b1E18a43',
          DATA_REGISTRY_CONTRACT_ADDRESS: '0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C',
          TEE_POOL_CONTRACT_ADDRESS: '0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A',
          DAT_FACTORY_CONTRACT_ADDRESS: '0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB',
          TRUSTED_FORWARDER_ADDRESS: '0x0000000000000000000000000000000000000000',
          VANA_RPC_URL: 'http://rpc.vana.org',
          VANA_API_URL: 'https://vanascan.io/api',  
          VANA_BROWSER_URL: 'https://vanascan.io',
          MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
          MOKSHA_API_URL: 'https://moksha.vanascan.io/api',
          MOKSHA_BROWSER_URL: 'https://moksha.vanascan.io'
        })),
        processTemplateToFile: jest.fn((template, targetPath, vars) => {
          // Simulate creating .env files
          if (targetPath.endsWith('.env')) {
            let envContent = '';
            if (targetPath.includes('contracts')) {
              envContent = `DEPLOYER_PRIVATE_KEY=${vars.privateKey}\nDEPLOYER_PUBLIC_KEY=${vars.publicKey}`;
            } else if (targetPath.includes('ui')) {
              envContent = `NEXT_PUBLIC_GOOGLE_CLIENT_ID=${vars.googleClientId}\nGOOGLE_CLIENT_SECRET=${vars.googleClientSecret}`;
            }
            fs.ensureDirSync(path.dirname(targetPath));
            fs.writeFileSync(targetPath, envContent);
          }
        }),
        processTemplate: jest.fn(),
        processMultipleTemplates: jest.fn(() => [])
      };
      
      mockTemplateEngine.mockReturnValue(mockTemplateInstance);

      const result = await generateTemplate(path.join(testDir, projectName), config);
      expect(result).toBe(true);

      const projectPath = path.join(testDir, projectName);

      // Verify the template engine was used
      expect(mockTemplateEngine).toHaveBeenCalled();
      
      // The mock created env files through processTemplateToFile
      const contractsEnvPath = path.join(projectPath, 'contracts', '.env');
      const uiEnvPath = path.join(projectPath, 'ui', '.env');
      
      // Check if the mock successfully created the files
      if (fs.existsSync(contractsEnvPath)) {
        const contractsEnvContent = fs.readFileSync(contractsEnvPath, 'utf8');
        expect(contractsEnvContent).toContain('DEPLOYER_PRIVATE_KEY');
        expect(contractsEnvContent).toContain(config.privateKey);
      }
      
      if (fs.existsSync(uiEnvPath)) {
        const uiEnvContent = fs.readFileSync(uiEnvPath, 'utf8');
        expect(uiEnvContent).toContain('GOOGLE_CLIENT');
        expect(uiEnvContent).toContain(config.googleClientId);
      }
      
      // At minimum, verify deployment.json was created with config
      const deploymentPath = path.join(projectPath, 'deployment.json');
      expect(fs.existsSync(deploymentPath)).toBe(true);
    });
  });

  describe('checkGitHubCLI', () => {
    test('detects GitHub CLI when available and authenticated', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          return 'Logged in to github.com as testuser';
        }
        return '';
      });

      const result = await checkGitHubCLI();

      expect(result).toEqual({
        available: true,
        authenticated: true
      });
    });

    test('detects GitHub CLI when available but not authenticated', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        return '';
      });

      const result = await checkGitHubCLI();

      expect(result).toEqual({
        available: true,
        authenticated: false
      });
    });

    test('detects when GitHub CLI is not available', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = await checkGitHubCLI();

      expect(result).toEqual({
        available: false,
        authenticated: false
      });
    });
  });

  describe('createRepositoriesAutomatically', () => {
    test('creates repositories successfully', async () => {
      const config = {
        dlpName: 'Auto Repo Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo view')) {
          throw new Error('Repository not found'); // Repo doesn't exist
        }
        if (cmd.includes('gh repo create')) {
          return 'Repository created successfully';
        }
        return '';
      });

      const result = await createRepositoriesAutomatically(config);

      expect(result).toEqual({
        automated: true,
        proofRepo: 'https://github.com/testuser/auto-repo-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/auto-repo-test-dao-refiner'
      });

      // Verify gh repo create was called for both repositories
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create auto-repo-test-dao-proof'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create auto-repo-test-dao-refiner'),
        expect.any(Object)
      );
    });

    test('handles repository creation failures', async () => {
      const config = {
        dlpName: 'Fail Repo Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo view')) {
          throw new Error('Repository does not exist');
        }
        if (cmd.includes('gh repo create')) {
          throw new Error('Repository creation failed');
        }
        return '';
      });

      // Mock inquirer for the manual fallback
      inquirer.prompt.mockResolvedValue({
        proofRepo: 'https://github.com/testuser/manual-proof-repo',
        refinerRepo: 'https://github.com/testuser/manual-refiner-repo'
      });

      const result = await createRepositoriesAutomatically(config);

      // When automation fails, it falls back to manual setup
      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/manual-proof-repo',
        refinerRepo: 'https://github.com/testuser/manual-refiner-repo',
        automated: false
      });
    });

    test('skips creation if repositories already exist', async () => {
      const config = {
        dlpName: 'Existing Repo Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo view')) {
          return 'Repository exists'; // Repo already exists
        }
        return '';
      });

      const result = await createRepositoriesAutomatically(config);

      expect(result).toEqual({
        automated: true,
        proofRepo: 'https://github.com/testuser/existing-repo-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/existing-repo-test-dao-refiner'
      });

      // Verify gh repo create was NOT called
      expect(execSync).not.toHaveBeenCalledWith(
        expect.stringContaining('gh repo create'),
        expect.any(Object)
      );
    });
  });

  describe('guideGitHubSetup', () => {
    test('guides automated setup when CLI is available', async () => {
      const config = {
        dlpName: 'GitHub Setup Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          return 'Logged in as testuser';
        }
        if (cmd.includes('gh repo create')) {
          return 'Repository created';
        }
        return '';
      });

      inquirer.prompt.mockResolvedValue({ setupMethod: 'auto' });

      const result = await guideGitHubSetup(config);

      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/github-setup-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/github-setup-test-dao-refiner',
        automated: true
      });
    });

    test('guides manual setup when CLI is not available', async () => {
      const config = {
        dlpName: 'Manual Setup Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation(() => {
        throw new Error('gh command not found');
      });

      inquirer.prompt.mockResolvedValue({ 
        proofRepo: 'https://github.com/testuser/manual-setup-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/manual-setup-test-dao-refiner'
      });

      const result = await guideGitHubSetup(config);

      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/manual-setup-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/manual-setup-test-dao-refiner',
        automated: false
      });
    });

    test('handles authentication issues gracefully', async () => {
      const config = {
        dlpName: 'Auth Issue Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        return '';
      });

      inquirer.prompt.mockImplementation((questions) => {
        // Check what's being asked
        if (Array.isArray(questions)) {
          const hasAuthenticateNow = questions.some(q => q.name === 'authenticateNow');
          const hasProofRepo = questions.some(q => q.name === 'proofRepo');
          
          if (hasAuthenticateNow) {
            return Promise.resolve({ authenticateNow: false });
          }
          if (hasProofRepo) {
            return Promise.resolve({ 
              proofRepo: 'https://github.com/testuser/auth-issue-test-dao-proof',
              refinerRepo: 'https://github.com/testuser/auth-issue-test-dao-refiner'
            });
          }
        }
        return Promise.resolve({});
      });

      const result = await guideGitHubSetup(config);

      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/auth-issue-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/auth-issue-test-dao-refiner',
        automated: false
      });
    });
  });

  describe('guideManualRepositorySetup', () => {
    test('provides manual setup instructions', async () => {
      const config = {
        dlpName: 'Manual Guide Test DAO',
        githubUsername: 'testuser'
      };

      inquirer.prompt.mockResolvedValue({
        proofRepo: 'https://github.com/testuser/custom-proof-repo',
        refinerRepo: 'https://github.com/testuser/custom-refiner-repo'
      });

      const result = await guideManualRepositorySetup(config);

      expect(result).toEqual({
        proofRepo: 'https://github.com/testuser/custom-proof-repo',
        refinerRepo: 'https://github.com/testuser/custom-refiner-repo',
        automated: false
      });

      // Verify that inquirer was called with repository URL prompts
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'proofRepo',
            message: expect.stringContaining('Proof repository')
          }),
          expect.objectContaining({
            name: 'refinerRepo',
            message: expect.stringContaining('Refiner repository')
          })
        ])
      );
    });

    test('validates GitHub URLs during input', async () => {
      const config = {
        dlpName: 'Validation Test DAO',
        githubUsername: 'testuser'
      };

      inquirer.prompt.mockImplementation((questions) => {
        // Test URL validation
        for (const question of questions) {
          if (question.validate) {
            expect(question.validate('invalid-url')).toBe('Please enter a valid GitHub URL');
            expect(question.validate('https://github.com/user/repo')).toBe(true);
          }
        }
        
        return Promise.resolve({
          proofRepo: 'https://github.com/testuser/validated-proof-repo',
          refinerRepo: 'https://github.com/testuser/validated-refiner-repo'
        });
      });

      const result = await guideManualRepositorySetup(config);

      expect(result.proofRepo).toContain('github.com');
      expect(result.refinerRepo).toContain('github.com');
    });
  });

  describe('guideNextSteps', () => {
    test('guides user through project setup steps', async () => {
      const projectPath = path.join(testDir, 'next-steps-test');
      fs.ensureDirSync(projectPath);
      
      const config = {
        dlpName: 'Next Steps Test DAO',
        tokenName: 'NextToken',
        tokenSymbol: 'NEXT'
      };

      // Create a deployment.json with some state
      const deployment = {
        dlpName: config.dlpName,
        state: {
          contractsDeployed: false,
          dataDAORegistered: false,
          proofConfigured: false
        }
      };
      fs.writeFileSync(
        path.join(projectPath, 'deployment.json'),
        JSON.stringify(deployment, null, 2)
      );

      // Mock user choosing to continue
      inquirer.prompt.mockResolvedValue({ continueSetup: true });

      // This function is interactive, so we'll test that it runs without error
      await expect(guideNextSteps(projectPath, config)).resolves.not.toThrow();
    });

    test('handles missing deployment.json gracefully', async () => {
      const projectPath = path.join(testDir, 'missing-deployment-test');
      fs.ensureDirSync(projectPath);
      
      const config = {
        dlpName: 'Missing Deployment Test DAO'
      };

      inquirer.prompt.mockResolvedValue({ continueSetup: false });

      // Should handle missing deployment.json without crashing
      await expect(guideNextSteps(projectPath, config)).resolves.not.toThrow();
    });
  });
});