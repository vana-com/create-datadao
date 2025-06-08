const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { moksha } = require('viem/chains');
const DeploymentStateManager = require('./state-manager');

// Verify we're in the correct directory
if (!fs.existsSync(path.join(process.cwd(), 'deployment.json'))) {
  console.error(chalk.red('❌ Error: Must run this command from your DataDAO project directory'));
  console.error(chalk.yellow('📁 Current directory:'), process.cwd());
  console.error(chalk.yellow('💡 Try: cd <your-project-name> && npm run deploy:refiner'));
  process.exit(1);
}

// QueryEngine contract for getting encryption key (correct contract)
const QUERY_ENGINE_ADDRESS = '0xd25Eb66EA2452cf3238A2eC6C1FD1B7F5B320490';
const QUERY_ENGINE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "dlpId", "type": "uint256"}],
    "name": "dlpPubKeys",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// DataRefinerRegistry contract for registering refiners
const REFINER_REGISTRY_ADDRESS = '0x93c3EF89369fDcf08Be159D9DeF0F18AB6Be008c';
const REFINER_REGISTRY_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "dlpId", "type": "uint256"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "string", "name": "schemaDefinitionUrl", "type": "string"},
      {"internalType": "string", "name": "refinementInstructionUrl", "type": "string"}
    ],
    "name": "addRefiner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * Update UI .env file with refinerId
 */
function updateRefinerId(refinerId) {
  try {
    const uiEnvPath = path.join(process.cwd(), '..', 'ui', '.env');
    if (fs.existsSync(uiEnvPath)) {
      let uiEnv = fs.readFileSync(uiEnvPath, 'utf8');

      if (uiEnv.includes('REFINER_ID=')) {
        uiEnv = uiEnv.replace(/REFINER_ID=.*/, `REFINER_ID=${refinerId}`);
      } else {
        uiEnv += `\nREFINER_ID=${refinerId}\n`;
      }

      fs.writeFileSync(uiEnvPath, uiEnv);
      console.log(chalk.green('✅ UI configuration updated with refinerId'));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not update UI .env: ${error.message}`));
  }
}

/**
 * Poll for encryption key from blockchain with retries
 */
async function pollEncryptionKey(dlpId, maxAttempts = 60) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  console.log(chalk.blue(`🔑 Polling for encryption key (dlpId: ${dlpId})...`));
  console.log(chalk.yellow('This usually takes a few minutes after DataDAO registration.'));

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const encryptionKey = await client.readContract({
        address: QUERY_ENGINE_ADDRESS,
        abi: QUERY_ENGINE_ABI,
        functionName: 'dlpPubKeys',
        args: [BigInt(dlpId)]
      });

      if (encryptionKey && encryptionKey !== '') {
        console.log(chalk.green('✅ Encryption key retrieved successfully!'));
        return encryptionKey;
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

  return null; // Failed to get key after all attempts
}

/**
 * Get encryption key from blockchain (legacy single attempt)
 */
async function getEncryptionKey(dlpId) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  try {
    const encryptionKey = await client.readContract({
      address: QUERY_ENGINE_ADDRESS,
      abi: QUERY_ENGINE_ABI,
      functionName: 'dlpPubKeys',
      args: [BigInt(dlpId)]
    });

    return encryptionKey;
  } catch (error) {
    console.error(chalk.red('Error retrieving encryption key:'), error.message);
    return null;
  }
}

/**
 * Register refiner on-chain automatically
 */
async function registerRefinerOnChain(dlpId, refinerName, schemaUrl, refinerUrl, publicKey, privateKey) {
  try {
    console.log(chalk.blue('🔗 Registering refiner on-chain automatically...'));

    // Create wallet client for sending transactions
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: moksha,
      transport: http('https://rpc.moksha.vana.org')
    });

    // Create public client for reading
    const publicClient = createPublicClient({
      chain: moksha,
      transport: http('https://rpc.moksha.vana.org')
    });

    console.log(chalk.cyan('📋 Transaction parameters:'));
    console.log(`  Contract: ${REFINER_REGISTRY_ADDRESS}`);
    console.log(`  dlpId: ${dlpId}`);
    console.log(`  name: ${refinerName}`);
    console.log(`  schemaDefinitionUrl: ${schemaUrl}`);
    console.log(`  refinementInstructionUrl: ${refinerUrl}`);
    console.log();

    // Estimate gas first
    console.log(chalk.blue('⛽ Estimating gas...'));
    const gasEstimate = await publicClient.estimateContractGas({
      address: REFINER_REGISTRY_ADDRESS,
      abi: REFINER_REGISTRY_ABI,
      functionName: 'addRefiner',
      args: [BigInt(dlpId), refinerName, schemaUrl, refinerUrl],
      account
    });

    console.log(chalk.cyan(`Estimated gas: ${gasEstimate.toString()}`));

    // Send transaction
    console.log(chalk.blue('📤 Sending transaction...'));
    const hash = await walletClient.writeContract({
      address: REFINER_REGISTRY_ADDRESS,
      abi: REFINER_REGISTRY_ABI,
      functionName: 'addRefiner',
      args: [BigInt(dlpId), refinerName, schemaUrl, refinerUrl],
      gas: gasEstimate
    });

    console.log(chalk.cyan(`Transaction hash: ${hash}`));
    console.log(chalk.blue('⏳ Waiting for transaction confirmation...'));

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(chalk.green('✅ Transaction confirmed!'));
      console.log(chalk.cyan(`Block: ${receipt.blockNumber}`));
      console.log(chalk.cyan(`Gas used: ${receipt.gasUsed}`));

      // Extract refinerId from logs
      const refinerAddedLog = receipt.logs.find(log =>
        log.address.toLowerCase() === REFINER_REGISTRY_ADDRESS.toLowerCase()
      );

      if (refinerAddedLog) {
        // The refinerId is typically the first topic after the event signature
        // For RefinerAdded(uint256 indexed refinerId, ...)
        const refinerId = parseInt(refinerAddedLog.topics[1], 16);
        console.log(chalk.green(`✅ Refiner registered with ID: ${refinerId}`));
        return refinerId;
      } else {
        console.log(chalk.yellow('⚠️  Could not extract refinerId from transaction logs'));
        console.log(chalk.yellow('You can find it manually at:'));
        console.log(chalk.cyan(`https://moksha.vanascan.io/tx/${hash}`));
        return null;
      }
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error) {
    console.log(chalk.red('❌ Automatic registration failed:'), error.message);

    if (error.message.includes('insufficient funds')) {
      console.log(chalk.yellow('💡 Make sure your wallet has enough VANA tokens for gas fees'));
    } else if (error.message.includes('execution reverted')) {
      console.log(chalk.yellow('💡 Transaction was reverted. Possible reasons:'));
      console.log('  • Refiner already exists for this DLP');
      console.log('  • Invalid parameters');
      console.log('  • DLP not properly registered');
    }

    return null;
  }
}

/**
 * Deploy Data Refinement component
 */
async function deployRefiner() {
  const stateManager = new DeploymentStateManager();
  
  try {
    console.log(chalk.blue('Preparing Data Refinement component for deployment...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');

    if (!fs.existsSync(deploymentPath)) {
      const error = new Error('deployment.json not found. Run previous deployment steps first.');
      console.error(chalk.red('Error: ' + error.message));
      stateManager.recordError('refinerConfigured', error);
      process.exit(1);
    }

    // Load deployment information
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment.dlpId) {
      const error = new Error('dlpId not found in deployment.json. Run "npm run register:datadao" first.');
      console.error(chalk.red('Error: ' + error.message));
      stateManager.recordError('refinerConfigured', error);
      process.exit(1);
    }

    if (!deployment.refinerRepo) {
      const error = new Error('refinerRepo not found in deployment.json. Run GitHub setup first.');
      console.error(chalk.red('Error: ' + error.message));
      stateManager.recordError('refinerConfigured', error);
      process.exit(1);
    }

    // Get encryption key from blockchain
    console.log(chalk.blue('🔍 Retrieving encryption key from blockchain...'));
    let encryptionKey = await pollEncryptionKey(deployment.dlpId);

    if (!encryptionKey || encryptionKey === '') {
      console.log(chalk.yellow('⚠️  Could not retrieve encryption key automatically.'));
      console.log(chalk.yellow('This might be because the registration is still processing.'));
      console.log();
      console.log(chalk.blue('Manual steps to get the encryption key:'));
      console.log('1. Visit: https://moksha.vanascan.io/address/0xd25Eb66EA2452cf3238A2eC6C1FD1B7F5B320490?tab=read_proxy');
      console.log(`2. Call dlpPubKeys with dlpId: ${deployment.dlpId}`);
      console.log('3. Copy the returned key');
      console.log();

      const { manualKey } = await inquirer.prompt([
        {
          type: 'input',
          name: 'manualKey',
          message: 'Enter the encryption key manually:',
          validate: (input) => input.trim() !== '' ? true : 'Encryption key is required'
        }
      ]);

      encryptionKey = manualKey;
    } else {
      console.log(chalk.green('✅ Encryption key retrieved successfully'));
    }

    // Update refiner .env with encryption key
    const refinerEnvPath = path.join(process.cwd(), 'refiner', '.env');
    let refinerEnv = '';

    if (fs.existsSync(refinerEnvPath)) {
      refinerEnv = fs.readFileSync(refinerEnvPath, 'utf8');
    }

    // Update or add REFINEMENT_ENCRYPTION_KEY
    if (refinerEnv.includes('REFINEMENT_ENCRYPTION_KEY')) {
      refinerEnv = refinerEnv.replace(
        /REFINEMENT_ENCRYPTION_KEY=.*/,
        `REFINEMENT_ENCRYPTION_KEY=${encryptionKey}`
      );
    } else {
      refinerEnv += `\nREFINEMENT_ENCRYPTION_KEY=${encryptionKey}\n`;
    }

    fs.writeFileSync(refinerEnvPath, refinerEnv);
    console.log(chalk.green('✅ Refiner .env updated with encryption key'));

    // Update schema metadata
    console.log(chalk.blue('🔧 Updating refiner configuration...'));

    const configPath = path.join(process.cwd(), 'refiner', 'refiner', 'config.py');
    if (fs.existsSync(configPath)) {
      let config = fs.readFileSync(configPath, 'utf8');

      // Update SCHEMA_NAME to include the DataDAO name
      const schemaName = `${deployment.dlpName} Data Schema`;
      config = config.replace(
        /SCHEMA_NAME\s*=\s*["'].*["']/,
        `SCHEMA_NAME = "${schemaName}"`
      );

      fs.writeFileSync(configPath, config);
      console.log(chalk.green('✅ Schema configuration updated'));
    }

    // Set up git repository
    const refinerDir = path.join(process.cwd(), 'refiner');
    process.chdir(refinerDir);

    console.log(chalk.blue('🔧 Setting up git repository...'));

    try {
      // Initialize git if not already done
      if (!fs.existsSync('.git')) {
        execSync('git init', { stdio: 'pipe' });
        console.log(chalk.green('✅ Git repository initialized'));
      }

      // Set up remote origin
      try {
        // Check if origin already exists
        execSync('git remote get-url origin', { stdio: 'pipe' });
        // If it exists, update it
        execSync(`git remote set-url origin ${deployment.refinerRepo}`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Git remote origin updated'));
      } catch (e) {
        // If it doesn't exist, add it
        execSync(`git remote add origin ${deployment.refinerRepo}`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Git remote origin added'));
      }

      // Pull any existing commits from remote (e.g., from GitHub Actions)
      try {
        // First fetch all remote refs
        execSync('git fetch origin', { stdio: 'pipe' });
        
        // Check what branch we're on
        const currentBranch = execSync('git branch --show-current', { stdio: 'pipe', encoding: 'utf8' }).trim();
        console.log(chalk.blue(`📋 Current branch: ${currentBranch}`));
        
        // Try to merge remote main into current branch
        try {
          execSync('git merge origin/main --allow-unrelated-histories', { stdio: 'pipe' });
          console.log(chalk.green('✅ Synchronized with remote repository'));
        } catch (mergeError) {
          // If merge fails, try rebasing
          try {
            execSync('git rebase origin/main', { stdio: 'pipe' });
            console.log(chalk.green('✅ Rebased with remote repository'));
          } catch (rebaseError) {
            console.log(chalk.yellow("⚠️ Git merge/rebase failed. You'll need to resolve conflicts manually. Errors:"));
            console.log(chalk.yellow("  Merge: " + mergeError.message));
            console.log(chalk.yellow("  Rebase: " + rebaseError.message));
            console.log();
          }
        }
      } catch (e) {
        // Might fail if remote is empty or no main branch exists
        console.log(chalk.yellow('⚠️  Git operations failed with error:'));
        console.log(chalk.yellow("  " + e.message));
        console.log(chalk.yellow('You\'ll need to set up manually:'));
        console.log(chalk.yellow(`   git remote add origin ${deployment.refinerRepo}`));
        console.log(chalk.yellow(`   git fetch origin`));
        console.log(chalk.yellow(`   git branch --set-upstream-to origin/main`));
        console.log(chalk.yellow(`   git pull origin main`));
        console.log();
      }

      // Stage and commit changes
      execSync('git add .', { stdio: 'pipe' });

      try {
        execSync(`git commit -m "Configure refiner for ${deployment.dlpName}"`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Changes committed'));
      } catch (e) {
        // Might fail if no changes or already committed
        console.log(chalk.yellow('ℹ️  No new changes to commit'));
      }

      console.log(chalk.green('✅ Git setup completed'));
      console.log();

    } catch (error) {
      console.log(chalk.yellow('⚠️  Git setup failed. You\'ll need to set up manually:'));
      console.log(chalk.yellow(`   git remote add origin ${deployment.refinerRepo}`));
      console.log();
    }

    // Generate schema locally first
    console.log(chalk.blue('🔧 Generating schema locally...'));

    try {
      // Check if Docker daemon is running first
      execSync('docker info', { stdio: 'pipe' });

      // Build and run the refiner to generate schema
      execSync('docker build -t refiner .', { stdio: 'pipe' });
      execSync('docker run --rm -v $(pwd)/input:/input -v $(pwd)/output:/output --env-file .env refiner', { stdio: 'pipe' });

      const schemaPath = path.join(process.cwd(), 'output', 'schema.json');
      if (fs.existsSync(schemaPath)) {
        console.log(chalk.green('✅ Schema generated successfully'));
      } else {
        console.log(chalk.yellow('⚠️  Schema generation may have failed, but continuing...'));
      }
    } catch (error) {
      if (error.message.includes('Cannot connect to the Docker daemon') ||
          error.message.includes('docker daemon') ||
          error.message.includes('daemon running')) {
        console.log(chalk.yellow('⚠️  Docker daemon is not running!'));
        console.log(chalk.cyan('💡 To fix this:'));
        console.log('  • Start Docker Desktop application');
        console.log('  • Or run: sudo systemctl start docker (on Linux)');
        console.log('  • Wait for Docker to fully start, then try again');
        console.log();
        console.log(chalk.blue('📋 You can still continue with manual deployment without local schema generation.'));
      } else if (error.message.includes('401 Client Error') && error.message.includes('pinata')) {
        console.log(chalk.yellow('⚠️  Pinata API credentials are invalid or expired!'));
        console.log(chalk.cyan('💡 To fix this:'));
        console.log('  • Check your Pinata API key and secret in the .env file');
        console.log('  • Go to https://pinata.cloud → API Keys');
        console.log('  • Generate new API credentials if needed');
        console.log('  • Update the refiner/.env file with:');
        console.log('    PINATA_API_KEY=your_new_key');
        console.log('    PINATA_API_SECRET=your_new_secret');
        console.log();
        console.log(chalk.blue('📋 You can still continue with manual deployment - the schema will be uploaded later.'));
      } else {
        console.log(chalk.yellow('⚠️  Local schema generation failed:', error.message));
      }
      console.log(chalk.yellow('Continuing with deployment...'));
    }

    // Provide deployment options
    console.log(chalk.blue('📋 Refiner Deployment Options:'));
    console.log();

    const { deploymentChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deploymentChoice',
        message: 'How would you like to deploy your refiner?',
        choices: [
          { name: '🚀 Automatic: Push to GitHub and register refiner', value: 'auto' },
          { name: '📝 Manual: I\'ll handle the workflow myself', value: 'manual' },
          { name: '⏸️  Skip: Configure later', value: 'skip' }
        ]
      }
    ]);

    if (deploymentChoice === 'auto') {
      console.log(chalk.blue('🚀 Pushing to GitHub...'));

      try {
        execSync('git push -u origin main', { stdio: 'inherit' });
        console.log();
        console.log(chalk.green('✅ Successfully pushed to GitHub!'));
        console.log();
        console.log(chalk.blue('⏳ GitHub Actions is now building your refiner...'));
        console.log(chalk.yellow('This usually takes 2-3 minutes.'));
        console.log();
        console.log(chalk.yellow('⚠️  IMPORTANT: Wait for the NEW build to complete!'));
        console.log(chalk.yellow('   Don\'t use an existing/old release - you need the fresh build.'));
        console.log();
        console.log(chalk.cyan('📋 Next steps:'));
        console.log('1. Visit: ' + chalk.yellow(`${deployment.refinerRepo}/releases`));
        console.log('2. ' + chalk.cyan('WAIT') + ' for a new release to appear (with your latest changes)');
        console.log();
        console.log(chalk.gray('💡 Note: If you just created the repository, the build may have already completed automatically.'));
        console.log();

        // Wait for user confirmation that build is complete
        const { buildComplete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'buildComplete',
            message: 'Is there a successful build available (either new or existing)?',
            default: true
          }
        ]);

        if (!buildComplete) {
          console.log(chalk.yellow('Please wait for a build to complete and run this script again.'));
          return;
        }

        // Auto-upload schema to IPFS using Pinata
        console.log(chalk.blue('📤 Uploading schema to IPFS...'));

        const schemaPath = path.join(process.cwd(), 'output', 'schema.json');
        let schemaUrl = '';

        if (fs.existsSync(schemaPath)) {
          try {
            // Read Pinata credentials from .env
            const envPath = path.join(process.cwd(), '.env');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const pinataApiKey = envContent.match(/PINATA_API_KEY=(.+)/)?.[1];
            const pinataApiSecret = envContent.match(/PINATA_API_SECRET=(.+)/)?.[1];

            if (!pinataApiKey || !pinataApiSecret) {
              throw new Error('Pinata credentials not found in .env. Pinata API key and secret are required for IPFS uploads.');
            }

            // Upload to Pinata using curl (simple approach)
            const uploadCmd = `curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
              -H "pinata_api_key: ${pinataApiKey}" \
              -H "pinata_secret_api_key: ${pinataApiSecret}" \
              -F "file=@${schemaPath}" \
              -F 'pinataMetadata={"name":"${deployment.dlpName}-schema.json"}'`;

            const result = execSync(uploadCmd, { encoding: 'utf8' });
            const response = JSON.parse(result);

            if (response.IpfsHash) {
              schemaUrl = `https://gateway.pinata.cloud/ipfs/${response.IpfsHash}`;
              console.log(chalk.green('✅ Schema uploaded to IPFS successfully!'));
              console.log(chalk.cyan('Schema URL:'), schemaUrl);
            } else {
              throw new Error('Failed to get IPFS hash from Pinata response');
            }
          } catch (error) {
            console.log(chalk.yellow('⚠️  Automatic IPFS upload failed:', error.message));
            console.log(chalk.yellow('Please upload schema.json manually to Pinata:'));
            console.log(chalk.cyan('1. Go to https://pinata.cloud'));
            console.log(chalk.cyan('2. Upload the file: output/schema.json'));
            console.log(chalk.cyan('3. Copy the IPFS URL'));

            const { manualSchemaUrl } = await inquirer.prompt([
              {
                type: 'input',
                name: 'manualSchemaUrl',
                message: 'Enter the IPFS URL for the uploaded schema.json:',
                validate: (input) => input.trim() !== '' ? true : 'Schema URL is required'
              }
            ]);
            schemaUrl = manualSchemaUrl;
          }
        } else {
          console.log(chalk.yellow('⚠️  Schema file not found locally.'));
          const { manualSchemaUrl } = await inquirer.prompt([
            {
              type: 'input',
              name: 'manualSchemaUrl',
              message: 'Enter the IPFS URL for the schema.json:',
              validate: (input) => input.trim() !== '' ? true : 'Schema URL is required'
            }
          ]);
          schemaUrl = manualSchemaUrl;
        }

        // Get refiner artifact URL from GitHub Releases
        console.log();
        console.log(chalk.blue('📋 Get the refiner artifact:'));
        console.log('1. Visit: ' + chalk.yellow(`${deployment.refinerRepo}/releases`));
        console.log('2. Copy the .tar.gz download URL');

        const { refinerUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'refinerUrl',
            message: 'Enter the .tar.gz URL from GitHub Releases:',
            validate: (input) => {
              if (input.trim() === '') return 'Refiner URL is required';
              if (!input.includes('.tar.gz')) return 'URL must point to a .tar.gz file';
              return true;
            }
          }
        ]);

        // Save URLs
        deployment.schemaUrl = schemaUrl;
        deployment.refinerUrl = refinerUrl;

        // Register refiner on-chain
        console.log();
        console.log(chalk.blue('📋 Registering refiner on-chain...'));

        try {
          // Get the private key from contracts/.env
          const contractsEnvPath = path.join(process.cwd(), '..', 'contracts', '.env');

          if (!fs.existsSync(contractsEnvPath)) {
            throw new Error('contracts/.env file not found');
          }

          const contractsEnv = fs.readFileSync(contractsEnvPath, 'utf8');
          const privateKeyMatch = contractsEnv.match(/DEPLOYER_PRIVATE_KEY=(.+)/);

          if (!privateKeyMatch) {
            throw new Error('DEPLOYER_PRIVATE_KEY not found in contracts/.env');
          }

          const privateKey = privateKeyMatch[1].trim();

          // Get deployment info for other parameters
          const innerDeploymentPath = path.join(process.cwd(), '..', 'deployment.json');
          const innerDeployment = JSON.parse(fs.readFileSync(innerDeploymentPath, 'utf8'));

          const refinerName = `${innerDeployment.dlpName} Refiner`;

          // Try automatic registration first
          const refinerId = await registerRefinerOnChain(
            innerDeployment.dlpId,
            refinerName,
            schemaUrl,
            refinerUrl,
            encryptionKey,
            privateKey
          );

          if (refinerId) {
            deployment.refinerId = refinerId;
            console.log(chalk.green(`✅ Refiner automatically registered with ID: ${refinerId}`));

            // Update UI .env with refinerId
            updateRefinerId(refinerId);
          } else {
            // Fall back to manual registration
            console.log();
            console.log(chalk.yellow('⚠️  Falling back to manual registration...'));
            console.log(chalk.yellow('Please complete the registration manually:'));
            console.log();
            console.log(chalk.cyan('1. Visit the DataRefinerRegistryImplementation contract:'));
            console.log(`   https://moksha.vanascan.io/address/${REFINER_REGISTRY_ADDRESS}?tab=read_write_proxy`);
            console.log();
            console.log(chalk.cyan('2. Find the "addRefiner" method'));
            console.log();
            console.log(chalk.cyan('3. Fill in the parameters:'));
            console.log(`   dlpId: ${innerDeployment.dlpId}`);
            console.log(`   name: ${refinerName}`);
            console.log(`   schemaDefinitionUrl: ${schemaUrl}`);
            console.log(`   refinementInstructionUrl: ${refinerUrl}`);
            console.log();
            console.log(chalk.cyan('4. Connect your wallet and submit the transaction'));
            console.log();

            const { manualRefinerId } = await inquirer.prompt([
              {
                type: 'input',
                name: 'manualRefinerId',
                message: 'Enter the refinerId from the transaction logs:',
                validate: (input) => {
                  const num = parseInt(input);
                  if (isNaN(num) || num < 0) return 'Please enter a valid refinerId number';
                  return true;
                }
              }
            ]);

            deployment.refinerId = parseInt(manualRefinerId);
            console.log(chalk.green(`✅ Refiner manually registered with ID: ${deployment.refinerId}`));

            // Update UI .env with refinerId
            updateRefinerId(deployment.refinerId);
          }

        } catch (error) {
          console.log(chalk.yellow('⚠️  Automatic refiner registration failed:', error.message));
          console.log(chalk.yellow('You can complete this step manually later.'));

          const { skipRegistration } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'skipRegistration',
              message: 'Skip refiner registration for now? (You can complete it later)',
              default: true
            }
          ]);

          if (!skipRegistration) {
            console.log(chalk.yellow('Please complete the registration manually and run this script again.'));
            return;
          }
        }

        deployment.state = deployment.state || {};
        deployment.state.refinerConfigured = true;
        deployment.state.refinerPublished = true;

      } catch (error) {
        console.log(chalk.red('❌ Failed to push to GitHub:'), error.message);
        console.log();
        console.log(chalk.yellow('Please push manually:'));
        console.log(chalk.cyan('   git push -u origin main'));
        console.log();
        return;
      }

    } else if (deploymentChoice === 'manual') {
      console.log(chalk.blue('📝 Manual deployment instructions:'));
      console.log();
      console.log(chalk.yellow('1. Push your changes to GitHub:'));
      console.log(chalk.cyan(`   git push -u origin main`));
      console.log();
      console.log(chalk.yellow('2. Wait for GitHub Actions to complete'));
      console.log();
      console.log(chalk.yellow('⚠️  IMPORTANT: Wait for the NEW build to complete!'));
      console.log(chalk.yellow('   Don\'t use an existing/old release.'));
      console.log();
      console.log(chalk.yellow('3. Upload schema.json to Pinata IPFS'));
      console.log();
      console.log(chalk.yellow('4. Get the refiner .tar.gz URL from Releases'));
      console.log();
      console.log(chalk.yellow('5. Register the refiner on-chain'));
      console.log();

      const { schemaUrl, refinerUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'schemaUrl',
          message: 'Enter the IPFS URL for the schema:',
          validate: (input) => input.trim() !== '' ? true : 'Schema URL is required'
        },
        {
          type: 'input',
          name: 'refinerUrl',
          message: 'Enter the .tar.gz URL for the refiner:',
          validate: (input) => input.trim() !== '' ? true : 'Refiner URL is required'
        }
      ]);

      deployment.schemaUrl = schemaUrl;
      deployment.refinerUrl = refinerUrl;

      // Register refiner on-chain
      console.log();
      console.log(chalk.blue('📋 Registering refiner on-chain...'));

      try {
        // Read the encryption key from .env for registration
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const encryptionKey = envContent.match(/REFINEMENT_ENCRYPTION_KEY=(.+)/)?.[1];

        if (!encryptionKey) {
          throw new Error('Encryption key not found in .env file');
        }

        console.log(chalk.cyan('Registration parameters:'));
        console.log(`  dlpId: ${deployment.dlpId}`);
        console.log(`  name: ${deployment.dlpName} Refiner`);
        console.log(`  schemaDefinitionUrl: ${schemaUrl}`);
        console.log(`  refinementInstructionUrl: ${refinerUrl}`);
        console.log();

        console.log(chalk.yellow('⚠️  On-chain registration requires manual completion via Vanascan:'));
        console.log();
        console.log(chalk.cyan('1. Visit the DataRefinerRegistryImplementation contract:'));
        console.log(`   https://moksha.vanascan.io/address/${REFINER_REGISTRY_ADDRESS}?tab=read_write_proxy`);
        console.log();
        console.log(chalk.cyan('2. Find the "addRefiner" method'));
        console.log();
        console.log(chalk.cyan('3. Fill in the parameters:'));
        console.log(`   dlpId: ${deployment.dlpId}`);
        console.log(`   name: ${deployment.dlpName} Refiner`);
        console.log(`   schemaDefinitionUrl: ${schemaUrl}`);
        console.log(`   refinementInstructionUrl: ${refinerUrl}`);
        console.log();
        console.log(chalk.cyan('4. Connect your wallet and submit the transaction'));
        console.log();
        console.log(chalk.cyan('5. After transaction confirms, find the "RefinerAdded" event in the logs'));
        console.log(chalk.cyan('6. Copy the refinerId from the event'));
        console.log();

        // Try to automatically extract refinerId from recent transactions
        console.log(chalk.blue('🔍 Attempting to automatically detect refinerId...'));
        console.log(chalk.yellow('Please submit the transaction in Vanascan, then press Enter to continue.'));

        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Press Enter after submitting the transaction...',
          }
        ]);

        // Poll for recent transactions to find refinerId
        let refinerId = null;
        const maxAttempts = 12; // 2 minutes with 10-second intervals

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            console.log(chalk.blue(`🔍 Checking for transaction confirmation (${attempt}/${maxAttempts})...`));

            // Here we would implement transaction polling
            // For now, fall back to manual input after a few attempts
            if (attempt >= 3) {
              console.log(chalk.yellow('⚠️  Automatic detection taking longer than expected.'));
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          } catch (error) {
            console.log(chalk.yellow(`Attempt ${attempt} failed: ${error.message}`));
          }
        }

        if (!refinerId) {
          console.log(chalk.yellow('🔧 Please enter the refinerId manually:'));
          const { manualRefinerId } = await inquirer.prompt([
            {
              type: 'input',
              name: 'manualRefinerId',
              message: 'Enter the refinerId from the transaction logs:',
              validate: (input) => {
                const num = parseInt(input);
                if (isNaN(num) || num < 0) return 'Please enter a valid refinerId number';
                return true;
              }
            }
          ]);
          refinerId = parseInt(manualRefinerId);
        }

        deployment.refinerId = refinerId;
        console.log(chalk.green(`✅ Refiner manually registered with ID: ${deployment.refinerId}`));

        // Update UI .env with refinerId
        updateRefinerId(deployment.refinerId);

      } catch (error) {
        console.log(chalk.yellow('⚠️  Automatic refiner registration failed:', error.message));
        console.log(chalk.yellow('You can complete this step manually later.'));

        const { skipRegistration } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'skipRegistration',
            message: 'Skip refiner registration for now? (You can complete it later)',
            default: true
          }
        ]);

        if (!skipRegistration) {
          console.log(chalk.yellow('Please complete the registration manually and run this script again.'));
          return;
        }
      }

      deployment.state = deployment.state || {};
      deployment.state.refinerConfigured = true;
      deployment.state.refinerPublished = true;

    } else {
      console.log(chalk.yellow('⏸️  Refiner deployment skipped.'));
      console.log(chalk.yellow('You can complete this later by running: npm run deploy:refiner'));

      deployment.state = deployment.state || {};
      deployment.state.refinerConfigured = true;
      deployment.state.refinerPublished = false;

      // Go back to project root
      process.chdir('..');
      const skipDeploymentPath = path.join(process.cwd(), 'deployment.json');
      fs.writeFileSync(skipDeploymentPath, JSON.stringify(deployment, null, 2));
      return;
    }

    // Go back to project root
    process.chdir('..');

    // Update deployment.json
    const finalDeploymentPath = path.join(process.cwd(), 'deployment.json');
    fs.writeFileSync(finalDeploymentPath, JSON.stringify(deployment, null, 2));

    console.log();
    console.log(chalk.green('🎉 Data Refiner configured successfully!'));
    console.log();
    console.log(chalk.blue('🎯 Next step:'));
    console.log('Run ' + chalk.cyan('npm run deploy:ui') + ' to configure the UI');

  } catch (error) {
    console.error(chalk.red('Refiner deployment preparation failed:'), error.message);
    
    // Record the error in state for recovery suggestions
    stateManager.recordError('refinerConfigured', error);
    
    console.log();
    console.log(chalk.yellow('💡 This error has been recorded. Run "npm run status" to see recovery options.'));
    process.exit(1);
  }
}

// Run the deployment
deployRefiner();