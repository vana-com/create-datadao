/**
 * Formatting utilities for DataDAO project names and tokens
 * Extracted from original formatting.js and enhanced for clean architecture
 */
class Formatter {

  /**
   * Convert project name to proper DataDAO name
   * @param {string} projectName - The project name to format
   * @returns {string} Formatted DataDAO name
   */
  static formatDataDAOName(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      return '';
    }

    return projectName
      .split(/[-_\s]+/)
      .map(word => {
        const lowerWord = word.toLowerCase();
        
        // Special case for "dao" - always capitalize it as "DAO"
        if (lowerWord === 'dao') {
          return 'DAO';
        }
        
        // Handle words ending with "dao" (like "datadao")
        if (lowerWord.endsWith('dao') && lowerWord.length > 3) {
          const prefix = word.slice(0, -3);
          return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + 'DAO';
        }
        
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Convert project name to token name
   * @param {string} projectName - The project name to format
   * @returns {string} Formatted token name
   */
  static formatTokenName(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      return 'Token';
    }

    const formatted = this.formatDataDAOName(projectName);
    return formatted.endsWith('DAO') ? formatted.replace('DAO', 'Token') : formatted + 'Token';
  }

  /**
   * Convert project name to token symbol
   * @param {string} projectName - The project name to format
   * @returns {string} Formatted token symbol (3-10 characters)
   */
  static formatTokenSymbol(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      return 'TKN';
    }

    // Take first letter of each word, max 4 characters
    const words = projectName.split(/[-_\s]+/);
    let symbol = '';
    
    for (const word of words) {
      if (symbol.length < 4 && word.length > 0) {
        symbol += word.charAt(0).toUpperCase();
      }
    }
    
    // If we don't have enough characters, pad with 'T' for Token
    while (symbol.length < 3) {
      symbol += 'T';
    }

    // If we have more than 10 characters, truncate to 10 characters
    if (symbol.length > 10) {
      symbol = symbol.slice(0, 10);
    }
    
    return symbol;
  }

  /**
   * Format a project name to be file-system safe
   * @param {string} projectName - The project name to format
   * @returns {string} File-system safe project name
   */
  static formatProjectDirectory(projectName) {
    if (!projectName || typeof projectName !== 'string') {
      return 'my-datadao';
    }

    return projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[-_]+/g, '-') // Normalize multiple hyphens/underscores
      .replace(/^[-_]+|[-_]+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Number of bytes
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Human readable size
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format duration in milliseconds to human readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Human readable duration
   */
  static formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  /**
   * Format an Ethereum address for display (truncated with ellipsis)
   * @param {string} address - The Ethereum address
   * @param {number} startChars - Number of characters to show at start (default: 6)
   * @param {number} endChars - Number of characters to show at end (default: 4)
   * @returns {string} Formatted address
   */
  static formatAddress(address, startChars = 6, endChars = 4) {
    if (!address || typeof address !== 'string' || address.length < 10) {
      return address;
    }
    
    if (address.length <= startChars + endChars) {
      return address;
    }
    
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  /**
   * Format a transaction hash for display (truncated with ellipsis)
   * @param {string} txHash - The transaction hash
   * @param {number} startChars - Number of characters to show at start (default: 8)
   * @param {number} endChars - Number of characters to show at end (default: 6)
   * @returns {string} Formatted transaction hash
   */
  static formatTxHash(txHash, startChars = 8, endChars = 6) {
    return this.formatAddress(txHash, startChars, endChars);
  }

  /**
   * Format a number with thousand separators
   * @param {number} num - The number to format
   * @returns {string} Formatted number
   */
  static formatNumber(num) {
    if (typeof num !== 'number') {
      return '0';
    }
    
    return num.toLocaleString();
  }

  /**
   * Format a percentage with specified decimal places
   * @param {number} value - The value (0-1 for percentage)
   * @param {number} decimals - Number of decimal places (default: 1)
   * @returns {string} Formatted percentage
   */
  static formatPercentage(value, decimals = 1) {
    if (typeof value !== 'number') {
      return '0%';
    }
    
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Capitalize first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  static capitalize(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert camelCase or PascalCase to kebab-case
   * @param {string} str - String to convert
   * @returns {string} Kebab-case string
   */
  static camelToKebab(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Convert kebab-case to camelCase
   * @param {string} str - String to convert
   * @returns {string} CamelCase string
   */
  static kebabToCamel(str) {
    if (!str || typeof str !== 'string') {
      return '';
    }
    
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Pluralize a word based on count
   * @param {number} count - The count
   * @param {string} singular - Singular form
   * @param {string} plural - Plural form (optional, defaults to singular + 's')
   * @returns {string} Pluralized string with count
   */
  static pluralize(count, singular, plural = null) {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
  }
}

module.exports = Formatter; 