const TemplateEngine = require('../template-engine');
const { createMockFs, createMockTemplateVars } = require('../../__tests__/mocks/factories');
const path = require('path');

// Mock fs-extra
const fs = require('fs-extra');

describe('TemplateEngine', () => {
  let templateEngine;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = createMockFs();
    
    // Apply mocks
    Object.assign(fs, mockFs);
    
    templateEngine = new TemplateEngine('/mock/templates');
  });

  describe('constructor', () => {
    test('sets default templates directory', () => {
      const engine = new TemplateEngine();
      expect(engine.templatesDir).toBe(path.join(__dirname, '..', '..', 'src', 'templates'));
    });

    test('sets custom templates directory', () => {
      const engine = new TemplateEngine('/custom/templates');
      expect(engine.templatesDir).toBe('/custom/templates');
    });
  });

  describe('processTemplate', () => {
    test('processes simple template with variables', () => {
      const templateContent = 'Hello {{name}}, welcome to {{project}}!';
      const templatePath = 'greeting.txt';
      const variables = { name: 'John', project: 'DataDAO' };

      mockFs.__setMockFile('/mock/templates/greeting.txt', templateContent);
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate(templatePath, variables);

      expect(result).toBe('Hello John, welcome to DataDAO!');
      expect(fs.readFileSync).toHaveBeenCalledWith('/mock/templates/greeting.txt', 'utf8');
    });

    test('throws error if template file not found', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        templateEngine.processTemplate('nonexistent.txt', {});
      }).toThrow('Template file not found: /mock/templates/nonexistent.txt');
    });

    test('handles template with no placeholders', () => {
      const templateContent = 'This is a static template.';
      const templatePath = 'static.txt';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate(templatePath, {});

      expect(result).toBe('This is a static template.');
    });

    test('handles empty template', () => {
      const templateContent = '';
      const templatePath = 'empty.txt';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate(templatePath, {});

      expect(result).toBe('');
    });

    test('processes template with multiple occurrences of same variable', () => {
      const templateContent = '{{name}} is working on {{name}}\'s project called {{name}}-app';
      const templatePath = 'repeated.txt';
      const variables = { name: 'Alice' };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate(templatePath, variables);

      expect(result).toBe('Alice is working on Alice\'s project called Alice-app');
    });

    test('processes complex template with many variables', () => {
      const templateContent = `
Project: {{projectName}}
Token: {{tokenName}} ({{tokenSymbol}})
Network: {{network}}
Address: {{address}}
`;
      const templatePath = 'complex.txt';
      const variables = createMockTemplateVars();

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate(templatePath, variables);

      expect(result).toContain('Project: test-dao');
      expect(result).toContain('Token: TestToken (TEST)');
      expect(result).toContain('Network: moksha');
      expect(result).toContain('Address: 0x1234567890123456789012345678901234567890');
    });
  });

  describe('processTemplateToFile', () => {
    test('processes template and writes to file', () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = 'greeting.txt';
      const targetPath = '/output/result.txt';
      const variables = { name: 'World' };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      templateEngine.processTemplateToFile(templatePath, targetPath, variables);

      expect(fs.ensureDirSync).toHaveBeenCalledWith('/output');
      expect(fs.writeFileSync).toHaveBeenCalledWith(targetPath, 'Hello World!', 'utf8');
    });

    test('creates target directory if it doesn\'t exist', () => {
      const templateContent = 'Test content';
      const templatePath = 'test.txt';
      const targetPath = '/deep/nested/path/result.txt';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      templateEngine.processTemplateToFile(templatePath, targetPath, {});

      expect(fs.ensureDirSync).toHaveBeenCalledWith('/deep/nested/path');
    });

    test('handles template processing errors', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        templateEngine.processTemplateToFile('nonexistent.txt', '/output/result.txt', {});
      }).toThrow('Template file not found');
    });
  });

  describe('replacePlaceholders', () => {
    test('replaces single placeholder', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'Alice' };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Hello Alice!');
    });

    test('replaces multiple placeholders', () => {
      const content = '{{greeting}} {{name}}, you have {{count}} messages.';
      const variables = { greeting: 'Hi', name: 'Bob', count: '5' };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Hi Bob, you have 5 messages.');
    });

    test('handles placeholders with whitespace', () => {
      const content = 'Value: {{ spaced }}, {{ padded   }}';
      const variables = { spaced: 'test1', padded: 'test2' };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Value: test1, test2');
    });

    test('warns about missing variables and keeps placeholder', () => {
      const content = 'Hello {{name}}, your {{status}} is {{unknown}}.';
      const variables = { name: 'John', status: 'active' };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Hello John, your active is {{unknown}}.');
      expect(console.warn).toHaveBeenCalledWith(
        'Warning: Variable \'unknown\' not found, keeping placeholder'
      );
    });

    test('handles empty variables object', () => {
      const content = 'No variables here: {{missing}}';
      const variables = {};

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('No variables here: {{missing}}');
      expect(console.warn).toHaveBeenCalledWith(
        'Warning: Variable \'missing\' not found, keeping placeholder'
      );
    });

    test('handles variables with special characters', () => {
      const content = 'Special: {{var-with-dash}}, {{var_with_underscore}}, {{var123}}';
      const variables = { 
        'var-with-dash': 'dash-value',
        'var_with_underscore': 'underscore-value',
        'var123': 'numeric-value'
      };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Special: dash-value, underscore-value, numeric-value');
    });

    test('handles numeric and boolean values', () => {
      const content = 'Count: {{count}}, Price: {{price}}, Active: {{active}}';
      const variables = { count: 42, price: 19.99, active: true };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Count: 42, Price: 19.99, Active: true');
    });

    test('handles null and undefined values', () => {
      const content = 'Null: {{nullValue}}, Undefined: {{undefinedValue}}';
      const variables = { nullValue: null, undefinedValue: undefined };

      const result = templateEngine.replacePlaceholders(content, variables);

      expect(result).toBe('Null: null, Undefined: undefined');
    });
  });

  describe('processMultipleTemplates', () => {
    test('processes multiple templates successfully', () => {
      const templates = [
        { template: 'template1.txt', target: '/output/file1.txt' },
        { template: 'template2.txt', target: '/output/file2.txt' }
      ];
      const globalVariables = { name: 'Global' };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('template1.txt')) return 'Content 1: {{name}}';
        if (path.includes('template2.txt')) return 'Content 2: {{name}}';
        return '';
      });

      const results = templateEngine.processMultipleTemplates(templates, globalVariables);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ template: 'template1.txt', target: '/output/file1.txt', success: true });
      expect(results[1]).toEqual({ template: 'template2.txt', target: '/output/file2.txt', success: true });
      
      expect(fs.writeFileSync).toHaveBeenCalledWith('/output/file1.txt', 'Content 1: Global', 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalledWith('/output/file2.txt', 'Content 2: Global', 'utf8');
    });

    test('handles template processing errors gracefully', () => {
      const templates = [
        { template: 'good.txt', target: '/output/good.txt' },
        { template: 'bad.txt', target: '/output/bad.txt' }
      ];

      fs.existsSync.mockImplementation((path) => !path.includes('bad.txt'));
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('good.txt')) return 'Good content';
        throw new Error('File not found');
      });

      const results = templateEngine.processMultipleTemplates(templates, {});

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Template file not found');
    });

    test('merges global and local variables correctly', () => {
      const templates = [
        { 
          template: 'test.txt', 
          target: '/output/test.txt',
          variables: { local: 'local-value', shared: 'local-override' }
        }
      ];
      const globalVariables = { global: 'global-value', shared: 'global-value' };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{{global}}, {{local}}, {{shared}}');

      const results = templateEngine.processMultipleTemplates(templates, globalVariables);

      expect(results[0].success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/test.txt', 
        'global-value, local-value, local-override', 
        'utf8'
      );
    });
  });

  describe('getDefaultVanaConfig', () => {
    test('returns default Vana network configuration', () => {
      const config = templateEngine.getDefaultVanaConfig();

      expect(config).toHaveProperty('DLP_REGISTRY_CONTRACT_ADDRESS');
      expect(config).toHaveProperty('DATA_REGISTRY_CONTRACT_ADDRESS');
      expect(config).toHaveProperty('TEE_POOL_CONTRACT_ADDRESS');
      expect(config).toHaveProperty('DAT_FACTORY_CONTRACT_ADDRESS');
      expect(config).toHaveProperty('MOKSHA_RPC_URL', 'https://rpc.moksha.vana.org');
      expect(config).toHaveProperty('VANA_RPC_URL', 'http://rpc.vana.org');
      
      // Check that addresses are valid Ethereum addresses
      expect(config.DLP_REGISTRY_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(config.DATA_REGISTRY_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    test('includes all required network endpoints', () => {
      const config = templateEngine.getDefaultVanaConfig();

      // Vana mainnet
      expect(config.VANA_RPC_URL).toBe('http://rpc.vana.org');
      expect(config.VANA_API_URL).toBe('https://vanascan.io/api');
      expect(config.VANA_BROWSER_URL).toBe('https://vanascan.io');

      // Moksha testnet
      expect(config.MOKSHA_RPC_URL).toBe('https://rpc.moksha.vana.org');
      expect(config.MOKSHA_API_URL).toBe('https://moksha.vanascan.io/api');
      expect(config.MOKSHA_BROWSER_URL).toBe('https://moksha.vanascan.io');
    });
  });

  describe('validateTemplate', () => {
    test('validates template with all required variables provided', () => {
      const templateContent = 'Hello {{name}}, your {{role}} is {{status}}.';
      const templatePath = 'test.txt';
      const variables = { name: 'John', role: 'admin', status: 'active' };

      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.validateTemplate(templatePath, variables);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.required).toEqual(['name', 'role', 'status']);
    });

    test('identifies missing variables', () => {
      const templateContent = 'Hello {{name}}, your {{role}} is {{status}}.';
      const templatePath = 'test.txt';
      const variables = { name: 'John' }; // missing role and status

      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.validateTemplate(templatePath, variables);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['role', 'status']);
      expect(result.required).toEqual(['name', 'role', 'status']);
    });

    test('handles template with no placeholders', () => {
      const templateContent = 'Static content with no variables.';
      const templatePath = 'static.txt';
      const variables = {};

      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.validateTemplate(templatePath, variables);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.required).toEqual([]);
    });

    test('handles duplicate placeholders correctly', () => {
      const templateContent = 'Hello {{name}}, {{name}} is your username. Welcome {{name}}!';
      const templatePath = 'duplicate.txt';
      const variables = { name: 'John' };

      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.validateTemplate(templatePath, variables);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.required).toEqual(['name']); // Should not duplicate
    });
  });

  describe('extractPlaceholders', () => {
    test('extracts placeholders from content', () => {
      const content = 'Hello {{name}}, your {{role}} is {{status}}.';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual(['name', 'role', 'status']);
    });

    test('handles content with no placeholders', () => {
      const content = 'No placeholders here.';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual([]);
    });

    test('handles duplicate placeholders', () => {
      const content = '{{name}} and {{name}} and {{age}}';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual(['name', 'age']);
    });

    test('handles placeholders with whitespace', () => {
      const content = '{{ name }} and {{  age  }} and {{role}}';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual(['name', 'age', 'role']);
    });

    test('handles complex placeholder names', () => {
      const content = '{{user-name}} {{user_id}} {{var123}} {{CONSTANT}}';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual(['user-name', 'user_id', 'var123', 'CONSTANT']);
    });

    test('handles malformed placeholders gracefully', () => {
      const content = '{{valid}} {invalid} {{also-valid}}';

      const placeholders = templateEngine.extractPlaceholders(content);

      expect(placeholders).toEqual(['valid', 'also-valid']);
    });
  });

  describe('integration tests', () => {
    test('full workflow: process multiple templates with validation', () => {
      const templates = [
        { template: 'config.json', target: '/output/config.json' },
        { template: 'script.js', target: '/output/script.js' }
      ];
      
      const configContent = '{"name": "{{projectName}}", "address": "{{address}}"}';
      const scriptContent = 'const project = "{{projectName}}"; const addr = "{{address}}";';
      
      const variables = { projectName: 'TestDAO', address: '0x123' };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('config.json')) return configContent;
        if (path.includes('script.js')) return scriptContent;
        return '';
      });

      // First validate templates
      const configValidation = templateEngine.validateTemplate('config.json', variables);
      const scriptValidation = templateEngine.validateTemplate('script.js', variables);

      expect(configValidation.valid).toBe(true);
      expect(scriptValidation.valid).toBe(true);

      // Then process templates
      const results = templateEngine.processMultipleTemplates(templates, variables);

      expect(results.every(r => r.success)).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/config.json',
        '{"name": "TestDAO", "address": "0x123"}',
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/output/script.js',
        'const project = "TestDAO"; const addr = "0x123";',
        'utf8'
      );
    });

    test('handles real DataDAO template variables', () => {
      const templateContent = `
const config = {
  dlpName: "{{dlpName}}",
  tokenName: "{{tokenName}}",
  tokenSymbol: "{{tokenSymbol}}",
  network: "{{network}}",
  rpcUrl: "{{rpcUrl}}",
  chainId: {{chainId}},
  contractAddress: "{{address}}"
};
`;
      
      const variables = createMockTemplateVars({
        dlpName: 'MyDataDAO',
        tokenName: 'MyToken',
        tokenSymbol: 'MTK',
        chainId: 14800
      });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(templateContent);

      const result = templateEngine.processTemplate('config.js', variables);

      expect(result).toContain('dlpName: "MyDataDAO"');
      expect(result).toContain('tokenName: "MyToken"');
      expect(result).toContain('tokenSymbol: "MTK"');
      expect(result).toContain('chainId: 14800');
      expect(result).toContain('network: "moksha"');
    });
  });
});