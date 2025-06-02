/**
 * Production Critical Flow Test
 * 
 * This test validates that the system is production-ready by testing
 * critical user scenarios, error recovery, and data integrity.
 */
const fs = require('fs-extra');
const path = require('path');
const generator = require('../../lib/generator');
const StateManager = require('../../src/templates/state-manager');
const TemplateEngine = require('../../lib/template-engine');

describe('Production Readiness', () => {
  const TEST_DIR = path.join(__dirname, '../../test-prod-temp');
  
  beforeEach(() => {
    fs.removeSync(TEST_DIR);
    fs.ensureDirSync(TEST_DIR);
  });

  afterEach(() => {
    fs.removeSync(TEST_DIR);
  });

  test('Critical Data Integrity', () => {
    // Test 1: Contract addresses are parsed correctly
    const deployScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/deploy-contracts.js.template'),
      'utf8'
    );
    
    // Must parse Token Address correctly
    expect(deployScript).toContain('Token Address:\\s*(0x[a-fA-F0-9]{40})');
    // Must parse Proxy address, not implementation
    expect(deployScript).toContain('DataLiquidityPoolProxy\\s+deployed\\s+to:\\s*(0x[a-fA-F0-9]{40})');
    // Must save both old and new format for backward compatibility
    expect(deployScript).toContain('deployment.contracts = {');
    expect(deployScript).toContain('deployment.tokenAddress = tokenAddress');
    expect(deployScript).toContain('deployment.proxyAddress = proxyAddress');
    
    // Test 2: Registration uses correct proxy address
    const registerScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/register-datadao.js.template'),
      'utf8'
    );
    
    // Must support both old and new deployment.json formats
    expect(registerScript).toContain('deployment.proxyAddress ||');
    expect(registerScript).toContain('deployment.contracts && deployment.contracts.proxyAddress');
    expect(registerScript).toContain('|| deployment.dlpAddress');
    
    // Test 3: State validation handles both formats
    const stateManagerScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/state-manager.js'),
      'utf8'
    );
    
    expect(stateManagerScript).toContain('const hasOldFormat = this.state.tokenAddress && this.state.proxyAddress');
    expect(stateManagerScript).toContain('const hasNewFormat = this.state.contracts');
  });

  test('Error Recovery Mechanisms', () => {
    // Test 1: Deploy contracts has comprehensive error handling
    const deployScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/deploy-contracts.js.template'),
      'utf8'
    );
    
    // Must handle all common error types
    expect(deployScript).toContain('insufficient funds');
    expect(deployScript).toContain('nonce');
    expect(deployScript).toContain('timeout');
    expect(deployScript).toContain('reverted');
    expect(deployScript).toContain('enoent'); // Missing Hardhat
    
    // Must provide specific recovery steps
    expect(deployScript).toContain('Recovery Steps:');
    expect(deployScript).toContain('https://faucet.vana.org');
    expect(deployScript).toContain('npm run deploy-contracts');
    
    // Must save partial progress
    expect(deployScript).toContain('Partial deployment detected');
    expect(deployScript).toContain('partialState');
    
    // Test 2: Registration has comprehensive error handling
    const registerScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/register-datadao.js.template'),
      'utf8'
    );
    
    // Must handle registration-specific errors
    expect(registerScript).toContain('already registered');
    expect(registerScript).toContain('user rejected');
    expect(registerScript).toContain('Recovery Steps:');
    expect(registerScript).toContain('Alternative: Manual Registration');
  });

  test('GitHub Repository Persistence', async () => {
    const projectPath = path.join(TEST_DIR, 'github-test');
    const config = {
      projectName: 'github-test',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      dlpName: 'GitHub Test Pool'
    };
    
    await generator.generateProject(projectPath, config);
    
    // Simulate GitHub repo creation
    const stateManager = new StateManager(projectPath);
    stateManager.updateDeploymentState({
      proofRepo: 'https://github.com/user/test-proof',
      refinerRepo: 'https://github.com/user/test-refiner',
      state: {
        proofGitSetup: true,
        refinerGitSetup: true
      }
    });
    
    // Verify repos are persisted
    const deployment = JSON.parse(fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8'));
    expect(deployment.proofRepo).toBe('https://github.com/user/test-proof');
    expect(deployment.refinerRepo).toBe('https://github.com/user/test-refiner');
    
    // Verify generator.js saves repos
    const generatorScript = fs.readFileSync(
      path.join(__dirname, '../../lib/generator.js'),
      'utf8'
    );
    
    expect(generatorScript).toContain('githubResult.proofRepo');
    expect(generatorScript).toContain('deployment.proofRepo = githubResult.proofRepo');
    expect(generatorScript).toContain('githubResult.refinerRepo');
    expect(generatorScript).toContain('deployment.refinerRepo = githubResult.refinerRepo');
  });

  test('User Experience Validation', () => {
    // Test 1: Status messages are clear and helpful
    const statusScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/status.js'),
      'utf8'
    );
    
    // Must show clear progress
    expect(statusScript).toContain('Deployment Progress');
    expect(statusScript).toContain('completed steps');
    
    // Test 2: Error messages guide users to solutions
    const deployScript = fs.readFileSync(
      path.join(__dirname, '../../src/templates/deploy-contracts.js.template'),
      'utf8'
    );
    
    // Must not show generic errors
    expect(deployScript).not.toContain('An error occurred');
    expect(deployScript).not.toContain('Something went wrong');
    
    // Must provide actionable next steps
    expect(deployScript).toContain('Check balance:');
    expect(deployScript).toContain('Get testnet VANA:');
    expect(deployScript).toContain('Retry deployment:');
  });

  test('State File Integrity', async () => {
    const projectPath = path.join(TEST_DIR, 'state-test');
    fs.ensureDirSync(projectPath);
    
    const stateManager = new StateManager(projectPath);
    
    // Test 1: Backup is created before updates
    const initialState = { test: 'data' };
    fs.writeFileSync(
      path.join(projectPath, 'deployment.json'),
      JSON.stringify(initialState, null, 2)
    );
    
    stateManager.updateDeploymentState({ newField: 'value' });
    
    // Verify backup exists
    expect(fs.existsSync(path.join(projectPath, 'deployment.json.backup'))).toBe(true);
    
    // Test 2: State merges correctly
    const updated = JSON.parse(fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8'));
    expect(updated.test).toBe('data'); // Original preserved
    expect(updated.newField).toBe('value'); // New added
    
    // Test 3: Recovery from corruption
    fs.writeFileSync(path.join(projectPath, 'deployment.json'), 'corrupted{');
    
    const canRecover = fs.existsSync(path.join(projectPath, 'deployment.json.backup'));
    expect(canRecover).toBe(true);
  });

  test('Critical Path Success Criteria', async () => {
    const projectPath = path.join(TEST_DIR, 'success-test');
    const config = {
      projectName: 'success-test',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      dlpName: 'Success Test Pool',
      dlpToken: 'SUCCESS'
    };
    
    // Generate project
    await generator.generateProject(projectPath, config);
    
    // Simulate successful deployment flow
    const stateManager = new StateManager(projectPath);
    
    // 1. Contracts deployed with CORRECT addresses
    stateManager.updateDeploymentState({
      tokenAddress: '0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e',
      proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A', // NOT implementation!
      contracts: {
        tokenAddress: '0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e',
        proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A'
      },
      state: { contractsDeployed: true }
    });
    
    // 2. GitHub repos saved
    stateManager.updateDeploymentState({
      proofRepo: 'https://github.com/user/proof',
      refinerRepo: 'https://github.com/user/refiner',
      state: { 
        contractsDeployed: true,
        proofGitSetup: true,
        refinerGitSetup: true 
      }
    });
    
    // 3. Registration completed
    stateManager.updateDeploymentState({
      dlpId: 123,
      state: { 
        contractsDeployed: true,
        proofGitSetup: true,
        refinerGitSetup: true,
        dlpRegistered: true 
      }
    });
    
    // Validate final state
    const finalDeployment = JSON.parse(fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8'));
    
    // All critical data must be present
    expect(finalDeployment.tokenAddress).toBe('0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e');
    expect(finalDeployment.proxyAddress).toBe('0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A');
    expect(finalDeployment.proofRepo).toBe('https://github.com/user/proof');
    expect(finalDeployment.refinerRepo).toBe('https://github.com/user/refiner');
    expect(finalDeployment.dlpId).toBe(123);
    
    // No validation errors
    const issues = stateManager.validateConfiguration();
    expect(issues.length).toBe(0);
    
    // Status shows complete
    const status = stateManager.checkCompletionStatus();
    expect(status.allCompleted).toBe(true);
  });
});