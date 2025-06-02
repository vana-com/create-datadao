/**
 * Comprehensive Template Engine Tests
 * Tests actual template processing with real templates and configurations
 */

const TemplateEngine = require('../../lib/template-engine');
const fs = require('fs-extra');
const path = require('path');

// Use real fs for these tests - we want to test real behavior
jest.unmock('fs-extra');

describe('Template Engine - Real Processing', () => {
  let templateEngine;
  let testDir;
  
  beforeEach(() => {
    templateEngine = new TemplateEngine();
    testDir = path.join(__dirname, 'template-test');
    fs.ensureDirSync(testDir);
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('Real Template Processing', () => {
    test('processes deploy-contracts.js.template with real config', () => {
      const config = {
        dlpName: 'TestDataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        privateKey: '0x3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        DEPLOYER_PRIVATE_KEY: '3f572ac0f0671db5231100918c22296306be0ed77d4353f80ad8b4ea9317cf51',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C',
        MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org'
      };

      const result = templateEngine.processTemplate('deploy-contracts.js.template', config);
      
      // Test that config values are properly substituted
      expect(result).toContain(config.dlpName);
      expect(result).toContain(config.tokenName);
      expect(result).toContain(config.tokenSymbol);
      expect(result).toContain(config.DEPLOYER_PRIVATE_KEY);
      expect(result).toContain(config.DLP_REGISTRY_CONTRACT_ADDRESS);
      expect(result).toContain(config.MOKSHA_RPC_URL);
      
      // Test that the output is valid JavaScript
      expect(() => {
        new Function(result);
      }).not.toThrow();
      
      // Test specific functionality - contract address parsing logic
      expect(result).toContain('const tokenMatch = output.match');
      expect(result).toContain('const proxyMatch = output.match');
      expect(result).toContain('Token Address:');
      expect(result).toContain('DataLiquidityPoolProxy');
      
      // Verify deployment.json update logic
      expect(result).toContain('deployment.tokenAddress = tokenAddress');
      expect(result).toContain('deployment.proxyAddress = proxyAddress');
      expect(result).toContain('deployment.contracts = {');
    });

    test('processes register-datadao.js.template with backward compatibility', () => {
      const config = {
        dlpName: 'TestDataDAO',
        address: '0x7e93327616e828fCBf5E7081BD284607fD6C23C4',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C',
        MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
        MOKSHA_BROWSER_URL: 'https://vanascan.io'
      };

      const result = templateEngine.processTemplate('register-datadao.js.template', config);
      
      // Test that proxy address logic supports both old and new formats
      expect(result).toContain('deployment.proxyAddress ||');
      expect(result).toContain('deployment.contracts && deployment.contracts.proxyAddress');
      expect(result).toContain('deployment.dlpAddress');
      
      // Test that all three instances of proxy address logic are present
      const proxyLogicMatches = result.match(/deployment\.proxyAddress \|\|/g);
      expect(proxyLogicMatches.length).toBeGreaterThanOrEqual(3);
      
      // Test registration parameter construction
      expect(result).toContain('dlpAddress: dlpProxyAddress');
      expect(result).toContain('ownerAddress: deployment.address');
      expect(result).toContain('treasuryAddress: deployment.address');
      expect(result).toContain('name: deployment.dlpName');
      
      // Test error handling logic
      expect(result).toContain('insufficient funds');
      expect(result).toContain('execution reverted');
      expect(result).toContain('Registration fee: 1 VANA');
    });

    test('processes proof and refiner templates with repo configurations', () => {
      const proofConfig = {
        dlpName: 'TestDataDAO',
        githubUsername: 'testuser',
        proofRepo: 'https://github.com/testuser/test-proof',
        dlpId: 42,
        PINATA_JWT: 'test-jwt-token'
      };

      const proofResult = templateEngine.processTemplate('deploy-proof.js', proofConfig);
      
      expect(proofResult).toContain(proofConfig.githubUsername);
      expect(proofResult).toContain(proofConfig.proofRepo);
      expect(proofResult).toContain(proofConfig.dlpId.toString());
      expect(proofResult).toContain(proofConfig.PINATA_JWT);

      const refinerConfig = {
        dlpName: 'TestDataDAO',
        githubUsername: 'testuser',
        refinerRepo: 'https://github.com/testuser/test-refiner',
        dlpId: 42
      };

      const refinerResult = templateEngine.processTemplate('deploy-refiner.js', refinerConfig);
      
      expect(refinerResult).toContain(refinerConfig.githubUsername);
      expect(refinerResult).toContain(refinerConfig.refinerRepo);
      expect(refinerResult).toContain(refinerConfig.dlpId.toString());
    });

    test('processes UI template with Google OAuth credentials', () => {
      const config = {
        dlpName: 'TestDataDAO',
        googleClientId: 'test-client-id.apps.googleusercontent.com',
        googleClientSecret: 'test-client-secret',
        tokenAddress: '0x6F86D622330aD4c50c772592d7fAc94FdBD05C3e',
        proxyAddress: '0x129E6540D19c1b48B11Ba6fae9CF4dc45dfB892A',
        dlpId: 42
      };

      const result = templateEngine.processTemplate('deploy-ui.js', config);
      
      expect(result).toContain(config.googleClientId);
      expect(result).toContain(config.googleClientSecret);
      expect(result).toContain(config.tokenAddress);
      expect(result).toContain(config.proxyAddress);
      expect(result).toContain(config.dlpId.toString());
      
      // Test that sensitive data handling is present
      expect(result).toContain('GOOGLE_CLIENT_ID');
      expect(result).toContain('GOOGLE_CLIENT_SECRET');
      expect(result).toContain('NEXTAUTH_SECRET');
    });
  });

  describe('Template Variable Replacement', () => {
    test('replaces simple variables correctly', () => {
      const templateContent = 'Hello {{name}}, your token is {{token}}!';
      const config = { name: 'Alice', token: 'TOKEN123' };
      
      const result = templateEngine.processTemplateContent(templateContent, config);
      
      expect(result).toBe('Hello Alice, your token is TOKEN123!');
    });

    test('handles missing variables gracefully', () => {
      const templateContent = 'Hello {{name}}, your token is {{missingToken}}!';
      const config = { name: 'Alice' };
      
      const result = templateEngine.processTemplateContent(templateContent, config);
      
      // Should leave undefined variables as-is or handle them gracefully
      expect(result).toContain('Alice');
      expect(result).toContain('{{missingToken}}'); // Or however the engine handles missing vars
    });

    test('processes complex nested replacements', () => {
      const templateContent = `
        const config = {
          name: '{{dlpName}}',
          address: '{{address}}',
          contracts: {
            token: '{{tokenAddress}}',
            proxy: '{{proxyAddress}}'
          }
        };
      `;
      const config = {
        dlpName: 'MyDAO',
        address: '0x123',
        tokenAddress: '0x456',
        proxyAddress: '0x789'
      };
      
      const result = templateEngine.processTemplateContent(templateContent, config);
      
      expect(result).toContain("name: 'MyDAO'");
      expect(result).toContain("address: '0x123'");
      expect(result).toContain("token: '0x456'");
      expect(result).toContain("proxy: '0x789'");
    });
  });

  describe('Environment File Processing', () => {
    test('processes .env templates correctly', () => {
      const envTemplate = `
DEPLOYER_PRIVATE_KEY={{DEPLOYER_PRIVATE_KEY}}
DLP_REGISTRY_CONTRACT_ADDRESS={{DLP_REGISTRY_CONTRACT_ADDRESS}}
MOKSHA_RPC_URL={{MOKSHA_RPC_URL}}
PINATA_JWT={{PINATA_JWT}}
GOOGLE_CLIENT_ID={{googleClientId}}
GOOGLE_CLIENT_SECRET={{googleClientSecret}}
      `.trim();

      const config = {
        DEPLOYER_PRIVATE_KEY: 'private-key-123',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0xregistry123',
        MOKSHA_RPC_URL: 'https://rpc.test',
        PINATA_JWT: 'jwt-token-123',
        googleClientId: 'google-client-123',
        googleClientSecret: 'google-secret-123'
      };

      const result = templateEngine.processTemplateContent(envTemplate, config);
      
      expect(result).toContain('DEPLOYER_PRIVATE_KEY=private-key-123');
      expect(result).toContain('DLP_REGISTRY_CONTRACT_ADDRESS=0xregistry123');
      expect(result).toContain('MOKSHA_RPC_URL=https://rpc.test');
      expect(result).toContain('PINATA_JWT=jwt-token-123');
      expect(result).toContain('GOOGLE_CLIENT_ID=google-client-123');
      expect(result).toContain('GOOGLE_CLIENT_SECRET=google-secret-123');
    });
  });

  describe('Error Handling', () => {
    test('handles non-existent template files gracefully', () => {
      expect(() => {
        templateEngine.processTemplate('non-existent-template.js', {});
      }).toThrow();
    });

    test('validates template content syntax', () => {
      // Test with real template that should be syntactically valid
      const config = {
        dlpName: 'Test',
        address: '0x123',
        DEPLOYER_PRIVATE_KEY: 'key',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0x456',
        MOKSHA_RPC_URL: 'https://rpc.test'
      };

      const jsTemplate = templateEngine.processTemplate('deploy-contracts.js.template', config);
      
      // Should be valid JavaScript
      expect(() => {
        new Function(jsTemplate);
      }).not.toThrow();
    });
  });

  describe('Integration with File System', () => {
    test('writes processed templates to files correctly', () => {
      const config = {
        dlpName: 'TestDAO',
        address: '0x123',
        DEPLOYER_PRIVATE_KEY: 'test-key',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0x456',
        MOKSHA_RPC_URL: 'https://rpc.test'
      };

      const processed = templateEngine.processTemplate('deploy-contracts.js.template', config);
      const outputPath = path.join(testDir, 'deploy-contracts.js');
      
      fs.writeFileSync(outputPath, processed);
      
      expect(fs.existsSync(outputPath)).toBe(true);
      
      const fileContent = fs.readFileSync(outputPath, 'utf8');
      expect(fileContent).toContain(config.dlpName);
      expect(fileContent).toContain(config.address);
      
      // Verify the file is executable Node.js
      expect(() => {
        require(outputPath);
      }).not.toThrow();
    });
  });
});