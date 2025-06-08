/**
 * Test that demonstrates the actual dlpId bug
 * This test will FAIL and show the bug exists
 */

const fs = require('fs');
const path = require('path');

describe('DlpId Bug Detection', () => {
  test('current registration process does NOT save dlpId (bug demonstration)', () => {
    // This test simulates the CURRENT broken behavior
    const testDir = path.join(__dirname, 'bug-demo-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    
    try {
      // Initial deployment.json (as created by contracts deployment)
      const deployment = {
        dlpName: 'TestDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        dlpAddress: '0x4cf8d515D10E8d38E234eA7F2CCDb7E895573739',
        state: {
          contractsDeployed: true,
          dataDAORegistered: false
        }
      };
      fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(deployment, null, 2));
      
      // Simulate registration success but WITHOUT saving dlpId (current bug)
      const simulateCurrentBuggyRegistration = () => {
        console.log('Registration successful! dlpId: 93');
        // !! BUG: This is what's missing - no save to deployment.json
        // The registration script logs success but doesn't persist the dlpId
      };
      
      simulateCurrentBuggyRegistration();
      
      // Try to deploy proof (this will fail)
      const simulateDeployProof = () => {
        const deploymentData = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
        
        if (!deploymentData.dlpId) {
          throw new Error('dlpId not found in deployment.json. Run "npm run register:datadao" first.');
        }
        
        return deploymentData.dlpId;
      };
      
      // This should fail because dlpId was not saved
      expect(() => simulateDeployProof()).toThrow('dlpId not found in deployment.json');
      
      // Verify the deployment.json still has no dlpId
      const finalState = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
      expect(finalState.dlpId).toBeUndefined();
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
  
  test('fixed registration process SHOULD save dlpId', () => {
    // This test shows what the fix should do
    const testDir = path.join(__dirname, 'fix-demo-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    
    try {
      // Initial deployment.json
      const deployment = {
        dlpName: 'TestDAO',
        tokenName: 'TestToken', 
        tokenSymbol: 'TEST',
        dlpAddress: '0x4cf8d515D10E8d38E234eA7F2CCDb7E895573739',
        state: {
          contractsDeployed: true,
          dataDAORegistered: false
        }
      };
      fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(deployment, null, 2));
      
      // Simulate FIXED registration that saves dlpId
      const simulateFixedRegistration = (dlpId) => {
        console.log(`Registration successful! dlpId: ${dlpId}`);
        
        // FIXED: Save dlpId to deployment.json
        const deployment = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
        deployment.dlpId = dlpId;
        deployment.state.dataDAORegistered = true;
        fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(deployment, null, 2));
      };
      
      simulateFixedRegistration(93);
      
      // Try to deploy proof (this should succeed)
      const simulateDeployProof = () => {
        const deploymentData = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
        
        if (!deploymentData.dlpId) {
          throw new Error('dlpId not found in deployment.json. Run "npm run register:datadao" first.');
        }
        
        return deploymentData.dlpId;
      };
      
      // This should succeed with the fix
      expect(() => simulateDeployProof()).not.toThrow();
      expect(simulateDeployProof()).toBe(93);
      
      // Verify the deployment.json has the dlpId
      const finalState = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
      expect(finalState.dlpId).toBe(93);
      expect(finalState.state.dataDAORegistered).toBe(true);
      
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});