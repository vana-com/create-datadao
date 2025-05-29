const { createPublicClient, http, parseAbi } = require('viem');
const { moksha } = require('viem/chains');
const chalk = require('chalk');

// DLP Registry contract ABI (minimal for our needs)
const DLP_REGISTRY_ABI = parseAbi([
  'function registerDlp((address dlpAddress, address ownerAddress, address treasuryAddress, string name, string iconUrl, string website, string metadata)) external payable returns (uint256)',
  'function dlpIds(address dlpAddress) external view returns (uint256)'
]);

// QueryEngine contract ABI for encryption keys
const QUERY_ENGINE_ABI = parseAbi([
  'function dlpPubKeys(uint256 dlpId) external view returns (string memory)'
]);

const DLP_REGISTRY_ADDRESS = '0x4D59880a924526d1dD33260552Ff4328b1E18a43';
const QUERY_ENGINE_ADDRESS = '0xd25Eb66EA2452cf3238A2eC6C1FD1B7F5B320490';

const client = createPublicClient({
  chain: moksha,
  transport: http('https://rpc.moksha.vana.org')
});

/**
 * Poll for encryption key from blockchain
 */
async function pollEncryptionKey(dlpId, maxAttempts = 60) {
  console.log(chalk.blue(`🔑 Polling for encryption key (dlpId: ${dlpId})...`));

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const key = await client.readContract({
        address: QUERY_ENGINE_ADDRESS,
        abi: QUERY_ENGINE_ABI,
        functionName: 'dlpPubKeys',
        args: [BigInt(dlpId)]
      });

      if (key && key !== '') {
        console.log(chalk.green('✅ Encryption key retrieved!'));
        return key;
      }

      const remaining = maxAttempts - i - 1;
      console.log(chalk.yellow(`⏳ Waiting for encryption key... (${remaining} attempts remaining)`));

      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second intervals
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Error polling encryption key: ${error.message}`));
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  throw new Error('Encryption key not available after 30 minutes. Please check your dlpId or try again later.');
}

/**
 * Get dlpId for a given DLP address
 */
async function getDlpId(dlpAddress) {
  try {
    const dlpId = await client.readContract({
      address: DLP_REGISTRY_ADDRESS,
      abi: DLP_REGISTRY_ABI,
      functionName: 'dlpIds',
      args: [dlpAddress]
    });

    return Number(dlpId);
  } catch (error) {
    throw new Error(`Failed to get dlpId: ${error.message}`);
  }
}

/**
 * Extract refinerId from transaction logs
 */
async function extractRefinerIdFromLogs(txHash) {
  try {
    const client = createPublicClient({
      chain: moksha,
      transport: http()
    });

    console.log(chalk.blue(`🔍 Extracting refinerId from transaction: ${txHash}`));
    
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    
    // Look for RefinerAdded event
    const refinerAddedEvent = receipt.logs.find(log => {
      // RefinerAdded event signature: RefinerAdded(uint256 indexed refinerId, ...)
      return log.topics[0] === '0x...' || // Add actual event signature hash
             log.data.includes('RefinerAdded');
    });

    if (refinerAddedEvent) {
      // Extract refinerId from the first topic (after event signature)
      const refinerId = parseInt(refinerAddedEvent.topics[1], 16);
      console.log(chalk.green(`✅ Found refinerId: ${refinerId}`));
      return refinerId;
    }

    throw new Error('RefinerAdded event not found in transaction logs');
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not extract refinerId automatically: ${error.message}`));
    return null;
  }
}

/**
 * Wait for transaction confirmation and extract refinerId
 */
async function waitForRefinerRegistration(txHash, maxWaitTime = 300000) { // 5 minutes
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const refinerId = await extractRefinerIdFromLogs(txHash);
      if (refinerId !== null) {
        return refinerId;
      }
    } catch (error) {
      // Transaction might not be confirmed yet
    }
    
    console.log(chalk.blue('⏳ Waiting for transaction confirmation...'));
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }
  
  throw new Error('Transaction confirmation timeout');
}

module.exports = {
  pollEncryptionKey,
  getDlpId,
  extractRefinerIdFromLogs,
  waitForRefinerRegistration
};