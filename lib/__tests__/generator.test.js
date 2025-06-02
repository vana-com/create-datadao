const {
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
} = require('../generator');

const { createMockConfig, createMockWallet } = require('../../__tests__/mocks/factories');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('ora');
jest.mock('inquirer');
jest.mock('chalk');
jest.mock('../wallet');
jest.mock('viem');
jest.mock('viem/chains');
jest.mock('../template-engine');

const fs = require('fs-extra');
const { execSync } = require('child_process');
const ora = require('ora');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { deriveWalletFromPrivateKey } = require('../wallet');
const TemplateEngine = require('../template-engine');
const path = require('path');

describe('Generator Functions', () => {
  let mockSpinner;
  let mockTemplateEngine;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ora spinner
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      text: '',
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis()
    };
    ora.mockReturnValue(mockSpinner);

    // Mock chalk
    Object.assign(chalk, {
      blue: jest.fn(text => `[blue]${text}[/blue]`),
      green: jest.fn(text => `[green]${text}[/green]`),
      yellow: jest.fn(text => `[yellow]${text}[/yellow]`),
      red: jest.fn(text => `[red]${text}[/red]`),
      cyan: jest.fn(text => `[cyan]${text}[/cyan]`),
      gray: jest.fn(text => `[gray]${text}[/gray]`)
    });

    // Mock TemplateEngine
    mockTemplateEngine = {
      getDefaultVanaConfig: jest.fn(() => ({
        DLP_REGISTRY_CONTRACT_ADDRESS: '0x1234567890123456789012345678901234567890',
        DATA_REGISTRY_CONTRACT_ADDRESS: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org'
      })),
      processMultipleTemplates: jest.fn(() => [
        { success: true, template: 'env/contracts.env.template' },
        { success: true, template: 'env/refiner.env.template' },
        { success: true, template: 'env/ui.env.template' }
      ]),
      processTemplateToFile: jest.fn()
    };
    TemplateEngine.mockImplementation(() => mockTemplateEngine);

    // Mock fs-extra
    fs.ensureDirSync.mockImplementation(() => {});
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockReturnValue('{}');
    fs.copyFileSync.mockImplementation(() => {});
    fs.removeSync.mockImplementation(() => {});

    // Mock deriveWalletFromPrivateKey
    deriveWalletFromPrivateKey.mockReturnValue(createMockWallet());

    // Mock execSync
    execSync.mockImplementation(() => {});
  });

  describe('generateTemplate', () => {
    test('generates complete DataDAO project successfully', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      const result = await generateTemplate(targetDir, config);

      expect(result).toBe(true);
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('DataDAO project generated successfully');
      expect(fs.ensureDirSync).toHaveBeenCalledWith(targetDir);
    });

    test('derives wallet credentials when missing from config', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();
      delete config.address;
      delete config.publicKey;

      await generateTemplate(targetDir, config);

      expect(deriveWalletFromPrivateKey).toHaveBeenCalledWith(config.privateKey);
      expect(mockSpinner.text).toBe('Deriving wallet credentials...');
    });

    test('skips wallet derivation when credentials already present', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig({
        address: '0x1234567890123456789012345678901234567890',
        publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
      });

      await generateTemplate(targetDir, config);

      expect(deriveWalletFromPrivateKey).not.toHaveBeenCalled();
    });

    test('handles dependency installation errors gracefully', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      // Mock execSync to throw error for npm install
      execSync.mockImplementationOnce(() => {
        throw new Error('npm install failed');
      });

      const result = await generateTemplate(targetDir, config);

      expect(result).toBe(true);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Failed to install some dependencies'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('npm install'));
    });

    test('updates spinner text during different phases', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      await generateTemplate(targetDir, config);

      expect(mockSpinner.text).toHaveBeenLastCalledWith('Deployment scripts generated');
    });

    test('handles project generation errors', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      fs.ensureDirSync.mockImplementationOnce(() => {
        throw new Error('Directory creation failed');
      });

      await expect(generateTemplate(targetDir, config)).rejects.toThrow('Directory creation failed');
      expect(mockSpinner.fail).toHaveBeenCalledWith('Error generating DataDAO project');
    });

    test('installs dependencies in correct order', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      await generateTemplate(targetDir, config);

      const execCalls = execSync.mock.calls;
      expect(execCalls[0]).toEqual(['npm install', { cwd: targetDir, stdio: 'pipe' }]);
      expect(execCalls[1]).toEqual(['npm install', { cwd: path.join(targetDir, 'contracts'), stdio: 'pipe' }]);
      expect(execCalls[2]).toEqual(['npm install', { cwd: path.join(targetDir, 'ui'), stdio: 'pipe' }]);
    });

    test('creates deployment.json with correct structure', async () => {
      const targetDir = '/test/project';
      const config = createMockConfig();

      await generateTemplate(targetDir, config);

      const writeCall = fs.writeFileSync.mock.calls.find(call => 
        call[0].endsWith('deployment.json')
      );
      
      expect(writeCall).toBeTruthy();
      const deploymentData = JSON.parse(writeCall[1]);
      
      expect(deploymentData).toHaveProperty('dlpName', config.dlpName);
      expect(deploymentData).toHaveProperty('state');
      expect(deploymentData.state).toHaveProperty('contractsDeployed', false);
      expect(deploymentData.state).toHaveProperty('dataDAORegistered', false);
    });
  });

  describe('guideNextSteps', () => {
    beforeEach(() => {
      // Mock deployment.json content
      const mockDeployment = {
        dlpName: 'TestDAO',
        state: {
          contractsDeployed: true,
          dataDAORegistered: false,
          proofGitSetup: false,
          refinerGitSetup: false,
          proofConfigured: false,
          refinerConfigured: false,
          uiConfigured: false
        }
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockDeployment));
    });

    test('guides through complete setup process', async () => {
      inquirer.prompt.mockImplementation(({ name }) => {
        const responses = {
          proceedWithGitHub: false,
          registerDataDAO: false,
          configureProof: false,
          configureRefiner: false,
          configureUI: false,
          showUIInstructions: false
        };
        return Promise.resolve({ [name]: responses[name] });
      });

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Let\'s complete your DataDAO setup'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Step 1: Set up GitHub repositories'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Step 2: Register DataDAO'));
    });

    test('skips GitHub setup when already completed', async () => {
      const mockDeployment = {
        state: {
          contractsDeployed: true,
          proofGitSetup: true,
          refinerGitSetup: true,
          dataDAORegistered: false
        }
      };
      
      fs.readFileSync.mockReturnValue(JSON.stringify(mockDeployment));

      inquirer.prompt.mockResolvedValue({ registerDataDAO: false });

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Step 1: GitHub repositories already set up'));
    });

    test('executes registration when user confirms', async () => {
      inquirer.prompt.mockImplementation(({ name }) => {
        if (name === 'registerDataDAO') return Promise.resolve({ registerDataDAO: true });
        return Promise.resolve({ [name]: false });
      });

      await guideNextSteps('/test/project', createMockConfig());

      expect(execSync).toHaveBeenCalledWith('npm run register:datadao', { 
        stdio: 'inherit', 
        cwd: '/test/project' 
      });
    });

    test('handles registration errors gracefully', async () => {
      inquirer.prompt.mockImplementation(({ name }) => {
        if (name === 'registerDataDAO') return Promise.resolve({ registerDataDAO: true });
        return Promise.resolve({ [name]: false });
      });

      execSync.mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DataDAO registration failed'));
    });

    test('shows completion status correctly', async () => {
      const completeDeployment = {
        state: {
          contractsDeployed: true,
          dataDAORegistered: true,
          proofGitSetup: true,
          refinerGitSetup: true,
          proofConfigured: true,
          refinerConfigured: true,
          uiConfigured: true
        }
      };
      
      fs.readFileSync.mockReturnValue(JSON.stringify(completeDeployment));

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Your DataDAO is fully configured and ready!'));
    });

    test('validates prerequisites for proof configuration', async () => {
      const mockDeployment = {
        state: {
          contractsDeployed: true,
          proofGitSetup: false,
          dataDAORegistered: false
        }
      };
      
      fs.readFileSync.mockReturnValue(JSON.stringify(mockDeployment));

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub setup required first'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DataDAO registration required first'));
    });

    test('provides UI testing instructions', async () => {
      inquirer.prompt.mockImplementation(({ name }) => {
        if (name === 'showUIInstructions') return Promise.resolve({ showUIInstructions: true });
        if (name === 'openUILater') return Promise.resolve({ openUILater: true });
        return Promise.resolve({ [name]: false });
      });

      await guideNextSteps('/test/project', createMockConfig());

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('UI Testing Instructions'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('npm run ui:dev'));
    });
  });

  describe('checkGitHubCLI', () => {
    test('detects available and authenticated GitHub CLI', async () => {
      execSync
        .mockReturnValueOnce('gh version 2.0.0') // gh --version
        .mockReturnValueOnce('Logged in to github.com as testuser'); // gh auth status

      const result = await checkGitHubCLI();

      expect(result).toEqual({ available: true, authenticated: true });
      expect(execSync).toHaveBeenCalledWith('gh --version', { stdio: 'pipe' });
      expect(execSync).toHaveBeenCalledWith('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
    });

    test('detects available but not authenticated GitHub CLI', async () => {
      execSync
        .mockReturnValueOnce('gh version 2.0.0') // gh --version
        .mockImplementationOnce(() => {
          throw new Error('not authenticated');
        }); // gh auth status

      const result = await checkGitHubCLI();

      expect(result).toEqual({ available: true, authenticated: false });
    });

    test('detects unavailable GitHub CLI', async () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('command not found');
      });

      const result = await checkGitHubCLI();

      expect(result).toEqual({ available: false, authenticated: false });
    });

    test('handles auth status with "not logged in" message', async () => {
      execSync
        .mockReturnValueOnce('gh version 2.0.0')
        .mockReturnValueOnce('You are not logged in to any GitHub hosts');

      const result = await checkGitHubCLI();

      expect(result).toEqual({ available: true, authenticated: false });
    });

    test('handles auth status with "not authenticated" message', async () => {
      execSync
        .mockReturnValueOnce('gh version 2.0.0')
        .mockReturnValueOnce('You are not authenticated to GitHub');

      const result = await checkGitHubCLI();

      expect(result).toEqual({ available: true, authenticated: false });
    });
  });

  describe('createRepositoriesAutomatically', () => {
    test('creates repositories successfully', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      // Mock GitHub CLI commands
      execSync
        .mockImplementationOnce(() => {
          throw new Error('Repository not found'); // gh repo view (repo doesn't exist)
        })
        .mockReturnValueOnce('') // gh repo create
        .mockReturnValueOnce('') // gh api (enable actions)
        .mockImplementationOnce(() => {
          throw new Error('Repository not found'); // gh repo view (second repo doesn't exist)
        })
        .mockReturnValueOnce('') // gh repo create
        .mockReturnValueOnce(''); // gh api (enable actions)

      const result = await createRepositoriesAutomatically(config);

      expect(result.automated).toBe(true);
      expect(result.proofRepo).toBe('https://github.com/testuser/test-dao-proof');
      expect(result.refinerRepo).toBe('https://github.com/testuser/test-dao-refiner');
    });

    test('skips existing repositories', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      // Mock GitHub CLI to show repositories already exist
      execSync.mockReturnValue('Repository exists');

      const result = await createRepositoriesAutomatically(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already exists, skipping'));
      expect(result.automated).toBe(true);
    });

    test('handles repository creation errors', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      execSync
        .mockImplementationOnce(() => {
          throw new Error('Repository not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('API rate limit exceeded');
        });

      const result = await createRepositoriesAutomatically(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub API rate limit reached'));
    });

    test('throws error for missing required configuration', async () => {
      const config = createMockConfig();
      delete config.dlpName;

      await expect(createRepositoriesAutomatically(config)).rejects.toThrow(
        'Missing required configuration for repository creation'
      );
    });

    test('handles authentication errors', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      execSync
        .mockImplementationOnce(() => {
          throw new Error('Repository not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('authentication required');
        });

      await createRepositoriesAutomatically(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('authentication issue'));
    });

    test('enables GitHub Actions for created repositories', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      execSync
        .mockImplementationOnce(() => {
          throw new Error('Repository not found');
        })
        .mockReturnValueOnce('')
        .mockReturnValueOnce('') // This should be the GitHub Actions enable call
        .mockImplementationOnce(() => {
          throw new Error('Repository not found');
        })
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      await createRepositoriesAutomatically(config);

      const actionsCalls = execSync.mock.calls.filter(call => 
        call[0].includes('actions/permissions')
      );
      
      expect(actionsCalls).toHaveLength(2); // One for each repository
    });
  });

  describe('guideManualRepositorySetup', () => {
    test('provides manual setup instructions', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      inquirer.prompt.mockResolvedValue({
        proofRepo: 'https://github.com/testuser/test-dao-proof',
        refinerRepo: 'https://github.com/testuser/test-dao-refiner'
      });

      const result = await guideManualRepositorySetup(config);

      expect(result.automated).toBe(false);
      expect(result.proofRepo).toBe('https://github.com/testuser/test-dao-proof');
      expect(result.refinerRepo).toBe('https://github.com/testuser/test-dao-refiner');
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Manual Repository Setup'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('vana-satya-proof-template-py'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('vana-data-refinement-template'));
    });

    test('validates GitHub URLs', async () => {
      const config = createMockConfig({
        dlpName: 'Test DAO',
        githubUsername: 'testuser'
      });

      inquirer.prompt.mockImplementation((questions) => {
        const question = Array.isArray(questions) ? questions[0] : questions;
        if (question.validate) {
          expect(question.validate('invalid-url')).toBe('Please enter a valid GitHub URL');
          expect(question.validate('https://github.com/user/repo')).toBe(true);
        }
        return Promise.resolve({
          [question.name]: 'https://github.com/testuser/valid-repo'
        });
      });

      await guideManualRepositorySetup(config);
    });

    test('throws error for missing required configuration', async () => {
      const config = createMockConfig();
      delete config.githubUsername;

      await expect(guideManualRepositorySetup(config)).rejects.toThrow(
        'Missing required configuration for repository setup'
      );
    });

    test('provides default repository names', async () => {
      const config = createMockConfig({
        dlpName: 'My Data DAO',
        githubUsername: 'testuser'
      });

      inquirer.prompt.mockImplementation((questions) => {
        const proofQuestion = Array.isArray(questions) ? questions[0] : questions;
        expect(proofQuestion.default).toBe('https://github.com/testuser/my-data-dao-proof');
        
        return Promise.resolve({
          proofRepo: proofQuestion.default,
          refinerRepo: 'https://github.com/testuser/my-data-dao-refiner'
        });
      });

      await guideManualRepositorySetup(config);
    });
  });

  describe('guideGitHubSetup', () => {
    test('uses automated setup when GitHub CLI is available and authenticated', async () => {
      const config = createMockConfig();

      // Mock checkGitHubCLI to return available and authenticated
      const originalCheckGitHubCLI = require('../generator').checkGitHubCLI;
      require('../generator').checkGitHubCLI = jest.fn().mockResolvedValue({
        available: true,
        authenticated: true
      });

      inquirer.prompt.mockResolvedValue({ setupMethod: 'auto' });

      // Mock createRepositoriesAutomatically
      const originalCreateRepos = require('../generator').createRepositoriesAutomatically;
      require('../generator').createRepositoriesAutomatically = jest.fn().mockResolvedValue({
        proofRepo: 'https://github.com/test/repo1',
        refinerRepo: 'https://github.com/test/repo2',
        automated: true
      });

      await guideGitHubSetup(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI detected and authenticated'));
      
      // Restore original functions
      require('../generator').checkGitHubCLI = originalCheckGitHubCLI;
      require('../generator').createRepositoriesAutomatically = originalCreateRepos;
    });

    test('offers authentication when GitHub CLI is available but not authenticated', async () => {
      const config = createMockConfig();

      const originalCheckGitHubCLI = require('../generator').checkGitHubCLI;
      require('../generator').checkGitHubCLI = jest.fn()
        .mockResolvedValueOnce({ available: true, authenticated: false })
        .mockResolvedValueOnce({ available: true, authenticated: true });

      inquirer.prompt.mockResolvedValue({ authenticateNow: true, useAutomationAfterAuth: false });
      
      execSync.mockReturnValueOnce(''); // gh auth login

      await guideGitHubSetup(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI detected but not authenticated'));
      expect(execSync).toHaveBeenCalledWith('gh auth login', { stdio: 'inherit' });
      
      require('../generator').checkGitHubCLI = originalCheckGitHubCLI;
    });

    test('provides installation instructions when GitHub CLI is not available', async () => {
      const config = createMockConfig();

      const originalCheckGitHubCLI = require('../generator').checkGitHubCLI;
      require('../generator').checkGitHubCLI = jest.fn().mockResolvedValue({
        available: false,
        authenticated: false
      });

      inquirer.prompt.mockResolvedValue({ installChoice: 'install', installCompleted: false });

      await guideGitHubSetup(config);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI not detected'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('https://cli.github.com/'));
      
      require('../generator').checkGitHubCLI = originalCheckGitHubCLI;
    });

    test('falls back to manual setup', async () => {
      const config = createMockConfig();

      const originalCheckGitHubCLI = require('../generator').checkGitHubCLI;
      require('../generator').checkGitHubCLI = jest.fn().mockResolvedValue({
        available: false,
        authenticated: false
      });

      const originalGuideManual = require('../generator').guideManualRepositorySetup;
      require('../generator').guideManualRepositorySetup = jest.fn().mockResolvedValue({
        proofRepo: 'manual-repo',
        refinerRepo: 'manual-refiner',
        automated: false
      });

      inquirer.prompt.mockResolvedValue({ installChoice: 'manual' });

      const result = await guideGitHubSetup(config);

      expect(result.automated).toBe(false);
      
      require('../generator').checkGitHubCLI = originalCheckGitHubCLI;
      require('../generator').guideManualRepositorySetup = originalGuideManual;
    });
  });

  describe('integration scenarios', () => {
    test('complete project generation workflow', async () => {
      const targetDir = '/test/complete-project';
      const config = createMockConfig();

      // Mock all the sub-functions to succeed
      fs.existsSync.mockReturnValue(false); // Template files exist
      
      const result = await generateTemplate(targetDir, config);

      expect(result).toBe(true);
      expect(fs.ensureDirSync).toHaveBeenCalledWith(targetDir);
      expect(mockTemplateEngine.processMultipleTemplates).toHaveBeenCalled();
      expect(mockTemplateEngine.processTemplateToFile).toHaveBeenCalled();
      expect(execSync).toHaveBeenCalledWith('npm install', expect.objectContaining({ cwd: targetDir }));
    });

    test('error recovery in project generation', async () => {
      const targetDir = '/test/error-project';
      const config = createMockConfig();

      // Simulate template processing failure
      mockTemplateEngine.processMultipleTemplates.mockReturnValue([
        { success: false, template: 'env/contracts.env.template', error: 'Template not found' }
      ]);

      const result = await generateTemplate(targetDir, config);

      expect(result).toBe(true); // Should still succeed
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to generate'));
    });

    test('GitHub setup with retry logic', async () => {
      const config = createMockConfig();

      const originalCheckGitHubCLI = require('../generator').checkGitHubCLI;
      require('../generator').checkGitHubCLI = jest.fn()
        .mockResolvedValueOnce({ available: true, authenticated: false })
        .mockResolvedValueOnce({ available: true, authenticated: false });

      inquirer.prompt.mockImplementation(({ name, choices }) => {
        if (name === 'authenticateNow') return Promise.resolve({ authenticateNow: false });
        if (name === 'nextStep') return Promise.resolve({ nextStep: 'retry' });
        if (name === 'setupMethod') return Promise.resolve({ setupMethod: 'manual' });
        return Promise.resolve({});
      });

      // This should trigger a retry
      await guideGitHubSetup(config);

      expect(require('../generator').checkGitHubCLI).toHaveBeenCalledTimes(2);
      
      require('../generator').checkGitHubCLI = originalCheckGitHubCLI;
    });
  });
});