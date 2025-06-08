/**
 * Real Template Engine Tests
 * Tests the actual TemplateEngine class with real templates
 */

const TemplateEngine = require('../../lib/template-engine');
const fs = require('fs-extra');
const path = require('path');

// Use real fs for these tests
jest.unmock('fs-extra');

describe('Template Engine - Real Tests', () => {
  let templateEngine;
  let testTemplatesDir;
  
  beforeEach(() => {
    testTemplatesDir = path.join(__dirname, 'test-templates');
    fs.ensureDirSync(testTemplatesDir);
    templateEngine = new TemplateEngine(testTemplatesDir);
  });
  
  afterEach(() => {
    if (fs.existsSync(testTemplatesDir)) {
      fs.removeSync(testTemplatesDir);
    }
  });

  describe('Basic Template Processing', () => {
    test('processes simple template with variables', () => {
      const templateContent = 'Hello {{name}}, your token is {{token}}!';
      const templatePath = path.join(testTemplatesDir, 'simple.template');
      fs.writeFileSync(templatePath, templateContent);

      const result = templateEngine.processTemplate('simple.template', {
        name: 'Alice',
        token: 'TEST123'
      });

      expect(result).toBe('Hello Alice, your token is TEST123!');
    });

    test('handles missing variables by leaving placeholders', () => {
      const templateContent = 'Hello {{name}}, your balance is {{balance}} {{currency}}';
      const templatePath = path.join(testTemplatesDir, 'missing.template');
      fs.writeFileSync(templatePath, templateContent);

      const result = templateEngine.processTemplate('missing.template', {
        name: 'Bob'
      });

      expect(result).toBe('Hello Bob, your balance is {{balance}} {{currency}}');
    });

    test('processes complex nested placeholders', () => {
      const templateContent = `
const config = {
  name: '{{projectName}}',
  token: {
    name: '{{tokenName}}',
    symbol: '{{tokenSymbol}}'
  },
  addresses: {
    owner: '{{ownerAddress}}',
    proxy: '{{proxyAddress}}'
  }
};`;
      const templatePath = path.join(testTemplatesDir, 'config.template');
      fs.writeFileSync(templatePath, templateContent);

      const result = templateEngine.processTemplate('config.template', {
        projectName: 'MyDAO',
        tokenName: 'MyToken',
        tokenSymbol: 'MTK',
        ownerAddress: '0x123',
        proxyAddress: '0x456'
      });

      expect(result).toContain("name: 'MyDAO'");
      expect(result).toContain("name: 'MyToken'");
      expect(result).toContain("symbol: 'MTK'");
      expect(result).toContain("owner: '0x123'");
      expect(result).toContain("proxy: '0x456'");
    });
  });

  describe('Actual Template Processing', () => {
    test('processes real deploy-contracts.js.template', () => {
      const realTemplateEngine = new TemplateEngine(); // Use default templates dir
      
      const config = {
        dlpName: 'TestDAO',
        tokenName: 'TestToken',
        tokenSymbol: 'TEST'
      };

      const result = realTemplateEngine.processTemplate('deploy-contracts.js.template', config);

      // Test that the script structure is preserved (no placeholders in this template)
      expect(result).toContain('const fs = require(');
      expect(result).toContain('async function deployContracts()');
      expect(result).toContain('async function checkWalletBalance(address)');
      expect(result).toContain('https://rpc.moksha.vana.org');
      
      // Test that the result is valid JavaScript
      expect(() => {
        new Function(result);
      }).not.toThrow();
    });

    test('processes real register-datadao.js.template', () => {
      const realTemplateEngine = new TemplateEngine();
      
      const config = {
        DLP_REGISTRY_CONTRACT_ADDRESS: '0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C',
        MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
        MOKSHA_BROWSER_URL: 'https://vanascan.io'
      };

      const result = realTemplateEngine.processTemplate('register-datadao.js.template', config);

      // Test that variables are replaced
      expect(result).toContain(config.DLP_REGISTRY_CONTRACT_ADDRESS);
      expect(result).toContain(config.MOKSHA_RPC_URL);
      expect(result).toContain(config.MOKSHA_BROWSER_URL);
      
      // Test that backward compatibility logic is present
      expect(result).toContain('deployment.proxyAddress ||');
      expect(result).toContain('deployment.contracts && deployment.contracts.proxyAddress');
      expect(result).toContain('deployment.dlpAddress');
      
      // Test the function structure is preserved
      expect(result).toContain('async function registerDataDAO()');
      expect(result).toContain('async function performAutomatedRegistration');
      expect(result).toContain('async function performManualRegistration');
    });
  });

  describe('Error Handling', () => {
    test('throws error for non-existent template', () => {
      expect(() => {
        templateEngine.processTemplate('non-existent.template', {});
      }).toThrow('Template file not found');
    });

    test('handles empty templates', () => {
      const templatePath = path.join(testTemplatesDir, 'empty.template');
      fs.writeFileSync(templatePath, '');

      const result = templateEngine.processTemplate('empty.template', {});
      expect(result).toBe('');
    });

    test('handles templates with no placeholders', () => {
      const templateContent = 'This is a static template with no variables.';
      const templatePath = path.join(testTemplatesDir, 'static.template');
      fs.writeFileSync(templatePath, templateContent);

      const result = templateEngine.processTemplate('static.template', {});
      expect(result).toBe(templateContent);
    });
  });

  describe('Variable Extraction', () => {
    test('extracts variables from template content', () => {
      const templateContent = 'Hello {{name}}, your {{type}} is {{value}}!';
      
      const variables = templateEngine.extractPlaceholders(templateContent);
      expect(variables.sort()).toEqual(['name', 'type', 'value']);
    });

    test('handles duplicate variables', () => {
      const templateContent = 'Hello {{name}}, {{name}} is your name!';
      
      const variables = templateEngine.extractPlaceholders(templateContent);
      expect(variables).toEqual(['name']); // Should be deduplicated
    });

    test('handles complex variable names', () => {
      const templateContent = 'Config: {{UPPER_CASE}}, {{camelCase}}, {{kebab-case}}';
      
      const variables = templateEngine.extractPlaceholders(templateContent);
      expect(variables.sort()).toEqual(['UPPER_CASE', 'camelCase', 'kebab-case']);
    });
  });
});