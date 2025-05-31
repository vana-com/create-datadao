const { deriveWalletFromPrivateKey } = require('./wallet');

/**
 * Validates that a field is not empty
 * @param {string} input - The input to validate
 * @returns {boolean|string} True if valid, error message if not
 */
function validateRequired(input) {
  if (!input || !input.trim()) {
    return 'This field is required';
  }
  return true;
}

/**
 * Validates and normalizes a private key
 * @param {string} input - The private key (with or without 0x prefix)
 * @returns {boolean|string} True if valid, error message if not
 */
function validatePrivateKey(input) {
  if (!input || !input.trim()) {
    return 'Private key is required';
  }
  
  // Normalize the key by adding 0x prefix if missing
  const normalizedKey = normalizePrivateKey(input.trim());
  
  // Validate format (0x + 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedKey)) {
    return 'Invalid private key format. Expected 64 hex characters (with or without 0x prefix)';
  }
  
  // Try to derive wallet to ensure it's valid
  try {
    deriveWalletFromPrivateKey(normalizedKey);
    return true;
  } catch (error) {
    return 'Invalid private key: Unable to derive wallet credentials';
  }
}

/**
 * Normalizes a private key by adding 0x prefix if missing
 * @param {string} input - The private key
 * @returns {string} The normalized private key
 */
function normalizePrivateKey(input) {
  return input.startsWith('0x') ? input : '0x' + input;
}

/**
 * Validation functions for specific input types
 */
const validateInput = {
  dlpName: (input) => {
    if (!input || !input.trim()) {
      return 'DataDAO name is required';
    }
    if (input.length < 3) {
      return 'DataDAO name must be at least 3 characters';
    }
    if (input.length > 50) {
      return 'DataDAO name must be less than 50 characters';
    }
    return true;
  },
  
  tokenName: (input) => {
    if (!input || !input.trim()) {
      return 'Token name is required';
    }
    if (input.length < 3) {
      return 'Token name must be at least 3 characters';
    }
    if (input.length > 50) {
      return 'Token name must be less than 50 characters';
    }
    return true;
  },
  
  tokenSymbol: (input) => {
    if (!input || !input.trim()) {
      return 'Token symbol is required';
    }
    if (input.length < 3 || input.length > 5) {
      return 'Token symbol must be 3-5 characters';
    }
    if (!/^[A-Z]+$/.test(input)) {
      return 'Token symbol must be uppercase letters only';
    }
    return true;
  },
  
  privateKey: validatePrivateKey,
  
  required: validateRequired
};

/**
 * Validates the user configuration before proceeding with generation
 * @param {Object} config - User configuration object
 */
function validateConfig(config) {
  // Required fields
  const requiredFields = [
    'dlpName',
    'tokenName',
    'tokenSymbol',
    'privateKey'
  ];

  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate private key format and derivability
  const privateKeyValidation = validatePrivateKey(config.privateKey);
  if (privateKeyValidation !== true) {
    throw new Error(privateKeyValidation);
  }

  // Address and publicKey should be derived automatically, but validate if present
  if (config.address && (!config.address.startsWith('0x') || config.address.length !== 42)) {
    throw new Error('Invalid address format. Must be a 0x-prefixed 40-character hex string');
  }

  if (config.publicKey && !config.publicKey.startsWith('0x')) {
    throw new Error('Invalid public key format. Must be a 0x-prefixed hex string');
  }

  return true;
}

module.exports = {
  validateInput,
  validateConfig,
  validateRequired,
  validatePrivateKey,
  normalizePrivateKey
};