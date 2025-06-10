/**
 * Tests for src/templates/state-manager.js
 * Focus on dlpId persistence bug
 */

const fs = require('fs-extra');
const path = require('path');

// We'll test the actual state manager from the templates
const DeploymentStateManager = require('../../../lib/templates/state-manager');

describe('StateManager - dlpId Persistence', () => {
  let testDir;
  let stateManager;
  let originalCwd;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = path.join(__dirname, 'test-state-' + Date.now());
    fs.ensureDirSync(testDir);
    
    // Create initial deployment.json in test directory
    const initialDeployment = {
      dlpName: 'TestDAO',
      tokenName: 'TestToken',
      tokenSymbol: 'TEST',
      state: {
        contractsDeployed: true,
        dataDAORegistered: false
      }
    };
    fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(initialDeployment, null, 2));
    
    // Change to test directory
    process.chdir(testDir);
    
    stateManager = new DeploymentStateManager();
  });
  
  afterEach(() => {
    // Change back to original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('State persistence after registration', () => {
    test('saves dlpId to deployment.json after registration', () => {
      // Initial state
      expect(stateManager.state.dlpId).toBeUndefined();
      
      // Simulate registration success
      const dlpId = 93;
      stateManager.state.dlpId = dlpId;
      stateManager.state.state.dataDAORegistered = true;
      stateManager.saveState();
      
      // Verify dlpId was saved
      expect(stateManager.state.dlpId).toBe(93);
      expect(stateManager.state.state.dataDAORegistered).toBe(true);
      
      // Verify it persists to file
      const fileContent = JSON.parse(fs.readFileSync('deployment.json', 'utf8'));
      expect(fileContent.dlpId).toBe(93);
    });
    
    test('dlpId persists across StateManager instances', () => {
      // Save dlpId with first instance
      stateManager.state.dlpId = 42;
      stateManager.saveState();
      
      // Create new instance and verify dlpId is loaded
      const newStateManager = new DeploymentStateManager();
      expect(newStateManager.state.dlpId).toBe(42);
    });
    
    test('handles missing dlpId gracefully', () => {
      expect(stateManager.state.dlpId).toBeUndefined();
      expect(() => stateManager.state).not.toThrow();
    });
  });
});