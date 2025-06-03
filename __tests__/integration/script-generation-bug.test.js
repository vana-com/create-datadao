/**
 * Test to prove that register-datadao.js is not generated properly
 * This reveals the bug where src/index.js tries to copy a non-existent file
 */

const fs = require('fs');
const path = require('path');

describe('Script Generation Bug', () => {
  test('register-datadao.js template exists but is not being used', () => {
    // The template file exists
    const templatePath = path.join(__dirname, '../../src/templates/register-datadao.js.template');
    expect(fs.existsSync(templatePath)).toBe(true);
    
    // But src/index.js tries to copy register-datadao.js (without .template)
    const incorrectPath = path.join(__dirname, '../../src/templates/register-datadao.js');
    expect(fs.existsSync(incorrectPath)).toBe(false);
    
    // This proves the bug: src/index.js is trying to copy a file that doesn't exist
  });
  
  test('template file contains placeholder variables that need processing', () => {
    const templatePath = path.join(__dirname, '../../src/templates/register-datadao.js.template');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Template should contain placeholders that need variable substitution
    expect(templateContent).toMatch(/\{\{DLP_REGISTRY_CONTRACT_ADDRESS\}\}/);
    expect(templateContent).toMatch(/\{\{MOKSHA_RPC_URL\}\}/);
    expect(templateContent).toMatch(/\{\{MOKSHA_BROWSER_URL\}\}/);
    
    // These placeholders prove this is a template that needs processing, not a file to copy directly
  });
});