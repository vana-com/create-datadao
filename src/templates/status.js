const chalk = require('chalk');
const DeploymentStateManager = require('./state-manager');

/**
 * Show deployment status and next steps
 */
function showStatus() {
  console.log(chalk.blue('📊 DataDAO Deployment Status'));
  console.log();

  try {
    const stateManager = new DeploymentStateManager();
    const deployment = stateManager.getState();

    // Show progress
    stateManager.showProgress();

    // Show deployment details
    console.log(chalk.blue('📋 Deployment Details:'));
    console.log(chalk.cyan('  Project:'), deployment.dlpName || 'Not set');
    console.log(chalk.cyan('  Token:'), deployment.tokenName ? `${deployment.tokenName} (${deployment.tokenSymbol})` : 'Not deployed');
    console.log(chalk.cyan('  Owner:'), deployment.address || 'Not set');
    console.log(chalk.cyan('  GitHub:'), deployment.githubUsername || 'Not set');

    if (deployment.tokenAddress) {
      console.log(chalk.cyan('  Token Contract:'), deployment.tokenAddress);
    }
    if (deployment.proxyAddress) {
      console.log(chalk.cyan('  DLP Contract:'), deployment.proxyAddress);
    }
    if (deployment.dlpId) {
      console.log(chalk.cyan('  DLP ID:'), deployment.dlpId);
    }
    if (deployment.refinerId) {
      console.log(chalk.cyan('  Refiner ID:'), deployment.refinerId);
    }

    console.log();

    // Determine next step
    const state = deployment.state;
    let nextStep = '';
    let nextCommand = '';

    if (!state.contractsDeployed) {
      nextStep = 'Deploy smart contracts';
      nextCommand = 'npm run deploy:contracts';
    } else if (!state.dataDAORegistered) {
      nextStep = 'Register DataDAO on-chain';
      nextCommand = 'npm run register:datadao';
    } else if (!state.proofConfigured || !state.proofPublished) {
      nextStep = 'Configure and publish Proof of Contribution';
      nextCommand = 'npm run deploy:proof';
    } else if (!state.refinerConfigured || !state.refinerPublished) {
      nextStep = 'Configure and publish Data Refiner';
      nextCommand = 'npm run deploy:refiner';
    } else if (!state.uiConfigured) {
      nextStep = 'Configure UI';
      nextCommand = 'npm run deploy:ui';
    } else {
      nextStep = 'Start the UI and test your DataDAO';
      nextCommand = 'cd ui && npm run dev';
    }

    console.log(chalk.blue('🎯 Next Step:'));
    console.log(chalk.yellow('  ' + nextStep));
    console.log(chalk.cyan('  ' + nextCommand));

    if (state.uiConfigured) {
      console.log();
      console.log(chalk.green('🎉 Your DataDAO is fully deployed and ready to use!'));
      console.log(chalk.blue('Visit: ') + chalk.cyan('http://localhost:3000'));
    }

  } catch (error) {
    console.log(chalk.red('❌ No deployment found'));
    console.log(chalk.yellow('Run: ') + chalk.cyan('npm run deploy:contracts') + chalk.yellow(' to start'));
  }

  console.log();
}

// Run the status check
showStatus();