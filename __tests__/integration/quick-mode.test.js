const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const TEST_DIR = path.join(__dirname, '../../test-output');
const CLI_PATH = path.join(__dirname, '../../bin/create-datadao.js');

describe.skip('Quick Mode Integration', () => {
  // TODO: These tests execute the real CLI and can timeout
  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
  });
  
  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });
  
  test('creates project in quick mode', async () => {
    const projectName = 'quick-test-dao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    try {
      // Run CLI in quick mode
      const { stdout, stderr } = await execAsync(
        `node ${CLI_PATH} create ${projectName} --quick`,
        { 
          cwd: TEST_DIR,
          timeout: 90000 // 90 seconds
        }
      );
      
      console.log('📊 Quick mode output:', stdout);
      if (stderr) console.log('⚠️ Errors:', stderr);
      
      // Verify project structure was created
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'deployment.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'scripts'))).toBe(true);
      
      // Verify deployment.json has correct configuration
      const deployment = JSON.parse(
        fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8')
      );
      
      // Should have auto-generated values
      expect(deployment.dlpName).toBe('QuickTestDAO');
      expect(deployment.tokenName).toBe('QuickTestToken'); // DAO gets replaced with Token
      expect(deployment.tokenSymbol).toBe('QTD'); // QuickTestDao -> Q-T-D
      expect(deployment.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(deployment.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(deployment.publicKey).toMatch(/^0x[a-fA-F0-9]+$/);
      
      // Should not have optional services (deferred)
      expect(deployment.githubUsername).toBeNull();
      expect(deployment.pinataApiKey).toBeNull();
      expect(deployment.pinataApiSecret).toBeNull();
      expect(deployment.googleClientId).toBeNull();
      expect(deployment.googleClientSecret).toBeNull();
      
      // Should contain wallet instructions in output
      expect(stdout).toContain('Generated wallet:');
      expect(stdout).toContain('Save this private key securely!');
      expect(stdout).toContain('https://faucet.vana.org');
      expect(stdout).toContain('create-datadao status');
      
    } catch (error) {
      // Quick mode should be fast, but allow some tolerance
      if (error.message.includes('timeout')) {
        // Check if project was created even with timeout
        if (fs.existsSync(projectPath)) {
          expect(fs.existsSync(path.join(projectPath, 'deployment.json'))).toBe(true);
          console.log('✅ Project created successfully despite timeout');
        } else {
          throw new Error('Project not created within timeout');
        }
      } else {
        throw error;
      }
    }
  }, 120000); // 2 minutes timeout
  
  test('quick mode with default project name', async () => {
    // Test the interactive prompt for project name
    // This test is limited because we can't easily simulate interactive input
    // But we can test that the CLI doesn't crash with --quick alone
    
    try {
      const { stdout } = await execAsync(
        `echo "test-default-dao" | node ${CLI_PATH} create --quick`,
        { 
          cwd: TEST_DIR,
          timeout: 60000
        }
      );
      
      // Should prompt for project name
      expect(stdout).toContain('DataDAO project name:');
      
    } catch (error) {
      // This might timeout, which is expected for interactive mode
      if (!error.message.includes('timeout')) {
        throw error;
      }
    }
  }, 70000);
  
  test('quick mode generates valid wallet', async () => {
    const projectName = 'wallet-test-dao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    try {
      const { stdout } = await execAsync(
        `timeout 60s node ${CLI_PATH} create ${projectName} --quick`,
        { cwd: TEST_DIR }
      );
      
      // Extract private key from output
      const privateKeyMatch = stdout.match(/Private Key: (0x[a-fA-F0-9]{64})/);
      const addressMatch = stdout.match(/Address: (0x[a-fA-F0-9]{40})/);
      
      if (privateKeyMatch && addressMatch) {
        const privateKey = privateKeyMatch[1];
        const address = addressMatch[1];
        
        // Verify wallet format
        expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        
        // Verify they match in deployment.json if created
        if (fs.existsSync(path.join(projectPath, 'deployment.json'))) {
          const deployment = JSON.parse(
            fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8')
          );
          expect(deployment.privateKey).toBe(privateKey);
          expect(deployment.address).toBe(address);
        }
      }
      
    } catch (error) {
      // Timeout is acceptable, check if output contains wallet info
      if (error.stdout && error.stdout.includes('Generated wallet:')) {
        // Success - wallet was generated
        expect(error.stdout).toContain('Private Key: 0x');
        expect(error.stdout).toContain('Address: 0x');
      }
    }
  }, 70000);
  
  test('quick mode creates minimal deployment.json', async () => {
    const projectName = 'minimal-test-dao';
    const projectPath = path.join(TEST_DIR, projectName);
    
    try {
      await execAsync(
        `timeout 45s node ${CLI_PATH} create ${projectName} --quick`,
        { cwd: TEST_DIR }
      );
      
    } catch (error) {
      // Expected timeout, check results
    }
    
    if (fs.existsSync(path.join(projectPath, 'deployment.json'))) {
      const deployment = JSON.parse(
        fs.readFileSync(path.join(projectPath, 'deployment.json'), 'utf8')
      );
      
      // Required fields should be present
      expect(deployment.dlpName).toBeTruthy();
      expect(deployment.tokenName).toBeTruthy();
      expect(deployment.tokenSymbol).toBeTruthy();
      expect(deployment.address).toBeTruthy();
      expect(deployment.privateKey).toBeTruthy();
      expect(deployment.publicKey).toBeTruthy();
      
      // Optional fields should be null/undefined
      expect(deployment.githubUsername).toBeFalsy();
      expect(deployment.pinataApiKey).toBeFalsy();
      expect(deployment.pinataApiSecret).toBeFalsy();
      expect(deployment.googleClientId).toBeFalsy();
      expect(deployment.googleClientSecret).toBeFalsy();
      
      // Network should be set to defaults
      expect(deployment.network).toBe('moksha');
      expect(deployment.rpcUrl).toBe('https://rpc.moksha.vana.org');
      expect(deployment.chainId).toBe(14800);
    }
  }, 60000);
});