const { validatePrivateKey } = require('./wallet');

/**
 * Validates the user configuration before proceeding with generation
 * @param {Object} config - User configuration object
 */
function validateInput(config) {
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
  if (!validatePrivateKey(config.privateKey)) {
    throw new Error('Invalid private key format or unable to derive wallet credentials');
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
  validateInput
};