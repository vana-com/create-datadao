/**
 * Formatting utilities for DataDAO project names and tokens
 */

/**
 * Convert project name to proper DataDAO name
 * @param {string} projectName - The project name to format
 * @returns {string} Formatted DataDAO name
 */
function formatDataDAOName(projectName) {
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
function formatTokenName(projectName) {
  const formatted = formatDataDAOName(projectName);
  return formatted.endsWith('DAO') ? formatted.replace('DAO', 'Token') : formatted + 'Token';
}

/**
 * Convert project name to token symbol
 * @param {string} projectName - The project name to format
 * @returns {string} Formatted token symbol (3-4 characters)
 */
function formatTokenSymbol(projectName) {
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

module.exports = {
  formatDataDAOName,
  formatTokenName,
  formatTokenSymbol
}; 