// Mock dependencies
jest.mock('fs-extra');
jest.mock('chalk', () => ({
  green: (text) => `[green]${text}[/green]`,
  yellow: (text) => `[yellow]${text}[/yellow]`,
  red: (text) => `[red]${text}[/red]`,
  blue: (text) => `[blue]${text}[/blue]`,
  gray: (text) => `[gray]${text}[/gray]`
}));
jest.mock('inquirer');

// Import after mocks are set up
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

describe('DeploymentStateManager', () => {
  let stateManager;
  let mockDeploymentData;
  
  // Require after mocks are setup
  const DeploymentStateManager = require('../state-manager');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log
    global.console.log = jest.fn();

    mockDeploymentData = {
      dlpName: 'TestDAO',
      tokenName: 'TestToken',
      tokenSymbol: 'TEST',
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      address: '0x1234567890123456789012345678901234567890',
      publicKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      pinataApiKey: 'test-key',
      pinataApiSecret: 'test-secret',
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret',
      githubUsername: 'test-user',
      tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      proxyAddress: '0x9876543210987654321098765432109876543210',
      state: {
        contractsDeployed: true,
        dataDAORegistered: false,
        proofConfigured: false,
        proofGitSetup: true,
        proofPublished: false,
        refinerConfigured: false,
        refinerGitSetup: true,
        refinerPublished: false,
        uiConfigured: false
      },
      errors: {}
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockDeploymentData));
    fs.writeFileSync.mockImplementation(() => {});
    fs.copyFileSync.mockImplementation(() => {});

    stateManager = new DeploymentStateManager('/test/project');
  });

  describe('constructor', () => {
    test('initializes with correct deployment path', () => {
      const customPath = '/custom/project';
      const manager = new DeploymentStateManager(customPath);
      
      expect(manager.deploymentPath).toBe(path.join(customPath, 'deployment.json'));
    });

    test('uses current working directory by default', () => {
      const manager = new DeploymentStateManager();
      
      expect(manager.deploymentPath).toBe(path.join(process.cwd(), 'deployment.json'));
    });

    test('loads state on initialization', () => {
      expect(stateManager.state).toEqual(mockDeploymentData);
      expect(fs.readFileSync).toHaveBeenCalledWith(stateManager.deploymentPath, 'utf8');
    });
  });

  describe('loadState', () => {
    test('throws error when deployment.json not found', () => {
      fs.existsSync.mockReturnValue(false);
      
      expect(() => new DeploymentStateManager('/test/project')).toThrow(
        'deployment.json not found. Run deployment steps in order.'
      );
    });

    test('initializes state when missing from deployment data', () => {
      const dataWithoutState = { dlpName: 'TestDAO' };
      fs.readFileSync.mockReturnValue(JSON.stringify(dataWithoutState));

      const manager = new DeploymentStateManager('/test/project');

      expect(manager.state.state).toBeDefined();
      expect(manager.state.state.contractsDeployed).toBe(false);
      expect(manager.state.state.dataDAORegistered).toBe(false);
    });

    test('initializes state based on existing deployment data', () => {
      const dataWithAddresses = {
        dlpName: 'TestDAO',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        proxyAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        dlpId: 123
      };
      fs.readFileSync.mockReturnValue(JSON.stringify(dataWithAddresses));

      const manager = new DeploymentStateManager('/test/project');

      expect(manager.state.state.contractsDeployed).toBe(true);
      expect(manager.state.state.dataDAORegistered).toBe(true);
    });

    test('initializes errors object when missing', () => {
      const dataWithoutErrors = { dlpName: 'TestDAO', state: {} };
      fs.readFileSync.mockReturnValue(JSON.stringify(dataWithoutErrors));

      const manager = new DeploymentStateManager('/test/project');

      expect(manager.state.errors).toEqual({});
    });
  });

  describe('saveState', () => {
    test('creates backup before saving', () => {
      const newState = { ...mockDeploymentData, dlpName: 'UpdatedDAO' };
      
      stateManager.saveState(newState);

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        stateManager.deploymentPath,
        stateManager.deploymentPath + '.backup'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        stateManager.deploymentPath,
        JSON.stringify(newState, null, 2)
      );
    });

    test('saves current state when no parameter provided', () => {
      stateManager.state.dlpName = 'ModifiedDAO';
      
      stateManager.saveState();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        stateManager.deploymentPath,
        expect.stringContaining('ModifiedDAO')
      );
    });

    test('handles missing deployment file gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      
      stateManager.saveState();

      expect(fs.copyFileSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('updates internal state when saving without parameter', () => {
      const originalState = stateManager.state;
      stateManager.state.dlpName = 'NewName';
      
      stateManager.saveState();

      expect(stateManager.state.dlpName).toBe('NewName');
    });
  });

  describe('recordError', () => {
    test('records error with timestamp and stack trace', () => {
      const error = new Error('Test error');
      const step = 'contractsDeployed';

      stateManager.recordError(step, error);

      expect(stateManager.state.errors[step]).toBeDefined();
      expect(stateManager.state.errors[step].message).toBe('Test error');
      expect(stateManager.state.errors[step].timestamp).toBeDefined();
      expect(stateManager.state.errors[step].stack).toBe(error.stack);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('overwrites existing error for same step', () => {
      const firstError = new Error('First error');
      const secondError = new Error('Second error');
      const step = 'dataDAORegistered';

      stateManager.recordError(step, firstError);
      stateManager.recordError(step, secondError);

      expect(stateManager.state.errors[step].message).toBe('Second error');
    });
  });

  describe('clearError', () => {
    test('removes error for specified step', () => {
      const error = new Error('Test error');
      stateManager.recordError('proofConfigured', error);
      
      stateManager.clearError('proofConfigured');

      expect(stateManager.state.errors.proofConfigured).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('does nothing when error does not exist', () => {
      const writeCallsBeforeClear = fs.writeFileSync.mock.calls.length;
      
      stateManager.clearError('nonExistentStep');

      expect(fs.writeFileSync.mock.calls.length).toBe(writeCallsBeforeClear);
    });
  });

  describe('getRecoverySuggestions', () => {
    test('returns suggestions for contract deployment errors', () => {
      stateManager.state.errors.contractsDeployed = { message: 'Deploy failed' };

      const suggestions = stateManager.getRecoverySuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].step).toBe('Contract Deployment');
      expect(suggestions[0].solutions).toContain('Check wallet balance (need VANA tokens)');
    });

    test('returns suggestions for DataDAO registration errors', () => {
      stateManager.state.errors.dataDAORegistered = { message: 'Registration failed' };

      const suggestions = stateManager.getRecoverySuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].step).toBe('DataDAO Registration');
      expect(suggestions[0].solutions).toContain('Check you have 1 VANA for registration fee');
    });

    test('returns suggestions for proof configuration errors', () => {
      stateManager.state.errors.proofConfigured = { message: 'Proof setup failed' };

      const suggestions = stateManager.getRecoverySuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].step).toBe('Proof Configuration');
      expect(suggestions[0].solutions).toContain('Ensure GitHub repository is set up');
    });

    test('returns empty array when no errors exist', () => {
      stateManager.state.errors = {};

      const suggestions = stateManager.getRecoverySuggestions();

      expect(suggestions).toHaveLength(0);
    });

    test('returns multiple suggestions for multiple errors', () => {
      stateManager.state.errors.contractsDeployed = { message: 'Deploy failed' };
      stateManager.state.errors.dataDAORegistered = { message: 'Registration failed' };

      const suggestions = stateManager.getRecoverySuggestions();

      expect(suggestions).toHaveLength(2);
    });
  });

  describe('showRecoveryMenu', () => {
    test('shows success message when no errors detected', async () => {
      stateManager.state.errors = {};
      
      await stateManager.showRecoveryMenu();
      
      expect(console.log).toHaveBeenCalledWith('[green]✅ No errors detected. All steps completed successfully![/green]');
    });

    test('displays error suggestions and returns user choice', async () => {
      stateManager.state.errors.contractsDeployed = { message: 'Deploy failed' };
      inquirer.prompt.mockResolvedValue({ action: 'retry' });

      const result = await stateManager.showRecoveryMenu();

      expect(console.log).toHaveBeenCalledWith('[yellow]\n⚠️  Issues detected in your DataDAO setup:[/yellow]');
      expect(console.log).toHaveBeenCalledWith('[red]❌ Contract Deployment: Smart contract deployment failed[/red]');
      expect(result).toBe('retry');
    });

    test('handles all recovery menu options', async () => {
      stateManager.state.errors.contractsDeployed = { message: 'Deploy failed' };
      
      const menuOptions = ['retry', 'config', 'status', 'exit'];
      
      for (const option of menuOptions) {
        inquirer.prompt.mockResolvedValueOnce({ action: option });
        const result = await stateManager.showRecoveryMenu();
        expect(result).toBe(option);
      }
    });
  });

  describe('validateConfiguration', () => {
    test('returns empty array for valid configuration', () => {
      const issues = stateManager.validateConfiguration();

      expect(issues).toHaveLength(0);
    });

    test('identifies missing required fields', () => {
      delete stateManager.state.dlpName;
      delete stateManager.state.privateKey;

      const issues = stateManager.validateConfiguration();

      expect(issues).toContain('Missing dlpName');
      expect(issues).toContain('Missing privateKey');
    });

    test('identifies missing Pinata credentials', () => {
      stateManager.state.pinataApiKey = '';
      stateManager.state.pinataApiSecret = '';

      const issues = stateManager.validateConfiguration();

      expect(issues).toContain('Missing Pinata credentials');
    });

    test('identifies missing Google OAuth credentials', () => {
      stateManager.state.googleClientId = '';
      stateManager.state.googleClientSecret = '';

      const issues = stateManager.validateConfiguration();

      expect(issues).toContain('Missing Google OAuth credentials');
    });

    test('identifies inconsistent deployment state', () => {
      stateManager.state.state.dataDAORegistered = true;
      delete stateManager.state.dlpId;

      const issues = stateManager.validateConfiguration();

      expect(issues).toContain('Marked as registered but missing dlpId');
    });

    test('identifies missing contract addresses for deployed state', () => {
      stateManager.state.state.contractsDeployed = true;
      delete stateManager.state.tokenAddress;
      delete stateManager.state.proxyAddress;

      const issues = stateManager.validateConfiguration();

      expect(issues).toContain('Marked as deployed but missing contract addresses');
    });
  });

  describe('fixConfiguration', () => {
    test('shows success message for valid configuration', async () => {
      await stateManager.fixConfiguration();

      expect(console.log).toHaveBeenCalledWith('[green]✅ Configuration looks good![/green]');
    });

    test('prompts to fix Pinata credentials', async () => {
      stateManager.state.pinataApiKey = '';
      stateManager.state.pinataApiSecret = '';

      inquirer.prompt
        .mockResolvedValueOnce({ shouldFix: true })
        .mockResolvedValueOnce({
          pinataApiKey: 'new-api-key',
          pinataApiSecret: 'new-api-secret'
        });

      await stateManager.fixConfiguration();

      expect(stateManager.state.pinataApiKey).toBe('new-api-key');
      expect(stateManager.state.pinataApiSecret).toBe('new-api-secret');
      expect(console.log).toHaveBeenCalledWith('[green]✅ Pinata credentials updated[/green]');
    });

    test('prompts to fix Google OAuth credentials', async () => {
      stateManager.state.googleClientId = '';
      stateManager.state.googleClientSecret = '';

      inquirer.prompt
        .mockResolvedValueOnce({ shouldFix: true })
        .mockResolvedValueOnce({
          googleClientId: 'new-client-id',
          googleClientSecret: 'new-client-secret'
        });

      await stateManager.fixConfiguration();

      expect(stateManager.state.googleClientId).toBe('new-client-id');
      expect(stateManager.state.googleClientSecret).toBe('new-client-secret');
      expect(console.log).toHaveBeenCalledWith('[green]✅ Google OAuth credentials updated[/green]');
    });

    test('skips fixes when user declines', async () => {
      stateManager.state.pinataApiKey = '';

      inquirer.prompt.mockResolvedValue({ shouldFix: false });

      await stateManager.fixConfiguration();

      expect(stateManager.state.pinataApiKey).toBe('');
    });

    test('validates credential inputs', async () => {
      stateManager.state.pinataApiKey = '';

      inquirer.prompt
        .mockResolvedValueOnce({ shouldFix: true })
        .mockImplementationOnce((questions) => {
          const apiKeyQuestion = Array.isArray(questions) ? questions[0] : questions;
          
          expect(apiKeyQuestion.validate('')).toBe('API Key is required');
          expect(apiKeyQuestion.validate('valid-key')).toBe(true);

          return Promise.resolve({
            pinataApiKey: 'valid-key',
            pinataApiSecret: 'valid-secret'
          });
        });

      await stateManager.fixConfiguration();
    });
  });

  describe('updateState', () => {
    test('updates state fields and saves', () => {
      const updates = { proofConfigured: true, refinerConfigured: true };

      const result = stateManager.updateState(updates);

      expect(stateManager.state.state.proofConfigured).toBe(true);
      expect(stateManager.state.state.refinerConfigured).toBe(true);
      expect(result).toBe(stateManager.state);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('preserves existing state fields', () => {
      const originalValue = stateManager.state.state.contractsDeployed;
      
      stateManager.updateState({ proofConfigured: true });

      expect(stateManager.state.state.contractsDeployed).toBe(originalValue);
    });
  });

  describe('updateDeployment', () => {
    test('updates deployment data and saves', () => {
      const updates = { dlpId: 456, tokenAddress: '0xnewaddress' };

      const result = stateManager.updateDeployment(updates);

      expect(stateManager.state.dlpId).toBe(456);
      expect(stateManager.state.tokenAddress).toBe('0xnewaddress');
      expect(result).toBe(stateManager.state);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    test('returns current state', () => {
      const state = stateManager.getState();

      expect(state).toBe(stateManager.state);
    });
  });

  describe('isCompleted', () => {
    test('returns true for completed steps', () => {
      expect(stateManager.isCompleted('contractsDeployed')).toBe(true);
    });

    test('returns false for incomplete steps', () => {
      expect(stateManager.isCompleted('dataDAORegistered')).toBe(false);
    });

    test('handles undefined steps', () => {
      expect(stateManager.isCompleted('nonExistentStep')).toBe(false);
    });
  });

  describe('markCompleted', () => {
    test('marks step as completed', () => {
      stateManager.markCompleted('dataDAORegistered');

      expect(stateManager.state.state.dataDAORegistered).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('updates deployment data when provided', () => {
      const data = { dlpId: 123, tokenAddress: '0xtest' };

      stateManager.markCompleted('dataDAORegistered', data);

      expect(stateManager.state.state.dataDAORegistered).toBe(true);
      expect(stateManager.state.dlpId).toBe(123);
      expect(stateManager.state.tokenAddress).toBe('0xtest');
    });

    test('handles empty data object', () => {
      stateManager.markCompleted('proofConfigured', {});

      expect(stateManager.state.state.proofConfigured).toBe(true);
    });
  });

  describe('showProgress', () => {
    test('displays progress for all steps', () => {
      stateManager.showProgress();

      expect(console.log).toHaveBeenCalledWith('[blue]\n📋 Deployment Progress:[/blue]');
      expect(console.log).toHaveBeenCalledWith('  [green]✅[/green] Smart Contracts Deployed');
      expect(console.log).toHaveBeenCalledWith('  [gray]⏸️[/gray] DataDAO Registered');
    });

    test('shows correct status for each step', () => {
      // Set some steps as completed
      stateManager.state.state.dataDAORegistered = true;
      stateManager.state.state.proofConfigured = true;

      stateManager.showProgress();

      expect(console.log).toHaveBeenCalledWith('  [green]✅[/green] Smart Contracts Deployed');
      expect(console.log).toHaveBeenCalledWith('  [green]✅[/green] DataDAO Registered');
      expect(console.log).toHaveBeenCalledWith('  [green]✅[/green] Proof of Contribution Configured');
      expect(console.log).toHaveBeenCalledWith('  [gray]⏸️[/gray] Proof of Contribution Published');
    });
  });

  describe('validateRequiredFields', () => {
    test('passes validation when all fields present', () => {
      const requiredFields = ['dlpName', 'tokenName', 'privateKey'];

      expect(() => stateManager.validateRequiredFields(requiredFields)).not.toThrow();
    });

    test('throws error for missing fields', () => {
      const requiredFields = ['dlpName', 'missingField1', 'missingField2'];

      expect(() => stateManager.validateRequiredFields(requiredFields)).toThrow(
        'Missing required fields: missingField1, missingField2'
      );
    });

    test('handles empty required fields array', () => {
      expect(() => stateManager.validateRequiredFields([])).not.toThrow();
    });

    test('handles fields with falsy values', () => {
      stateManager.state.emptyString = '';
      stateManager.state.zeroValue = 0;
      stateManager.state.falseValue = false;

      const requiredFields = ['emptyString', 'zeroValue', 'falseValue'];

      expect(() => stateManager.validateRequiredFields(requiredFields)).toThrow(
        'Missing required fields: emptyString, zeroValue, falseValue'
      );
    });
  });

  describe('integration scenarios', () => {
    test('complete error handling workflow', () => {
      // Record multiple errors
      stateManager.recordError('contractsDeployed', new Error('Deploy failed'));
      stateManager.recordError('dataDAORegistered', new Error('Registration failed'));

      // Get recovery suggestions
      const suggestions = stateManager.getRecoverySuggestions();
      expect(suggestions).toHaveLength(2);

      // Clear one error
      stateManager.clearError('contractsDeployed');

      // Verify only one error remains
      const remainingSuggestions = stateManager.getRecoverySuggestions();
      expect(remainingSuggestions).toHaveLength(1);
      expect(remainingSuggestions[0].step).toBe('DataDAO Registration');
    });

    test('state progression tracking', () => {
      // Initial state
      expect(stateManager.isCompleted('dataDAORegistered')).toBe(false);

      // Mark as completed with data
      stateManager.markCompleted('dataDAORegistered', { dlpId: 456 });

      // Verify completion
      expect(stateManager.isCompleted('dataDAORegistered')).toBe(true);
      expect(stateManager.state.dlpId).toBe(456);
    });

    test('configuration validation and fixing workflow', async () => {
      // Introduce configuration issues
      stateManager.state.pinataApiKey = '';
      stateManager.state.googleClientId = '';

      // Validate and identify issues
      const issues = stateManager.validateConfiguration();
      expect(issues).toContain('Missing Pinata credentials');
      expect(issues).toContain('Missing Google OAuth credentials');

      // Mock the fix process
      inquirer.prompt
        .mockResolvedValueOnce({ shouldFix: true })
        .mockResolvedValueOnce({
          pinataApiKey: 'fixed-key',
          pinataApiSecret: 'fixed-secret'
        })
        .mockResolvedValueOnce({
          googleClientId: 'fixed-client-id',
          googleClientSecret: 'fixed-client-secret'
        });

      await stateManager.fixConfiguration();

      // Verify fixes
      expect(stateManager.state.pinataApiKey).toBe('fixed-key');
      expect(stateManager.state.googleClientId).toBe('fixed-client-id');

      // Verify configuration is now valid
      const finalIssues = stateManager.validateConfiguration();
      expect(finalIssues).toHaveLength(0);
    });
  });
});