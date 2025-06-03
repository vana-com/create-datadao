const { privateKeyToAccount } = require('viem/accounts');

/**
 * Derive wallet address and public key from private key using viem
 * @param {string} privateKey - The private key (0x-prefixed)
 * @returns {Object} Object containing address and publicKey
 */
function deriveWalletFromPrivateKey(privateKey) {
  try {
    // Normalize private key by adding 0x prefix if missing
    const normalizedKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
    
    // Validate private key format
    if (!/^0x[a-fA-F0-9]{64}$/.test(normalizedKey)) {
      throw new Error('Invalid private key format. Must be a 64-character hex string');
    }

    // Create account from private key
    const account = privateKeyToAccount(normalizedKey);

    // Extract address and public key
    const address = account.address;
    const publicKey = account.publicKey;

    return {
      address,
      publicKey
    };
  } catch (error) {
    throw new Error(`Failed to derive wallet from private key: ${error.message}`);
  }
}

/**
 * Validate that a private key can be used to derive a wallet
 * @param {string} privateKey - The private key to validate
 * @returns {boolean} True if valid
 */
function validatePrivateKey(privateKey) {
  try {
    deriveWalletFromPrivateKey(privateKey);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  deriveWalletFromPrivateKey,
  validatePrivateKey
};