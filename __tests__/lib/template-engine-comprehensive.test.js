/**
 * Comprehensive Template Engine Tests
 * Tests actual template processing with real templates and configurations
 */

const TemplateEngine = require('../../lib/template-engine');
const fs = require('fs-extra');
const path = require('path');

// Use real fs for these tests - we want to test real behavior
jest.unmock('fs-extra');

describe('Template Engine - Comprehensive Tests', () => {
  let templateEngine;
  let testDir;
  
  beforeEach(() => {
    templateEngine = new TemplateEngine();
    testDir = path.join(__dirname, 'template-comprehensive-test');
    fs.ensureDirSync(testDir);
  });
  
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('Default Configuration', () => {
    test('provides complete Vana network configuration', () => {
      const defaultConfig = templateEngine.getDefaultVanaConfig();
      
      // Verify all required addresses are present
      expect(defaultConfig).toHaveProperty('DLP_REGISTRY_CONTRACT_ADDRESS');
      expect(defaultConfig).toHaveProperty('DATA_REGISTRY_CONTRACT_ADDRESS');
      expect(defaultConfig).toHaveProperty('TEE_POOL_CONTRACT_ADDRESS');
      expect(defaultConfig).toHaveProperty('DAT_FACTORY_CONTRACT_ADDRESS');
      
      // Verify network URLs
      expect(defaultConfig).toHaveProperty('MOKSHA_RPC_URL');
      expect(defaultConfig).toHaveProperty('MOKSHA_API_URL');
      expect(defaultConfig).toHaveProperty('MOKSHA_BROWSER_URL');
      expect(defaultConfig).toHaveProperty('VANA_RPC_URL');
      expect(defaultConfig).toHaveProperty('VANA_API_URL');
      expect(defaultConfig).toHaveProperty('VANA_BROWSER_URL');
      
      // Verify addresses are valid
      expect(defaultConfig.DLP_REGISTRY_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(defaultConfig.DATA_REGISTRY_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(defaultConfig.TEE_POOL_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(defaultConfig.DAT_FACTORY_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      // Verify URLs are valid
      expect(defaultConfig.MOKSHA_RPC_URL).toMatch(/^https?:\/\/.+/);
      expect(defaultConfig.MOKSHA_API_URL).toMatch(/^https?:\/\/.+/);
      expect(defaultConfig.MOKSHA_BROWSER_URL).toMatch(/^https?:\/\/.+/);
    });
    
    test('includes all network configurations', () => {
      const defaultConfig = templateEngine.getDefaultVanaConfig();
      
      // Should have both Vana mainnet and Moksha testnet configs
      expect(defaultConfig.VANA_RPC_URL).toBeDefined();
      expect(defaultConfig.MOKSHA_RPC_URL).toBeDefined();
      
      // Moksha should be https (secure)
      expect(defaultConfig.MOKSHA_RPC_URL).toContain('https://');
      
      // Should have trusted forwarder address (even if zero address)
      expect(defaultConfig).toHaveProperty('TRUSTED_FORWARDER_ADDRESS');
      expect(defaultConfig.TRUSTED_FORWARDER_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('Template Processing', () => {
    test('processes templates with complex variable substitution', () => {
      const testTemplate = `
// Configuration file for {{projectName}}
const config = {
  name: "{{dlpName}}",
  token: {
    name: "{{tokenName}}",
    symbol: "{{tokenSymbol}}"
  },
  blockchain: {
    rpcUrl: "{{MOKSHA_RPC_URL}}",
    registry: "{{DLP_REGISTRY_CONTRACT_ADDRESS}}"
  },
  credentials: {
    privateKey: "{{privateKey}}",
    address: "{{address}}"
  }
};

module.exports = config;
`;

      // Create a test template file
      const templatePath = path.join(testDir, 'test.template');
      fs.writeFileSync(templatePath, testTemplate);
      
      // Create custom template engine for this test
      const customEngine = new TemplateEngine(testDir);
      
      const variables = {
        projectName: 'TestProject',
        dlpName: 'Test DataDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST',
        MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
        DLP_REGISTRY_CONTRACT_ADDRESS: '0x1234567890123456789012345678901234567890',
        privateKey: '0xabcdef',
        address: '0x123456'
      };
      
      const result = customEngine.processTemplate('test.template', variables);
      
      // Verify all variables were substituted
      expect(result).toContain('TestProject');
      expect(result).toContain('Test DataDAO');
      expect(result).toContain('TestToken');
      expect(result).toContain('TEST');
      expect(result).toContain('https://rpc.moksha.vana.org');
      expect(result).toContain('0x1234567890123456789012345678901234567890');
      expect(result).toContain('0xabcdef');
      expect(result).toContain('0x123456');
      
      // Verify no placeholders remain
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
    });
    
    test('handles missing variables gracefully', () => {
      const testTemplate = 'Hello {{name}}, your status is {{status}}, {{missing}} variable.';
      
      // Create a test template file
      const templatePath = path.join(testDir, 'missing.template');
      fs.writeFileSync(templatePath, testTemplate);
      
      // Create custom template engine for this test
      const customEngine = new TemplateEngine(testDir);
      
      const variables = {
        name: 'Alice',
        status: 'active'
        // missing variable not provided
      };
      
      // Mock console.warn to capture warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = customEngine.processTemplate('missing.template', variables);
      
      // Should substitute known variables
      expect(result).toContain('Alice');
      expect(result).toContain('active');
      
      // Should keep unknown placeholder
      expect(result).toContain('{{missing}}');
      
      // Should have warned about missing variable
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Variable 'missing' not found")
      );
      
      consoleSpy.mockRestore();
    });

    test('extracts all unique placeholders from complex templates', () => {
      const complexTemplate = `
# Configuration for {{dlpName}}
SERVICE_NAME={{dlpName}}
TOKEN_NAME={{tokenName}}
TOKEN_SYMBOL={{tokenSymbol}}
DUPLICATE_VALUE={{dlpName}}  # This should deduplicate
NESTED_CONFIG="{{MOKSHA_RPC_URL}}/{{chainId}}"
COMPLEX_PATTERN={{kebab-case-var}}
UPPER_CASE={{SCREAMING_SNAKE_CASE}}
`;
      
      const placeholders = templateEngine.extractPlaceholders(complexTemplate);
      
      // Should extract all unique placeholders
      expect(placeholders).toContain('dlpName');
      expect(placeholders).toContain('tokenName');
      expect(placeholders).toContain('tokenSymbol');
      expect(placeholders).toContain('MOKSHA_RPC_URL');
      expect(placeholders).toContain('chainId');
      expect(placeholders).toContain('kebab-case-var');
      expect(placeholders).toContain('SCREAMING_SNAKE_CASE');
      
      // Should deduplicate (dlpName appears twice)
      const dlpNameOccurrences = placeholders.filter(p => p === 'dlpName');
      expect(dlpNameOccurrences).toHaveLength(1);
      
      // Should have correct total count
      expect(placeholders).toHaveLength(7);
    });
  });

  describe('Multiple Template Processing', () => {
    test('processes multiple templates with shared and unique variables', () => {
      // Create multiple test templates
      const template1 = 'Project: {{name}}, Environment: {{env}}';
      const template2 = 'Token: {{token}}, Environment: {{env}}';
      
      const template1Path = path.join(testDir, 'config1.template');
      const template2Path = path.join(testDir, 'config2.template');
      const output1Path = path.join(testDir, 'config1.js');
      const output2Path = path.join(testDir, 'config2.js');
      
      fs.writeFileSync(template1Path, template1);
      fs.writeFileSync(template2Path, template2);
      
      // Create custom template engine
      const customEngine = new TemplateEngine(testDir);
      
      const globalVariables = {
        env: 'production'
      };
      
      const templates = [
        {
          template: 'config1.template',
          target: output1Path,
          variables: { name: 'DataDAO Generator' }
        },
        {
          template: 'config2.template',
          target: output2Path,
          variables: { token: 'VANA' }
        }
      ];
      
      const results = customEngine.processMultipleTemplates(templates, globalVariables);
      
      // All templates should process successfully
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Verify output files were created correctly
      expect(fs.existsSync(output1Path)).toBe(true);
      expect(fs.existsSync(output2Path)).toBe(true);
      
      const content1 = fs.readFileSync(output1Path, 'utf8');
      const content2 = fs.readFileSync(output2Path, 'utf8');
      
      expect(content1).toBe('Project: DataDAO Generator, Environment: production');
      expect(content2).toBe('Token: VANA, Environment: production');
    });
    
    test('handles template processing failures gracefully', () => {
      const templates = [
        {
          template: 'nonexistent.template',
          target: path.join(testDir, 'output1.js')
        },
        {
          template: 'also-missing.template', 
          target: path.join(testDir, 'output2.js')
        }
      ];
      
      const results = templateEngine.processMultipleTemplates(templates);
      
      // Should return failure results for missing templates
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[0].error).toContain('Template file not found');
      expect(results[1].error).toContain('Template file not found');
    });
  });

  describe('Template Validation', () => {
    test('validates templates and identifies missing variables', () => {
      const templateContent = 'Hello {{name}}, your {{type}} account has {{balance}} credits.';
      
      // Create test template
      const templatePath = path.join(testDir, 'validate.template');
      fs.writeFileSync(templatePath, templateContent);
      
      // Create custom template engine
      const customEngine = new TemplateEngine(testDir);
      
      const completeVariables = {
        name: 'Alice',
        type: 'premium',
        balance: '100'
      };
      
      const incompleteVariables = {
        name: 'Bob',
        balance: '50'
        // missing 'type'
      };
      
      // Test with complete variables
      const validResult = customEngine.validateTemplate('validate.template', completeVariables);
      expect(validResult.valid).toBe(true);
      expect(validResult.missing).toHaveLength(0);
      expect(validResult.required).toEqual(['name', 'type', 'balance']);
      
      // Test with incomplete variables
      const invalidResult = customEngine.validateTemplate('validate.template', incompleteVariables);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.missing).toEqual(['type']);
      expect(invalidResult.required).toEqual(['name', 'type', 'balance']);
    });
  });

  describe('File System Integration', () => {
    test('creates target directories when processing templates to files', () => {
      const template = 'Config: {{value}}';
      const variables = { value: 'test' };
      
      // Create test template
      const templatePath = path.join(testDir, 'nested.template');
      fs.writeFileSync(templatePath, template);
      
      // Target file in nested directory that doesn't exist yet
      const targetPath = path.join(testDir, 'deep', 'nested', 'config.js');
      
      // Create custom template engine
      const customEngine = new TemplateEngine(testDir);
      
      // Process template to nested path
      customEngine.processTemplateToFile('nested.template', targetPath, variables);
      
      // Should create directories and file
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.readFileSync(targetPath, 'utf8')).toBe('Config: test');
    });
    
    test('overwrites existing files when processing templates', () => {
      const template = 'New content: {{value}}';
      const variables = { value: 'updated' };
      
      // Create test template
      const templatePath = path.join(testDir, 'overwrite.template');
      fs.writeFileSync(templatePath, template);
      
      const targetPath = path.join(testDir, 'target.js');
      
      // Create existing file with different content
      fs.writeFileSync(targetPath, 'Old content');
      
      // Create custom template engine
      const customEngine = new TemplateEngine(testDir);
      
      // Process template (should overwrite)
      customEngine.processTemplateToFile('overwrite.template', targetPath, variables);
      
      // Should have new content
      expect(fs.readFileSync(targetPath, 'utf8')).toBe('New content: updated');
    });
  });
});