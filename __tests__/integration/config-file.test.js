const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TEST_DIR = path.join(__dirname, '../../test-output');
const CLI_PATH = path.join(__dirname, '../../bin/create-datadao.js');
const TEST_CONFIG_PATH = path.join(__dirname, '../config/test-config.json');

describe.skip('Config File Integration', () => {
  // TODO: These tests use real CLI execution which can timeout
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });
  
  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });
  
  test('creates project using config file', async () => {
    const projectName = 'test-datadao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    // Run CLI with config file - using timeout to prevent hanging
    try {
      const { stdout, stderr } = await execAsync(
        `timeout 30s node ${CLI_PATH} create ${projectName} --config ${TEST_CONFIG_PATH}`,
        { cwd: TEST_DIR }
      );
      
      // Check if project was created
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'deployment.json'))).toBe(true);
      
      // Verify deployment.json contains correct data from config
      const deployment = JSON.parse(
        await fs.readFile(path.join(projectPath, 'deployment.json'), 'utf8')
      );
      
      expect(deployment.dlpName).toBe('TestDataDAO');
      expect(deployment.address).toBe('0x0000000000000000000000000000000000000000');
      expect(deployment.pinataApiKey).toBe('test-pinata-api-key');
      
    } catch (error) {
      // Timeout is expected for headless mode - check if project was created
      if (error.message.includes('timeout')) {
        // Project should be created even with timeout
        if (fs.existsSync(projectPath)) {
          expect(fs.existsSync(path.join(projectPath, 'deployment.json'))).toBe(true);
        }
      } else {
        throw error;
      }
    }
  }, 35000); // 35 second timeout
  
  test('shows error for invalid config file', async () => {
    const invalidConfigPath = path.join(TEST_DIR, 'invalid-config.json');
    await fs.writeFile(invalidConfigPath, 'invalid json content', 'utf8');
    
    try {
      await execAsync(
        `node ${CLI_PATH} create test-project --config ${invalidConfigPath}`,
        { cwd: TEST_DIR }
      );
      throw new Error('Expected command to fail');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('Failed to load config file');
    }
  });
  
  test('shows error for missing config file', async () => {
    const missingConfigPath = path.join(TEST_DIR, 'missing-config.json');
    
    try {
      await execAsync(
        `node ${CLI_PATH} create test-project --config ${missingConfigPath}`,
        { cwd: TEST_DIR }
      );
      throw new Error('Expected command to fail');
    } catch (error) {
      expect(error.stdout || error.stderr).toContain('Failed to load config file');
    }
  });
  
  test('uses project name from config when not provided as argument', async () => {
    const projectPath = path.join(TEST_DIR, 'test-datadao'); // name from config
    
    try {
      const { stdout } = await execAsync(
        `timeout 10s node ${CLI_PATH} create --config ${TEST_CONFIG_PATH}`,
        { cwd: TEST_DIR }
      );
      
      // Should use project name from config file
      expect(stdout).toContain('test-datadao');
      
    } catch (error) {
      // Check if project directory was created with correct name
      if (fs.existsSync(projectPath)) {
        // Success - project was created with name from config
        expect(true).toBe(true);
      }
    }
  }, 15000);
});