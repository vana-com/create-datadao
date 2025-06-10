/**
 * Additional tests for uncovered lines in template-engine.js
 * Current coverage: 97.5%
 * Target: 100% coverage
 * 
 * Uncovered lines: 19,40,151
 */

const TemplateEngine = require('../../lib/template-engine');
const fs = require('fs-extra');
const path = require('path');

// Mock fs-extra
jest.mock('fs-extra');

describe('TemplateEngine - Additional Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset console.warn mock
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe('constructor - edge cases', () => {
    test('uses default templateDir when none provided', () => {
      const engine = new TemplateEngine();
      expect(engine.templatesDir).toBe(path.join(__dirname, '..', '..', 'lib', 'templates'));
    });

    test('uses provided templateDir when specified', () => {
      const customDir = '/custom/templates';
      const engine = new TemplateEngine(customDir);
      expect(engine.templatesDir).toBe(customDir);
    });

    test('handles relative template directories', () => {
      const relativeDir = './templates';
      const engine = new TemplateEngine(relativeDir);
      expect(engine.templatesDir).toBe(relativeDir);
    });

    test('handles absolute template directories', () => {
      const absoluteDir = '/absolute/path/templates';
      const engine = new TemplateEngine(absoluteDir);
      expect(engine.templatesDir).toBe(absoluteDir);
    });

    test('handles non-existent template directories gracefully', () => {
      const nonExistentDir = '/nonexistent/templates';
      const engine = new TemplateEngine(nonExistentDir);
      expect(engine.templatesDir).toBe(nonExistentDir);
      // Constructor doesn't validate directory existence, just stores it
    });
  });

  describe('processTemplate - missing variables', () => {
    test('warns when variable is not found in replacement map (line 65)', () => {
      const engine = new TemplateEngine();
      
      // Mock file system
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('Hello {{name}}, welcome to {{project}}!');

      // Process template with missing variable
      const result = engine.processTemplate('test.template', { name: 'John' });

      expect(console.warn).toHaveBeenCalledWith("Warning: Variable 'project' not found, keeping placeholder");
      expect(result).toBe('Hello John, welcome to {{project}}!');
    });

    test('logs warning to console for missing variables', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{{missing}} variable test');

      engine.processTemplate('test.template', {});

      expect(console.warn).toHaveBeenCalledWith("Warning: Variable 'missing' not found, keeping placeholder");
    });

    test('continues processing despite missing variables', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{{found}} and {{missing}} variables');

      const result = engine.processTemplate('test.template', { found: 'FOUND' });

      expect(result).toBe('FOUND and {{missing}} variables');
      expect(console.warn).toHaveBeenCalledWith("Warning: Variable 'missing' not found, keeping placeholder");
    });

    test('preserves placeholder when variable is missing', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{{placeholder}}');

      const result = engine.processTemplate('test.template', {});

      expect(result).toBe('{{placeholder}}');
    });

    test('handles multiple missing variables', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{{var1}} {{var2}} {{var3}}');

      const result = engine.processTemplate('test.template', { var2: 'FOUND' });

      expect(result).toBe('{{var1}} FOUND {{var3}}');
      expect(console.warn).toHaveBeenCalledWith("Warning: Variable 'var1' not found, keeping placeholder");
      expect(console.warn).toHaveBeenCalledWith("Warning: Variable 'var3' not found, keeping placeholder");
      expect(console.warn).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractPlaceholders - edge cases', () => {
    test('returns empty array when no placeholders found (line 151)', () => {
      const engine = new TemplateEngine();
      
      // Test content with no placeholders
      const result = engine.extractPlaceholders('This is plain text with no variables');
      
      expect(result).toEqual([]);
    });

    test('returns empty array for empty content', () => {
      const engine = new TemplateEngine();
      
      const result = engine.extractPlaceholders('');
      
      expect(result).toEqual([]);
    });

    test('returns empty array for content with malformed placeholders', () => {
      const engine = new TemplateEngine();
      
      const result = engine.extractPlaceholders('This has {incomplete} and {also incomplete placeholders');
      
      expect(result).toEqual([]);
    });

    test('handles content with only single braces', () => {
      const engine = new TemplateEngine();
      
      const result = engine.extractPlaceholders('This has {single} braces only');
      
      expect(result).toEqual([]);
    });

    test('extracts placeholders correctly when they exist', () => {
      const engine = new TemplateEngine();
      
      const result = engine.extractPlaceholders('Hello {{name}}, welcome to {{project}}!');
      
      expect(result).toEqual(['name', 'project']);
    });
  });

  describe('validateTemplate - error handling', () => {
    test('handles file read errors gracefully', () => {
      const engine = new TemplateEngine();
      
      // Mock fs to throw an error
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => engine.validateTemplate('nonexistent.template', {})).toThrow('File not found');
    });

    test('provides descriptive error message for missing templates', () => {
      const engine = new TemplateEngine();
      
      fs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => engine.validateTemplate('missing.template', {})).toThrow('ENOENT: no such file or directory');
    });

    test('handles permission errors gracefully', () => {
      const engine = new TemplateEngine();
      
      fs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => engine.validateTemplate('restricted.template', {})).toThrow('EACCES: permission denied');
    });

    test('handles corrupted template files', () => {
      const engine = new TemplateEngine();
      
      // Mock corrupted file that causes parsing issues - malformed placeholders won't be extracted
      fs.readFileSync.mockReturnValue('{{valid}} but also {{malformed');

      const result = engine.validateTemplate('corrupted.template', { valid: 'test' });
      
      expect(result.valid).toBe(true); // Only 'valid' placeholder is extracted, and it's provided
      expect(result.required).toEqual(['valid']); // Only the properly formed placeholder is found
      expect(result.missing).toEqual([]); // No missing variables since malformed ones aren't extracted
    });
  });

  describe('comprehensive template processing', () => {
    test('processes templates with all variable types', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('String: {{str}}, Number: {{num}}, Boolean: {{bool}}, Object: {{obj}}');

      const variables = {
        str: 'hello',
        num: 42,
        bool: true,
        obj: { key: 'value' }
      };

      const result = engine.processTemplate('test.template', variables);
      
      expect(result).toBe('String: hello, Number: 42, Boolean: true, Object: [object Object]');
    });

    test('handles nested template directories', () => {
      const engine = new TemplateEngine('/templates/nested/deep');
      
      expect(engine.templatesDir).toBe('/templates/nested/deep');
    });

    test('processes templates with special characters', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('Special chars: {{special}} and unicode: {{unicode}}');

      const variables = {
        special: '@#$%^&*()',
        unicode: '🎉💻🚀'
      };

      const result = engine.processTemplate('test.template', variables);
      
      expect(result).toBe('Special chars: @#$%^&*() and unicode: 🎉💻🚀');
    });

    test('handles very large template files', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      
      // Create a large template content
      const largeContent = 'Start {{var}} ' + 'x'.repeat(10000) + ' {{var}} End';
      fs.readFileSync.mockReturnValue(largeContent);

      const result = engine.processTemplate('large.template', { var: 'VALUE' });
      
      expect(result).toBe('Start VALUE ' + 'x'.repeat(10000) + ' VALUE End');
    });

    test('handles templates with no placeholders', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('This is just plain text with no variables at all.');

      const result = engine.processTemplate('plain.template', { unused: 'value' });
      
      expect(result).toBe('This is just plain text with no variables at all.');
    });

    test('processes templates with processTemplateToFile', () => {
      const engine = new TemplateEngine();
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('Hello {{name}}!');
      fs.ensureDirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});

      engine.processTemplateToFile('input.template', '/output/test.txt', { name: 'World' });
      
      expect(fs.ensureDirSync).toHaveBeenCalledWith('/output');
      expect(fs.writeFileSync).toHaveBeenCalledWith('/output/test.txt', 'Hello World!', 'utf8');
    });
  });
});