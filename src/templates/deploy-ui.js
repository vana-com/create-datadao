const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Verify we're in the correct directory
if (!fs.existsSync(path.join(process.cwd(), 'deployment.json'))) {
  console.error(chalk.red('❌ Error: Must run this command from your DataDAO project directory'));
  console.error(chalk.yellow('📁 Current directory:'), process.cwd());
  console.error(chalk.yellow('💡 Try: cd <your-project-name> && npm run deploy:ui'));
  process.exit(1);
}

const inquirer = require('inquirer');
const DeploymentStateManager = require('./state-manager');

/**
 * Deploy UI Configuration
 */
async function deployUI() {
  console.log(chalk.blue('Configuring DataDAO UI...'));

  try {
    // Initialize state manager
    const stateManager = new DeploymentStateManager();
    const deployment = stateManager.getState();

    // Show current progress
    stateManager.showProgress();

    // Validate prerequisites
    try {
      stateManager.validateRequiredFields(['proofUrl', 'refinerId']);
    } catch (error) {
      if (error.message.includes('refinerId')) {
        console.log(chalk.red('❌ UI configuration failed: Missing refinerId'));
        console.log();
        console.log(chalk.yellow('The refiner needs to be registered on-chain to get a refinerId.'));
        console.log(chalk.blue('To fix this:'));
        console.log();
        console.log(chalk.cyan('Option 1: Re-run refiner deployment (recommended)'));
        console.log('  ' + chalk.gray('npm run deploy:refiner'));
        console.log('  ' + chalk.gray('This will guide you through the registration process'));
        console.log();
        console.log(chalk.cyan('Option 2: Manual registration'));
        console.log('  1. Visit the DataRefinerRegistryImplementation contract:');
        console.log(`     https://moksha.vanascan.io/address/0x93c3EF89369fDcf08Be159D9DeF0F18AB6Be008c?tab=read_write_proxy&source_address=0xf2D607F416a0B367bd3084e83567B3325bD157B5#0x4bb01bbd`);
        console.log('  2. Find the "addRefiner" method');
        console.log('  3. Use the parameters from your refiner deployment');
        console.log('  4. Get the refinerId from the transaction logs');
        console.log('  5. Add it to deployment.json: "refinerId": <number>');
        console.log();
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Check if UI is already configured
    if (stateManager.isCompleted('uiConfigured')) {
      console.log(chalk.green('✅ UI already configured!'));
      console.log(chalk.blue('Your DataDAO is ready to use. Start the UI with:'));
      console.log('  ' + chalk.cyan('cd ui && npm run dev'));
      console.log(chalk.blue('Then visit: http://localhost:3000'));
      return;
    }

    console.log(chalk.blue('📝 Configuring UI environment...'));

    // Read current UI .env
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    let uiEnv = '';

    if (fs.existsSync(uiEnvPath)) {
      uiEnv = fs.readFileSync(uiEnvPath, 'utf8');
    }

    // Helper function to update or add env variable
    const updateEnvVar = (envContent, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        return envContent.replace(regex, `${key}=${value}`);
      } else {
        return envContent + `\n${key}=${value}`;
      }
    };

    // Update all required environment variables
    uiEnv = updateEnvVar(uiEnv, 'REFINER_ID', deployment.refinerId);
    uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_PROOF_URL', deployment.proofUrl);

    // Generate NEXTAUTH_SECRET if not present
    if (!uiEnv.includes('NEXTAUTH_SECRET=')) {
      const crypto = require('crypto');
      const nextAuthSecret = crypto.randomBytes(32).toString('hex');
      uiEnv = updateEnvVar(uiEnv, 'NEXTAUTH_SECRET', nextAuthSecret);
      console.log(chalk.green('✓ Generated NEXTAUTH_SECRET for session encryption'));
    }

    // Add NEXTAUTH_URL for proper OAuth configuration
    uiEnv = updateEnvVar(uiEnv, 'NEXTAUTH_URL', 'http://localhost:3000');

    // Add contract addresses if available
    if (deployment.proxyAddress) {
      uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_DLP_CONTRACT_ADDRESS', deployment.proxyAddress);
    }
    if (deployment.tokenAddress) {
      uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS', deployment.tokenAddress);
    }
    if (deployment.dlpId) {
      uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_DLP_ID', deployment.dlpId);
    }

    // Add network configuration
    uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_NETWORK_RPC_URL', 'https://rpc.moksha.vana.org');
    uiEnv = updateEnvVar(uiEnv, 'NEXT_PUBLIC_NETWORK_CHAIN_ID', '14800');

    // Add Pinata credentials (required)
    if (!deployment.pinataApiKey || !deployment.pinataApiSecret) {
      throw new Error('Missing required Pinata credentials in deployment.json. Pinata API key and secret are required for IPFS functionality.');
    }
    uiEnv = updateEnvVar(uiEnv, 'PINATA_API_KEY', deployment.pinataApiKey);
    uiEnv = updateEnvVar(uiEnv, 'PINATA_API_SECRET', deployment.pinataApiSecret);

    // Add Google OAuth credentials (required)
    if (!deployment.googleClientId || !deployment.googleClientSecret) {
      throw new Error('Missing required Google OAuth credentials in deployment.json. Google Client ID and secret are required for user authentication.');
    }
    uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_ID', deployment.googleClientId);
    uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_SECRET', deployment.googleClientSecret);

    // Add refinement endpoint (hardcoded for now - single server instance)
    uiEnv = updateEnvVar(uiEnv, 'REFINEMENT_ENDPOINT', 'https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network');

    // Write updated .env file
    fs.writeFileSync(uiEnvPath, uiEnv.trim() + '\n');
    console.log(chalk.green('✓ UI environment configured'));

    // Mark UI as configured
    stateManager.markCompleted('uiConfigured');

    console.log(chalk.green('🎉 DataDAO UI configuration completed!'));
    console.log();
    console.log(chalk.blue('🚀 Your DataDAO is now ready!'));
    console.log();
    console.log(chalk.blue('To start the UI:'));
    console.log('  ' + chalk.cyan('cd ui'));
    console.log('  ' + chalk.cyan('npm install'));
    console.log('  ' + chalk.cyan('npm run dev'));
    console.log();
    console.log(chalk.blue('Then visit: ') + chalk.cyan('http://localhost:3000'));
    console.log();
    console.log(chalk.blue('📋 Summary of your DataDAO:'));
    console.log(chalk.cyan('  DLP Name:'), deployment.dlpName);
    console.log(chalk.cyan('  Token:'), `${deployment.tokenName} (${deployment.tokenSymbol})`);
    console.log(chalk.cyan('  DLP ID:'), deployment.dlpId);
    console.log(chalk.cyan('  Refiner ID:'), deployment.refinerId);
    console.log(chalk.cyan('  Contract:'), deployment.proxyAddress);
    console.log(chalk.cyan('  Token Contract:'), deployment.tokenAddress);

  } catch (error) {
    console.error(chalk.red('UI configuration failed:'), error.message);
    
    // Record the error in state for recovery suggestions
    const stateManager = new DeploymentStateManager();
    stateManager.recordError('uiConfigured', error);
    
    console.log();
    console.log(chalk.yellow('💡 This error has been recorded. Run "npm run status" to see recovery options.'));
    process.exit(1);
  }
}

// Run the deployment
deployUI();
