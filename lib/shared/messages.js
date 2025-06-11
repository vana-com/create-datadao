const { MESSAGES, ERROR_MESSAGES, SYMBOLS } = require('./constants');

/**
 * Message formatting utilities
 * Provides clean access to SSOT messages with parameter interpolation
 */
class MessageFormatter {
  
  /**
   * Interpolate variables in a message string
   * @param {string} template - Template string with {variable} placeholders
   * @param {Object} variables - Object with variable values
   * @returns {string} Interpolated string
   */
  static interpolate(template, variables = {}) {
    if (!template || typeof template !== 'string') {
      return template;
    }
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * Get a formatted message with optional variable interpolation
   * @param {string} path - Dot-separated path to message (e.g., 'STEPS.GITHUB_REPOS.TITLE')
   * @param {Object} variables - Variables for interpolation
   * @returns {string} Formatted message
   */
  static getMessage(path, variables = {}) {
    const parts = path.split('.');
    let message = MESSAGES;
    
    for (const part of parts) {
      if (message && typeof message === 'object' && message[part] !== undefined) {
        message = message[part];
      } else {
        return `[Missing message: ${path}]`;
      }
    }
    
    if (typeof message !== 'string') {
      return `[Invalid message type: ${path}]`;
    }
    
    return this.interpolate(message, variables);
  }

  /**
   * Get a formatted error message with optional variable interpolation
   * @param {string} path - Dot-separated path to error message
   * @param {Object} variables - Variables for interpolation
   * @returns {string} Formatted error message
   */
  static getError(path, variables = {}) {
    const parts = path.split('.');
    let message = ERROR_MESSAGES;
    
    for (const part of parts) {
      if (message && typeof message === 'object' && message[part] !== undefined) {
        message = message[part];
      } else {
        return `[Missing error: ${path}]`;
      }
    }
    
    if (typeof message !== 'string') {
      return `[Invalid error type: ${path}]`;
    }
    
    return this.interpolate(message, variables);
  }

  /**
   * Format a step title with appropriate symbol
   * @param {string} title - The step title
   * @returns {string} Formatted step title
   */
  static stepTitle(title) {
    return `${SYMBOLS.STEP} ${title}`;
  }

  /**
   * Format a success message with appropriate symbol
   * @param {string} message - The success message
   * @returns {string} Formatted success message
   */
  static success(message) {
    return `${SYMBOLS.SUCCESS} ${message}`;
  }

  /**
   * Format an error message with appropriate symbol
   * @param {string} message - The error message
   * @returns {string} Formatted error message
   */
  static error(message) {
    return `${SYMBOLS.ERROR} ${message}`;
  }

  /**
   * Format a warning message with appropriate symbol
   * @param {string} message - The warning message
   * @returns {string} Formatted warning message
   */
  static warning(message) {
    return `${SYMBOLS.WARNING} ${message}`;
  }

  /**
   * Format an info message with appropriate symbol
   * @param {string} message - The info message
   * @returns {string} Formatted info message
   */
  static info(message) {
    return `${SYMBOLS.INFO} ${message}`;
  }

  /**
   * Format a progress message with appropriate symbol
   * @param {string} message - The progress message
   * @returns {string} Formatted progress message
   */
  static progress(message) {
    return `${SYMBOLS.PROGRESS} ${message}`;
  }

  /**
   * Format a section header with appropriate symbol
   * @param {string} title - The section title
   * @returns {string} Formatted section header
   */
  static sectionHeader(title) {
    return `${SYMBOLS.CLIPBOARD} ${title}`;
  }

  /**
   * Format next steps with appropriate symbols
   * @param {Array<string>} steps - Array of step descriptions
   * @returns {Array<string>} Formatted steps with numbering
   */
  static nextSteps(steps) {
    return steps.map((step, index) => `  ${index + 1}. ${step}`);
  }

  /**
   * Format a bullet list
   * @param {Array<string>} items - Array of items
   * @returns {Array<string>} Formatted bullet list
   */
  static bulletList(items) {
    return items.map(item => `  ${SYMBOLS.BULLET} ${item}`);
  }

  /**
   * Format manual commands list
   * @param {string} projectName - Project name for command interpolation
   * @returns {Array<string>} Formatted command list
   */
  static manualCommands(projectName) {
    return MESSAGES.OPERATIONS.MANUAL_COMMANDS.map(cmd => 
      `  ${this.interpolate(cmd, { projectName })}`
    );
  }

  /**
   * Format UI testing instructions
   * @param {string} targetDir - Target directory path
   * @returns {Array<string>} Formatted instruction list
   */
  static uiTestingInstructions(targetDir) {
    return MESSAGES.STEPS.UI_TEST.INSTRUCTIONS.map((instruction, index) => 
      `${index + 1}. ${this.interpolate(instruction, { targetDir })}`
    );
  }

  /**
   * Format wallet instruction steps
   * @returns {Array<string>} Formatted instruction steps
   */
  static walletInstructions() {
    return MESSAGES.WALLET.INSTRUCTIONS.STEPS.map((step, index) => 
      `${index + 1}. ${step}`
    );
  }

  /**
   * Create a divider line
   * @param {number} length - Length of the divider (default 50)
   * @returns {string} Divider line
   */
  static divider(length = 50) {
    return SYMBOLS.DIVIDER.repeat(length);
  }

  /**
   * Format a summary item
   * @param {string} status - Status symbol (SUCCESS, WARNING, etc.)
   * @param {string} description - Item description
   * @returns {string} Formatted summary item
   */
  static summaryItem(status, description) {
    const symbol = SYMBOLS[status] || SYMBOLS.INFO;
    return `  ${symbol} ${description}`;
  }
}

module.exports = MessageFormatter; 