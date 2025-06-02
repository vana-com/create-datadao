/**
 * Comprehensive Generator Tests
 * Tests actual project generation logic and file operations
 */

const { 
  generateDataDAO,
  setupProjectStructure,
  guideGitHubSetup,
  generateDeploymentScripts,
  validateProjectSetup
} = require('../../lib/generator');

const fs = require('fs-extra');
const path = require('path');

// Use real fs for testing actual file operations
jest.unmock('fs-extra');

// Mock external dependencies but not our core logic
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const inquirer = require('inquirer');
const { execSync } = require('child_process');

describe('Generator Functions - Real Project Creation Tests', () => {
  let testDir;
  let projectPath;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    testDir = path.join(__dirname, 'generator-test');
    projectPath = path.join(testDir, 'test-datadao');
    
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

  describe('Project Structure Setup', () => {
    test('creates complete project directory structure', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      // Mock git operations
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          // Simulate successful clone by creating directories
          const repoPath = cmd.match(/(\S+\/\S+)\s/)?.[1];
          if (repoPath) {
            const dirName = path.basename(repoPath, '.git');
            const targetDir = path.join(projectPath, dirName);
            fs.ensureDirSync(targetDir);
            fs.writeFileSync(path.join(targetDir, 'README.md'), `# ${dirName}`);
          }
        }
        return '';
      });

      await setupProjectStructure(projectPath, config);

      // Verify main project directory exists
      expect(fs.existsSync(projectPath)).toBe(true);

      // Verify core subdirectories exist
      const expectedDirs = ['contracts', 'proof', 'refiner', 'ui', 'scripts'];
      for (const dir of expectedDirs) {
        const dirPath = path.join(projectPath, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      }

      // Verify deployment.json is created with correct initial state
      const deploymentPath = path.join(projectPath, 'deployment.json');
      expect(fs.existsSync(deploymentPath)).toBe(true);
      
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      expect(deploymentData).toMatchObject({
        dlpName: config.dlpName,
        tokenName: config.tokenName,
        tokenSymbol: config.tokenSymbol,
        address: config.address,
        state: {
          contractsDeployed: false,
          dataDAORegistered: false,
          proofConfigured: false,
          refinerConfigured: false,
          uiConfigured: false
        }
      });

      // Verify package.json is created with correct scripts
      const packagePath = path.join(projectPath, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(packageData.name).toBe('test-datadao');
      expect(packageData.scripts).toMatchObject({
        'deploy:contracts': expect.stringContaining('deploy-contracts.js'),
        'register:datadao': expect.stringContaining('register-datadao.js'),
        'deploy:proof': expect.stringContaining('deploy-proof.js'),
        'deploy:refiner': expect.stringContaining('deploy-refiner.js'),
        'deploy:ui': expect.stringContaining('deploy-ui.js'),
        'status': expect.stringContaining('status.js'),
        'test:all': expect.stringContaining('test-all.js')
      });
    });

    test('handles git clone failures gracefully', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      // Mock git clone to fail
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          throw new Error('git clone failed');
        }
        return '';
      });

      await expect(setupProjectStructure(projectPath, config)).rejects.toThrow('git clone failed');
    });

    test('creates environment files with correct content', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret'
      };

      execSync.mockImplementation(() => ''); // Mock successful operations

      await setupProjectStructure(projectPath, config);

      // Check contracts .env file
      const contractsEnvPath = path.join(projectPath, 'contracts', '.env');
      expect(fs.existsSync(contractsEnvPath)).toBe(true);
      
      const contractsEnvContent = fs.readFileSync(contractsEnvPath, 'utf8');
      expect(contractsEnvContent).toContain(`DEPLOYER_PRIVATE_KEY=${config.privateKey.replace('0x', '')}`);
      expect(contractsEnvContent).toContain('DLP_REGISTRY_CONTRACT_ADDRESS=0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C');
      expect(contractsEnvContent).toContain('MOKSHA_RPC_URL=https://rpc.moksha.vana.org');

      // Check UI .env file
      const uiEnvPath = path.join(projectPath, 'ui', '.env.local');
      expect(fs.existsSync(uiEnvPath)).toBe(true);
      
      const uiEnvContent = fs.readFileSync(uiEnvPath, 'utf8');
      expect(uiEnvContent).toContain(`GOOGLE_CLIENT_ID=${config.googleClientId}`);
      expect(uiEnvContent).toContain(`GOOGLE_CLIENT_SECRET=${config.googleClientSecret}`);
      expect(uiEnvContent).toContain('NEXTAUTH_SECRET=');
      expect(uiEnvContent).toContain('NEXTAUTH_URL=http://localhost:3000');
    });
  });

  describe('GitHub Repository Setup', () => {
    test('guides automated GitHub setup successfully', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        githubUsername: 'testuser'
      };

      // Mock gh CLI availability and operations
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh --version')) {
          return 'gh version 2.0.0';
        }
        if (cmd.includes('gh auth status')) {
          return 'Logged in to github.com as testuser';
        }
        if (cmd.includes('gh repo view')) {
          throw new Error('Not found'); // Repo doesn't exist
        }
        if (cmd.includes('gh repo create')) {
          return 'Repository created successfully';
        }
        return '';
      });

      inquirer.prompt.mockResolvedValueOnce({ setupMethod: 'auto' });

      const result = await guideGitHubSetup(config);

      expect(result).toEqual({
        method: 'automated',
        proofRepo: 'https://github.com/testuser/testdatadao-proof',
        refinerRepo: 'https://github.com/testuser/testdatadao-refiner'
      });

      // Verify gh repo create was called correctly
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create testuser/testdatadao-proof'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('gh repo create testuser/testdatadao-refiner'),
        expect.any(Object)
      );
    });

    test('handles GitHub CLI authentication issues', async () => {
      const config = {
        dlpName: 'TestDataDAO',
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
        method: 'manual',
        proofRepo: 'https://github.com/testuser/testdatadao-proof',
        refinerRepo: 'https://github.com/testuser/testdatadao-refiner'
      });
    });

    test('guides manual GitHub setup', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        githubUsername: 'testuser'
      };

      inquirer.prompt.mockResolvedValueOnce({ setupMethod: 'manual' });

      const result = await guideGitHubSetup(config);

      expect(result).toEqual({
        method: 'manual',
        proofRepo: 'https://github.com/testuser/testdatadao-proof',
        refinerRepo: 'https://github.com/testuser/testdatadao-refiner'
      });
    });

    test('sanitizes repository names correctly', async () => {
      const config = {
        dlpName: 'My Complex DAO Name!',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('gh repo create')) {
          // Verify sanitized names are used
          expect(cmd).toContain('my-complex-dao-name-proof');
          expect(cmd).toContain('my-complex-dao-name-refiner');
          return 'Repository created successfully';
        }
        return '';
      });

      inquirer.prompt.mockResolvedValueOnce({ setupMethod: 'auto' });

      const result = await guideGitHubSetup(config);

      expect(result.proofRepo).toBe('https://github.com/testuser/my-complex-dao-name-proof');
      expect(result.refinerRepo).toBe('https://github.com/testuser/my-complex-dao-name-refiner');
    });
  });

  describe('Deployment Script Generation', () => {
    test('generates all deployment scripts with correct content', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret',
        proofRepo: 'https://github.com/testuser/test-proof',
        refinerRepo: 'https://github.com/testuser/test-refiner',
        dlpId: 42
      };

      await generateDeploymentScripts(projectPath, config);

      const scriptsDir = path.join(projectPath, 'scripts');
      expect(fs.existsSync(scriptsDir)).toBe(true);

      // Check that all scripts are generated
      const expectedScripts = [
        'deploy-contracts.js',
        'register-datadao.js',
        'deploy-proof.js',
        'deploy-refiner.js',
        'deploy-ui.js',
        'status.js',
        'test-all.js',
        'state-manager.js'
      ];

      for (const script of expectedScripts) {
        const scriptPath = path.join(scriptsDir, script);
        expect(fs.existsSync(scriptPath)).toBe(true);

        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        
        // Verify scripts contain config values
        if (script === 'deploy-contracts.js') {
          expect(scriptContent).toContain(config.tokenName);
          expect(scriptContent).toContain(config.tokenSymbol);
        }
        
        if (script === 'register-datadao.js') {
          expect(scriptContent).toContain('deployment.proxyAddress ||');
          expect(scriptContent).toContain('deployment.contracts && deployment.contracts.proxyAddress');
        }
        
        if (script === 'deploy-proof.js') {
          expect(scriptContent).toContain(config.proofRepo);
          expect(scriptContent).toContain(config.pinataApiKey);
        }
        
        if (script === 'deploy-refiner.js') {
          expect(scriptContent).toContain(config.refinerRepo);
        }
        
        if (script === 'deploy-ui.js') {
          expect(scriptContent).toContain(config.googleClientId);
          expect(scriptContent).toContain(config.googleClientSecret);
        }

        // Verify all scripts are valid JavaScript
        expect(() => {
          new Function(scriptContent);
        }).not.toThrow();
      }
    });

    test('includes state management functionality', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      };

      await generateDeploymentScripts(projectPath, config);

      const stateManagerPath = path.join(projectPath, 'scripts', 'state-manager.js');
      expect(fs.existsSync(stateManagerPath)).toBe(true);

      const stateManagerContent = fs.readFileSync(stateManagerPath, 'utf8');
      
      // Verify state management features are present
      expect(stateManagerContent).toContain('class DeploymentStateManager');
      expect(stateManagerContent).toContain('validateConfiguration');
      expect(stateManagerContent).toContain('recordError');
      expect(stateManagerContent).toContain('showRecoveryMenu');
      expect(stateManagerContent).toContain('markCompleted');
    });
  });

  describe('Project Validation', () => {
    test('validates complete project setup', async () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4'
      };

      // Create a complete project structure
      execSync.mockImplementation(() => '');
      await setupProjectStructure(projectPath, config);
      await generateDeploymentScripts(projectPath, config);

      const validation = await validateProjectSetup(projectPath);

      expect(validation).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
        checkedItems: expect.arrayContaining([
          'Project directory exists',
          'deployment.json exists and is valid',
          'package.json exists and is valid',
          'All required scripts exist',
          'Required subdirectories exist'
        ])
      });
    });

    test('identifies missing project components', async () => {
      // Create incomplete project structure
      fs.ensureDirSync(projectPath);
      fs.writeFileSync(path.join(projectPath, 'deployment.json'), '{}');

      const validation = await validateProjectSetup(projectPath);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('package.json'),
        expect.stringContaining('scripts')
      ]));
    });

    test('validates deployment.json structure', async () => {
      fs.ensureDirSync(projectPath);
      
      // Create invalid deployment.json
      fs.writeFileSync(path.join(projectPath, 'deployment.json'), 'invalid json');

      const validation = await validateProjectSetup(projectPath);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('deployment.json is not valid JSON')
      ]));
    });
  });

  describe('Full DataDAO Generation', () => {
    test('creates complete DataDAO project', async () => {
      const config = {
        dlpName: 'Complete Test DAO',
        tokenName: 'CompleteTestToken',
        tokenSymbol: 'CTT',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        pinataApiKey: 'test-pinata-key',
        pinataApiSecret: 'test-pinata-secret',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret',
        githubUsername: 'testuser'
      };

      // Mock all external operations
      execSync.mockImplementation(() => '');
      inquirer.prompt.mockResolvedValue({ setupMethod: 'manual' });

      const result = await generateDataDAO(projectPath, config);

      expect(result).toEqual({
        success: true,
        projectPath,
        config: expect.objectContaining(config),
        github: {
          method: 'manual',
          proofRepo: expect.stringContaining('github.com'),
          refinerRepo: expect.stringContaining('github.com')
        },
        nextSteps: expect.arrayContaining([
          expect.stringContaining('deploy:contracts'),
          expect.stringContaining('register:datadao')
        ])
      });

      // Verify complete project structure
      const validation = await validateProjectSetup(projectPath);
      expect(validation.isValid).toBe(true);

      // Verify deployment.json has all necessary data
      const deploymentPath = path.join(projectPath, 'deployment.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      expect(deploymentData).toMatchObject({
        dlpName: config.dlpName,
        tokenName: config.tokenName,
        tokenSymbol: config.tokenSymbol,
        address: config.address,
        proofRepo: expect.stringContaining('github.com'),
        refinerRepo: expect.stringContaining('github.com')
      });
    });

    test('handles generation failures gracefully', async () => {
      const config = {
        dlpName: 'Test DAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      };

      // Mock git clone to fail
      execSync.mockImplementation(() => {
        throw new Error('Git operation failed');
      });

      const result = await generateDataDAO(projectPath, config);

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          message: expect.stringContaining('Git operation failed'),
          step: 'project_setup'
        })
      });
    });

    test('persists GitHub repository URLs correctly', async () => {
      const config = {
        dlpName: 'GitHub Test DAO',
        tokenName: 'GitHubTestToken',
        tokenSymbol: 'GTT',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        githubUsername: 'testuser'
      };

      execSync.mockImplementation(() => '');
      inquirer.prompt.mockResolvedValue({ setupMethod: 'auto' });

      await generateDataDAO(projectPath, config);

      // Verify GitHub repos are saved to deployment.json
      const deploymentPath = path.join(projectPath, 'deployment.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      expect(deploymentData.proofRepo).toBe('https://github.com/testuser/github-test-dao-proof');
      expect(deploymentData.refinerRepo).toBe('https://github.com/testuser/github-test-dao-refiner');
    });
  });
});