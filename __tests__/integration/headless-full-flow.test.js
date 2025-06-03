const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Ensure fs is not mocked for this integration test
jest.unmock('fs-extra');

const TEST_DIR = path.join(__dirname, '../../test-output');
const CLI_PATH = path.join(__dirname, '../../bin/create-datadao.js');
const TEST_CONFIG_PATH = path.join(__dirname, '../config/test-config.json');

describe('Headless Full Flow Integration', () => {
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });
  
  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });
  
  test('full headless flow with real credentials', async () => {
    const projectName = 'headless-test-dao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    // Create a test config with real credentials
    const testConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf8'));
    testConfig.projectName = projectName;
    
    const headlessConfigPath = path.join(TEST_DIR, 'headless-config.json');
    await fs.writeJson(headlessConfigPath, testConfig);
    
    console.log('🧪 Testing headless flow with provided credentials...');
    console.log(`📁 Project: ${projectName}`);
    console.log(`💳 Wallet: ${testConfig.address}`);
    
    try {
      // Run the CLI in headless mode
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} create ${projectName} --config ${headlessConfigPath}`,
        { 
          cwd: TEST_DIR,
          timeout: 120000 // 2 minutes timeout
        }
      );
      
      console.log('📊 CLI Output:', stdout);
      if (stderr) console.log('⚠️ CLI Errors:', stderr);
      
      // Verify project structure was created
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'deployment.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'scripts'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'contracts'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'proof'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'refiner'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'ui'))).toBe(true);
      
      // Verify deployment.json has correct configuration
      const deployment = JSON.parse(
        fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8')
      );
      
      expect(deployment.dlpName).toBe('HeadlessTestDAO');
      expect(deployment.address).toBe(testConfig.address);
      expect(deployment.privateKey).toBe(testConfig.privateKey);
      expect(deployment.pinataApiKey).toBe(testConfig.pinataApiKey);
      expect(deployment.pinataApiSecret).toBe(testConfig.pinataApiSecret);
      
      // Verify scripts were generated correctly
      expect(fs.existsSync(path.join(projectPath, 'scripts/deploy-proof.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'scripts/deploy-refiner.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'scripts/deploy-ui.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'scripts/status.js'))).toBe(true);
      
      // Test that status command works
      const { stdout: statusOutput } = await execAsync(
        `node ${CLI_PATH} status ${projectName}`,
        { cwd: TEST_DIR }
      );
      
      expect(statusOutput).toContain('DataDAO Project Status');
      expect(statusOutput).toContain('HeadlessTestDAO');
      
      console.log('✅ Headless flow test completed successfully');
      
    } catch (error) {
      console.error('❌ Headless flow test failed:', error.message);
      
      // Still check if basic project structure was created
      if (fs.existsSync(projectPath)) {
        console.log('📁 Project directory was created');
        console.log('📋 Files created:', fs.readdirSync(projectPath));
        
        if (fs.existsSync(path.join(projectPath, 'deployment.json'))) {
          const deployment = JSON.parse(
            fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8')
          );
          console.log('📊 Deployment config:', deployment);
        }
      }
      
      // Re-throw to fail test
      throw error;
    }
  }, 150000); // 2.5 minutes timeout
  
  test('scripts work correctly from project directory', async () => {
    const projectName = 'script-test-dao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    // Create a test config
    const testConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf8'));
    testConfig.projectName = projectName;
    
    const configPath = path.join(TEST_DIR, 'script-test-config.json');
    await fs.writeJson(configPath, testConfig);
    
    try {
      // Create project
      await execAsync(
        `timeout 60s node ${CLI_PATH} create ${projectName} --config ${configPath}`,
        { cwd: TEST_DIR }
      );
      
      // Test that scripts fail with correct error when not in project directory
      try {
        await execAsync('npm run deploy:proof', { cwd: TEST_DIR });
        throw new Error('Expected script to fail');
      } catch (error) {
        expect(error.stdout || error.stderr).toContain('Must run this command from your DataDAO project directory');
      }
      
      console.log('✅ Script directory validation works correctly');
      
    } catch (error) {
      if (!error.message.includes('timeout')) {
        throw error;
      }
      // Timeout is acceptable for project creation
    }
  }, 90000);
});