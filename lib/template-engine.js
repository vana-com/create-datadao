const fs = require('fs-extra');
const path = require('path');

/**
 * Lightweight template engine for processing file templates
 * Uses mustache-style {{variable}} placeholders
 */
class TemplateEngine {
  constructor(templatesDir = path.join(__dirname, '..', 'src', 'templates')) {
    this.templatesDir = templatesDir;
  }

  /**
   * Process a template file with given variables
   * @param {string} templatePath - Path to template file (relative to templates directory)
   * @param {object} variables - Variables to substitute in template
   * @returns {string} Processed template content
   */
  processTemplate(templatePath, variables = {}) {
    const fullTemplatePath = path.join(this.templatesDir, templatePath);
    
    if (!fs.existsSync(fullTemplatePath)) {
      throw new Error(`Template file not found: ${fullTemplatePath}`);
    }

    let content = fs.readFileSync(fullTemplatePath, 'utf8');
    
    // Replace all {{variable}} placeholders
    content = this.replacePlaceholders(content, variables);
    
    return content;
  }

  /**
   * Process a template and write it to a target file
   * @param {string} templatePath - Path to template file
   * @param {string} targetPath - Target file path
   * @param {object} variables - Variables to substitute
   */
  processTemplateToFile(templatePath, targetPath, variables = {}) {
    const processedContent = this.processTemplate(templatePath, variables);
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    fs.ensureDirSync(targetDir);
    
    fs.writeFileSync(targetPath, processedContent, 'utf8');
  }

  /**
   * Replace {{variable}} placeholders with actual values
   * @param {string} content - Template content
   * @param {object} variables - Variables to substitute
   * @returns {string} Content with placeholders replaced
   */
  replacePlaceholders(content, variables) {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      
      if (variables.hasOwnProperty(trimmedName)) {
        return variables[trimmedName];
      }
      
      // If variable not found, log warning and keep placeholder
      console.warn(`Warning: Variable '${trimmedName}' not found, keeping placeholder`);
      return match;
    });
  }

  /**
   * Process multiple templates at once
   * @param {Array} templates - Array of {template, target, variables?} objects
   * @param {object} globalVariables - Variables to apply to all templates
   */
  processMultipleTemplates(templates, globalVariables = {}) {
    const results = [];
    
    for (const templateConfig of templates) {
      const {
        template,
        target,
        variables: localVariables = {}
      } = templateConfig;
      
      // Merge global and local variables (local takes precedence)
      const mergedVariables = { ...globalVariables, ...localVariables };
      
      try {
        this.processTemplateToFile(template, target, mergedVariables);
        results.push({ template, target, success: true });
      } catch (error) {
        results.push({ template, target, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Get default configuration variables for Vana network
   * @returns {object} Default variables
   */
  getDefaultVanaConfig() {
    return {
      // Core contract addresses (Moksha testnet)
      DLP_REGISTRY_CONTRACT_ADDRESS: '0x4D59880a924526d1dD33260552Ff4328b1E18a43',
      DATA_REGISTRY_CONTRACT_ADDRESS: '0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C',
      TEE_POOL_CONTRACT_ADDRESS: '0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A',
      DAT_FACTORY_CONTRACT_ADDRESS: '0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB',
      
      // External dependencies
      TRUSTED_FORWARDER_ADDRESS: '0x0000000000000000000000000000000000000000',
      
      // Vana mainnet
      VANA_RPC_URL: 'http://rpc.vana.org',
      VANA_API_URL: 'https://vanascan.io/api',
      VANA_BROWSER_URL: 'https://vanascan.io',
      
      // Moksha testnet
      MOKSHA_RPC_URL: 'https://rpc.moksha.vana.org',
      MOKSHA_API_URL: 'https://moksha.vanascan.io/api',
      MOKSHA_BROWSER_URL: 'https://moksha.vanascan.io'
    };
  }

  /**
   * Validate that all required variables are provided
   * @param {string} templatePath - Path to template file
   * @param {object} variables - Variables to check
   * @returns {object} Validation result with missing variables
   */
  validateTemplate(templatePath, variables) {
    const content = fs.readFileSync(path.join(this.templatesDir, templatePath), 'utf8');
    const placeholders = this.extractPlaceholders(content);
    const missing = placeholders.filter(placeholder => !variables.hasOwnProperty(placeholder));
    
    return {
      valid: missing.length === 0,
      missing,
      required: placeholders
    };
  }

  /**
   * Extract all placeholders from template content
   * @param {string} content - Template content
   * @returns {Array} Array of placeholder names
   */
  extractPlaceholders(content) {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(match => 
      match.replace(/[{}]/g, '').trim()
    ))];
  }
}

module.exports = TemplateEngine; 