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
    stateManager.validateRequiredFields(['proofUrl', 'refinerId']);

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
