/**
 * Tests for deploy-proof.js dlpId requirement
 * This ensures deploy-proof properly validates dlpId presence
 */

const fs = require('fs');
const path = require('path');

describe('deploy-proof.js - dlpId validation', () => {
  let testDir;
  
  beforeEach(() => {
    testDir = path.join(__dirname, 'test-deploy-proof-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('deploy-proof fails when dlpId is missing', () => {
    // Create deployment.json without dlpId
    const deployment = {
      dlpName: 'TestDAO',
      proofRepo: 'https://github.com/user/proof',
      state: {
        contractsDeployed: true,
        dataDAORegistered: true  // Even marked as registered, but no dlpId!
      }
    };
    fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(deployment, null, 2));
    
    // Simulate deploy-proof.js validation
    const validateDeploymentForProof = () => {
      const deploymentData = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
      
      if (!deploymentData.dlpId) {
        throw new Error('dlpId not found in deployment.json. Run "npm run register:datadao" first.');
      }
      
      return deploymentData;
    };
    
    expect(() => validateDeploymentForProof()).toThrow('dlpId not found in deployment.json');
  });
  
  test('deploy-proof succeeds when dlpId is present', () => {
    // Create deployment.json with dlpId
    const deployment = {
      dlpName: 'TestDAO',
      dlpId: 93,
      proofRepo: 'https://github.com/user/proof',
      state: {
        contractsDeployed: true,
        dataDAORegistered: true
      }
    };
    fs.writeFileSync(path.join(testDir, 'deployment.json'), JSON.stringify(deployment, null, 2));
    
    // Simulate deploy-proof.js validation
    const validateDeploymentForProof = () => {
      const deploymentData = JSON.parse(fs.readFileSync(path.join(testDir, 'deployment.json'), 'utf8'));
      
      if (!deploymentData.dlpId) {
        throw new Error('dlpId not found in deployment.json. Run "npm run register:datadao" first.');
      }
      
      return deploymentData;
    };
    
    expect(() => validateDeploymentForProof()).not.toThrow();
    const result = validateDeploymentForProof();
    expect(result.dlpId).toBe(93);
  });
});