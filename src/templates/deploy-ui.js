const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
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

    // Add Pinata credentials if available
    if (deployment.pinataApiKey && deployment.pinataApiSecret) {
      uiEnv = updateEnvVar(uiEnv, 'PINATA_API_KEY', deployment.pinataApiKey);
      uiEnv = updateEnvVar(uiEnv, 'PINATA_API_SECRET', deployment.pinataApiSecret);
    } else {
      console.log(chalk.yellow('⚠ Pinata credentials not found in deployment.json'));
      console.log(chalk.yellow('  You may need to add them manually to ui/.env'));
    }

    // Add Google OAuth credentials if available
    if (deployment.googleClientId && deployment.googleClientSecret) {
      uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_ID', deployment.googleClientId);
      uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_SECRET', deployment.googleClientSecret);
    } else {
      console.log(chalk.yellow('⚠ Google OAuth credentials not found in deployment.json'));
      console.log(chalk.yellow('  You may need to set up Google OAuth and add them manually to ui/.env'));
    }

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
    process.exit(1);
  }
}

// Run the deployment
deployUI();
