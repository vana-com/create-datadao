/**
 * Real Generator Tests
 * Tests the actual generator functions from lib/generator.js
 */

const { 
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
} = require('../../lib/generator');

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

const inquirer = require('inquirer');
const { execSync } = require('child_process');

describe('Generator Functions - Real Tests', () => {
  let testDir;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(__dirname, 'generator-real-test');
    fs.ensureDirSync(testDir);
    
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
    test('creates project structure from template', async () => {
      const projectName = 'test-datadao';
      const config = {
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      };

      // Mock git operations to succeed
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          // Simulate successful clone by creating directories
          const repoMatch = cmd.match(/git clone\s+(\S+)\s+(.+)/);
          if (repoMatch) {
            const targetDir = repoMatch[2].trim();
            fs.ensureDirSync(path.resolve(targetDir));
            fs.writeFileSync(path.join(path.resolve(targetDir), 'README.md'), '# Cloned repo');
          }
        }
        return '';
      });

      const result = await generateTemplate(projectName, config, testDir);

      // Verify function completed successfully
      expect(result).toEqual({
        success: true,
        projectPath: path.join(testDir, projectName),
        message: 'DataDAO project generated successfully'
      });

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

      // Verify package.json was created
      const packagePath = path.join(projectPath, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(packageData.name).toBe(projectName);
      expect(packageData.scripts).toHaveProperty('deploy:contracts');
      expect(packageData.scripts).toHaveProperty('register:datadao');
    });

    test('handles git clone failures gracefully', async () => {
      const projectName = 'fail-test-datadao';
      const config = {
        dlpName: 'Fail Test DAO',
        tokenName: 'FailToken',
        tokenSymbol: 'FAIL'
      };

      // Mock git clone to fail
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          throw new Error('Git clone failed: repository not found');
        }
        return '';
      });

      const result = await generateTemplate(projectName, config, testDir);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Git clone failed'),
        projectPath: path.join(testDir, projectName)
      });
    });

    test('creates environment files with correct configuration', async () => {
      const projectName = 'env-test-datadao';
      const config = {
        dlpName: 'Env Test DAO',
        tokenName: 'EnvToken',
        tokenSymbol: 'ENV',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'env-pinata-key',
        pinataApiSecret: 'env-pinata-secret',
        googleClientId: 'env-client-id.apps.googleusercontent.com',
        googleClientSecret: 'env-client-secret'
      };

      execSync.mockImplementation(() => ''); // Mock successful operations

      await generateTemplate(projectName, config, testDir);

      const projectPath = path.join(testDir, projectName);

      // Check contracts .env file
      const contractsEnvPath = path.join(projectPath, 'contracts', '.env');
      expect(fs.existsSync(contractsEnvPath)).toBe(true);
      
      const contractsEnvContent = fs.readFileSync(contractsEnvPath, 'utf8');
      expect(contractsEnvContent).toContain(`DEPLOYER_PRIVATE_KEY=${config.privateKey.replace('0x', '')}`);
      expect(contractsEnvContent).toContain('DLP_REGISTRY_CONTRACT_ADDRESS=');
      expect(contractsEnvContent).toContain('MOKSHA_RPC_URL=');

      // Check UI .env file
      const uiEnvPath = path.join(projectPath, 'ui', '.env.local');
      expect(fs.existsSync(uiEnvPath)).toBe(true);
      
      const uiEnvContent = fs.readFileSync(uiEnvPath, 'utf8');
      expect(uiEnvContent).toContain(`GOOGLE_CLIENT_ID=${config.googleClientId}`);
      expect(uiEnvContent).toContain(`GOOGLE_CLIENT_SECRET=${config.googleClientSecret}`);
      expect(uiEnvContent).toContain('NEXTAUTH_SECRET=');
    });
  });

  describe('checkGitHubCLI', () => {
    test('detects GitHub CLI when available and authenticated', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          return 'Logged in to github.com as testuser';
        }
        return '';
      });

      const result = checkGitHubCLI();

      expect(result).toEqual({
        available: true,
        authenticated: true,
        version: 'gh version 2.0.0'
      });
    });

    test('detects GitHub CLI when available but not authenticated', () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          throw new Error('Not authenticated');
        }
        return '';
      });

      const result = checkGitHubCLI();

      expect(result).toEqual({
        available: true,
        authenticated: false,
        version: 'gh version 2.0.0'
      });
    });

    test('detects when GitHub CLI is not available', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = checkGitHubCLI();

      expect(result).toEqual({
        available: false,
        authenticated: false,
        version: null
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
        success: true,
        proofRepo: 'https://github.com/testuser/auto-repo-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/auto-repo-test-dao-refiner'
      });

      // Verify gh repo create was called for both repositories
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create testuser/auto-repo-test-dao-proof'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create testuser/auto-repo-test-dao-refiner'),
        expect.any(Object)
      );
    });

    test('handles repository creation failures', async () => {
      const config = {
        dlpName: 'Fail Repo Test DAO',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo create')) {
          throw new Error('Repository creation failed');
        }
        return '';
      });

      const result = await createRepositoriesAutomatically(config);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Repository creation failed')
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
        success: true,
        proofRepo: 'https://github.com/testuser/existing-repo-test-dao-proof',
        refinerRepo: 'https://github.com/testuser/existing-repo-test-dao-refiner',
        message: 'Repositories already exist'
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

      inquirer.prompt.mockResolvedValue({ setupMethod: 'manual' });

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

      inquirer.prompt
        .mockResolvedValueOnce({ setupMethod: 'auto' })
        .mockResolvedValueOnce({ useAutomationAfterAuth: false });

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