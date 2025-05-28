const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');

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
 * Deploy Data Refinement component
 */
async function deployRefiner() {
  try {
    console.log(chalk.blue('Preparing Data Refinement component for deployment...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');

    if (!fs.existsSync(deploymentPath)) {
      console.error(chalk.red('Error: deployment.json not found. Run previous deployment steps first.'));
      process.exit(1);
    }

    // Load deployment information
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment.dlpId) {
      console.error(chalk.red('Error: dlpId not found in deployment.json. Run "npm run register:datadao" first.'));
      process.exit(1);
    }

    if (!deployment.refinerRepo) {
      console.error(chalk.red('Error: refinerRepo not found in deployment.json. Run GitHub setup first.'));
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
      console.log(chalk.yellow('⚠️  Local schema generation failed, but continuing with deployment...'));
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
        console.log(chalk.cyan('📋 Next steps:'));
        console.log('1. Visit: ' + chalk.yellow(`${deployment.refinerRepo}/releases`));
        console.log('2. Check if a build artifact is available (.tar.gz file)');
        console.log('3. If no artifact yet, wait a few minutes and refresh');
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

            if (pinataApiKey && pinataApiSecret) {
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
            } else {
              throw new Error('Pinata credentials not found in .env');
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
          console.log(`  publicKey: ${encryptionKey}`);
          console.log();

          console.log(chalk.yellow('⚠️  On-chain registration requires manual completion via Vanascan:'));
          console.log();
          console.log(chalk.cyan('1. Visit the DataRefinerRegistryImplementation contract:'));
          console.log(`   https://moksha.vanascan.io/address/0x93c3EF89369fDcf08Be159D9DeF0F18AB6Be008c?tab=read_write_proxy&source_address=0xf2D607F416a0B367bd3084e83567B3325bD157B5#0x4bb01bbd`);
          console.log();
          console.log(chalk.cyan('2. Find the "addRefiner" method'));
          console.log();
          console.log(chalk.cyan('3. Fill in the parameters:'));
          console.log(`   dlpId: ${deployment.dlpId}`);
          console.log(`   name: ${deployment.dlpName} Refiner`);
          console.log(`   schemaDefinitionUrl: ${schemaUrl}`);
          console.log(`   refinementInstructionUrl: ${refinerUrl}`);
          console.log(`   publicKey: ${encryptionKey}`);
          console.log();
          console.log(chalk.cyan('4. Connect your wallet and submit the transaction'));
          console.log();
          console.log(chalk.cyan('5. After transaction confirms, find the "RefinerAdded" event in the logs'));
          console.log(chalk.cyan('6. Copy the refinerId from the event'));
          console.log();

          const { refinerId } = await inquirer.prompt([
            {
              type: 'input',
              name: 'refinerId',
              message: 'Enter the refinerId from the transaction logs:',
              validate: (input) => {
                const num = parseInt(input);
                if (isNaN(num) || num < 0) return 'Please enter a valid refinerId number';
                return true;
              }
            }
          ]);

          deployment.refinerId = parseInt(refinerId);
          console.log(chalk.green(`✅ Refiner registered with ID: ${deployment.refinerId}`));

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
        console.log(`  publicKey: ${encryptionKey}`);
        console.log();

        console.log(chalk.yellow('⚠️  On-chain registration requires manual completion via Vanascan:'));
        console.log();
        console.log(chalk.cyan('1. Visit the DataRefinerRegistryImplementation contract:'));
        console.log(`   https://moksha.vanascan.io/address/0x93c3EF89369fDcf08Be159D9DeF0F18AB6Be008c?tab=read_write_proxy&source_address=0xf2D607F416a0B367bd3084e83567B3325bD157B5#0x4bb01bbd`);
        console.log();
        console.log(chalk.cyan('2. Find the "addRefiner" method'));
        console.log();
        console.log(chalk.cyan('3. Fill in the parameters:'));
        console.log(`   dlpId: ${deployment.dlpId}`);
        console.log(`   name: ${deployment.dlpName} Refiner`);
        console.log(`   schemaDefinitionUrl: ${schemaUrl}`);
        console.log(`   refinementInstructionUrl: ${refinerUrl}`);
        console.log(`   publicKey: ${encryptionKey}`);
        console.log();
        console.log(chalk.cyan('4. Connect your wallet and submit the transaction'));
        console.log();
        console.log(chalk.cyan('5. After transaction confirms, find the "RefinerAdded" event in the logs'));
        console.log(chalk.cyan('6. Copy the refinerId from the event'));
        console.log();

        const { refinerId } = await inquirer.prompt([
          {
            type: 'input',
            name: 'refinerId',
            message: 'Enter the refinerId from the transaction logs:',
            validate: (input) => {
              const num = parseInt(input);
              if (isNaN(num) || num < 0) return 'Please enter a valid refinerId number';
              return true;
            }
          }
        ]);

        deployment.refinerId = parseInt(refinerId);
        console.log(chalk.green(`✅ Refiner registered with ID: ${deployment.refinerId}`));

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
      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
      return;
    }

    // Go back to project root
    process.chdir('..');

    // Update deployment.json
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log();
    console.log(chalk.green('🎉 Data Refiner configured successfully!'));
    console.log();
    console.log(chalk.blue('🎯 Next step:'));
    console.log('Run ' + chalk.cyan('npm run deploy:ui') + ' to configure the UI');

  } catch (error) {
    console.error(chalk.red('Refiner deployment preparation failed:'), error.message);
    process.exit(1);
  }
}

// Run the deployment
deployRefiner();