const { VALIDATION_RULES, ERROR_MESSAGES } = require('./constants');
const MessageFormatter = require('./messages');

/**
 * Validation utilities using SSOT rules and error messages
 */
class Validator {

  /**
   * Validate a required field
   * @param {string} input - The input to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateRequired(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.REQUIRED;
    }
    return true;
  }

  /**
   * Validate DataDAO name
   * @param {string} input - The DLP name to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateDlpName(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED;
    }
    
    const rules = VALIDATION_RULES.DLP_NAME;
    if (input.length < rules.minLength) {
      return MessageFormatter.interpolate(
        ERROR_MESSAGES.VALIDATION.DLP_NAME_TOO_SHORT,
        { min: rules.minLength }
      );
    }
    
    if (input.length > rules.maxLength) {
      return MessageFormatter.interpolate(
        ERROR_MESSAGES.VALIDATION.DLP_NAME_TOO_LONG,
        { max: rules.maxLength }
      );
    }
    
    return true;
  }

  /**
   * Validate token name
   * @param {string} input - The token name to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateTokenName(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.TOKEN_NAME_REQUIRED;
    }
    
    const rules = VALIDATION_RULES.TOKEN_NAME;
    if (input.length < rules.minLength) {
      return MessageFormatter.interpolate(
        ERROR_MESSAGES.VALIDATION.TOKEN_NAME_TOO_SHORT,
        { min: rules.minLength }
      );
    }
    
    if (input.length > rules.maxLength) {
      return MessageFormatter.interpolate(
        ERROR_MESSAGES.VALIDATION.TOKEN_NAME_TOO_LONG,
        { max: rules.maxLength }
      );
    }
    
    return true;
  }

  /**
   * Validate token symbol
   * @param {string} input - The token symbol to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateTokenSymbol(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_REQUIRED;
    }
    
    const rules = VALIDATION_RULES.TOKEN_SYMBOL;
    if (input.length < rules.minLength || input.length > rules.maxLength) {
      return MessageFormatter.interpolate(
        ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_LENGTH,
        { min: rules.minLength, max: rules.maxLength }
      );
    }
    
    if (!rules.pattern.test(input)) {
      return ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT;
    }
    
    return true;
  }

  /**
   * Validate and normalize a private key
   * @param {string} input - The private key (with or without 0x prefix)
   * @returns {boolean|string} True if valid, error message if not
   */
  static validatePrivateKey(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_REQUIRED;
    }
    
    // Normalize the key by adding 0x prefix if missing
    const normalizedKey = this.normalizePrivateKey(input.trim());
    
    // Validate format using SSOT pattern
    if (!VALIDATION_RULES.PRIVATE_KEY.pattern.test(normalizedKey)) {
      return ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_FORMAT;
    }
    
    // Try to derive wallet to ensure it's valid (this would need wallet utility)
    try {
      // TODO: Add wallet derivation check when wallet utility is ported
      // deriveWalletFromPrivateKey(normalizedKey);
      return true;
    } catch (error) {
      return ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_INVALID;
    }
  }

  /**
   * Normalize a private key by adding 0x prefix if missing
   * @param {string} input - The private key
   * @returns {string} The normalized private key
   */
  static normalizePrivateKey(input) {
    if (!input || typeof input !== 'string') {
      throw new Error(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_STRING);
    }
    return input.startsWith('0x') ? input : '0x' + input;
  }

  /**
   * Validate GitHub username
   * @param {string} input - The GitHub username
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateGithubUsername(input) {
    if (!input || !input.trim()) {
      return ERROR_MESSAGES.VALIDATION.GITHUB_USERNAME_REQUIRED;
    }
    
    const rules = VALIDATION_RULES.GITHUB_USERNAME;
    if (input.length < rules.minLength) {
      return ERROR_MESSAGES.VALIDATION.GITHUB_USERNAME_REQUIRED;
    }
    
    return true;
  }

  /**
   * Validate API key (generic for Pinata, Google, etc.)
   * @param {string} input - The API key
   * @param {string} service - Service name for error message
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateApiKey(input, service = 'API Key') {
    if (!input || !input.trim()) {
      // Return appropriate error based on service
      switch (service.toLowerCase()) {
        case 'pinata':
          return ERROR_MESSAGES.VALIDATION.PINATA_KEY_REQUIRED;
        case 'pinata secret':
          return ERROR_MESSAGES.VALIDATION.PINATA_SECRET_REQUIRED;
        case 'google client id':
          return ERROR_MESSAGES.VALIDATION.GOOGLE_CLIENT_ID_REQUIRED;
        case 'google client secret':
          return ERROR_MESSAGES.VALIDATION.GOOGLE_CLIENT_SECRET_REQUIRED;
        default:
          return ERROR_MESSAGES.VALIDATION.REQUIRED;
      }
    }
    
    const rules = VALIDATION_RULES.API_KEY;
    if (input.length < rules.minLength) {
      return ERROR_MESSAGES.VALIDATION.REQUIRED;
    }
    
    return true;
  }

  /**
   * Validate Ethereum address format
   * @param {string} input - The address to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateAddress(input) {
    if (!input || !input.startsWith('0x') || input.length !== 42) {
      return ERROR_MESSAGES.VALIDATION.ADDRESS_FORMAT;
    }
    return true;
  }

  /**
   * Validate public key format
   * @param {string} input - The public key to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validatePublicKey(input) {
    if (!input || !input.startsWith('0x')) {
      return ERROR_MESSAGES.VALIDATION.PUBLIC_KEY_FORMAT;
    }
    return true;
  }

  /**
   * Validate a complete configuration object
   * @param {Object} config - The configuration to validate
   * @returns {boolean|string} True if valid, error message if not
   */
  static validateConfig(config) {
    // Required fields (from constants)
    const requiredFields = [
      'dlpName',
      'tokenName', 
      'tokenSymbol',
      'privateKey',
      'pinataApiKey',
      'pinataApiSecret',
      'googleClientId',
      'googleClientSecret',
      'githubUsername'
    ];

    // Check for missing fields
    for (const field of requiredFields) {
      if (!config[field]) {
        return MessageFormatter.interpolate(
          ERROR_MESSAGES.CONFIG.MISSING_FIELD,
          { field }
        );
      }
    }

    // Validate individual fields
    const validations = [
      ['dlpName', this.validateDlpName(config.dlpName)],
      ['tokenName', this.validateTokenName(config.tokenName)],
      ['tokenSymbol', this.validateTokenSymbol(config.tokenSymbol)],
      ['privateKey', this.validatePrivateKey(config.privateKey)],
      ['githubUsername', this.validateGithubUsername(config.githubUsername)],
      ['pinataApiKey', this.validateApiKey(config.pinataApiKey, 'pinata')],
      ['pinataApiSecret', this.validateApiKey(config.pinataApiSecret, 'pinata secret')],
      ['googleClientId', this.validateApiKey(config.googleClientId, 'google client id')],
      ['googleClientSecret', this.validateApiKey(config.googleClientSecret, 'google client secret')]
    ];

    for (const [field, result] of validations) {
      if (result !== true) {
        return `${field}: ${result}`;
      }
    }

    // Validate derived fields if present
    if (config.address) {
      const addressValidation = this.validateAddress(config.address);
      if (addressValidation !== true) {
        return `address: ${addressValidation}`;
      }
    }

    if (config.publicKey) {
      const publicKeyValidation = this.validatePublicKey(config.publicKey);
      if (publicKeyValidation !== true) {
        return `publicKey: ${publicKeyValidation}`;
      }
    }

    return true;
  }

  /**
   * Get validation function for a specific field
   * @param {string} field - Field name
   * @returns {Function} Validation function
   */
  static getValidator(field) {
    const validators = {
      dlpName: this.validateDlpName,
      tokenName: this.validateTokenName,
      tokenSymbol: this.validateTokenSymbol,
      privateKey: this.validatePrivateKey,
      githubUsername: this.validateGithubUsername,
      pinataApiKey: (input) => this.validateApiKey(input, 'pinata'),
      pinataApiSecret: (input) => this.validateApiKey(input, 'pinata secret'),
      googleClientId: (input) => this.validateApiKey(input, 'google client id'),
      googleClientSecret: (input) => this.validateApiKey(input, 'google client secret'),
      required: this.validateRequired
    };

    return validators[field] || this.validateRequired;
  }
}

module.exports = Validator; 