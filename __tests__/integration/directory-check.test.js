const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TEST_DIR = path.join(__dirname, '../../test-output');

describe('Directory Check Integration', () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });
  
  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });
  
  test('deploy-proof script fails when not in project directory', async () => {
    // Copy deploy-proof script to test directory
    const sourceScript = path.join(__dirname, '../../src/templates/deploy-proof.js');
    const testScript = path.join(TEST_DIR, 'deploy-proof.js');
    await fs.copy(sourceScript, testScript);
    
    // Try to run it from directory without deployment.json
    try {
      await execAsync(`node ${testScript}`, { cwd: TEST_DIR });
      throw new Error('Expected script to fail');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('Must run this command from your DataDAO project directory');
    }
  });
  
  test('deploy-refiner script fails when not in project directory', async () => {
    const sourceScript = path.join(__dirname, '../../src/templates/deploy-refiner.js');
    const testScript = path.join(TEST_DIR, 'deploy-refiner.js');
    await fs.copy(sourceScript, testScript);
    
    try {
      await execAsync(`node ${testScript}`, { cwd: TEST_DIR });
      throw new Error('Expected script to fail');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('Must run this command from your DataDAO project directory');
    }
  });
  
  test('deploy-ui script fails when not in project directory', async () => {
    const sourceScript = path.join(__dirname, '../../src/templates/deploy-ui.js');
    const testScript = path.join(TEST_DIR, 'deploy-ui.js');
    await fs.copy(sourceScript, testScript);
    
    try {
      await execAsync(`node ${testScript}`, { cwd: TEST_DIR });
      throw new Error('Expected script to fail');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('Must run this command from your DataDAO project directory');
    }
  });
  
  test('scripts succeed when deployment.json exists', async () => {
    // Create a mock deployment.json
    const deploymentJson = {
      dlpName: 'TestDAO',
      address: '0x1234567890123456789012345678901234567890'
    };
    await fs.writeJson(path.join(TEST_DIR, 'deployment.json'), deploymentJson);
    
    // Test deploy-proof (it will fail at later steps but not at directory check)
    const sourceScript = path.join(__dirname, '../../src/templates/deploy-proof.js');
    const testScript = path.join(TEST_DIR, 'deploy-proof.js');
    await fs.copy(sourceScript, testScript);
    
    try {
      await execAsync(`timeout 2s node ${testScript}`, { cwd: TEST_DIR });
    } catch (error) {
      // Should not fail with directory error
      expect(error.stdout || error.stderr).not.toContain('Must run this command from your DataDAO project directory');
    }
  });
});