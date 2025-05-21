const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const DeploymentStateManager = require('./state-manager');
const output = require('../lib/output');

/**
 * Enhanced status command with recovery options
 */
async function showStatus() {
  try {
    const stateManager = new DeploymentStateManager();
    const deployment = stateManager.getState();

    output.step('DataDAO Project Status', `Project: ${deployment.dlpName || 'Unknown'}`);

    // Show basic project info
    if (deployment.dlpName) {
      output.summary('Project Information', [
        { label: 'DataDAO Name', value: deployment.dlpName },
        { label: 'Token', value: `${deployment.tokenName} (${deployment.tokenSymbol})` },
        { label: 'Wallet Address', value: deployment.address }
      ]);
    }

    // Show deployment progress with better formatting
    const steps = [
      { key: 'contractsDeployed', name: 'Smart Contracts', details: getContractDetails(deployment) },
      { key: 'dataDAORegistered', name: 'DataDAO Registration', details: getRegistrationDetails(deployment) },
      { key: 'proofConfigured', name: 'Proof of Contribution', details: getProofDetails(deployment) },
      { key: 'refinerConfigured', name: 'Data Refiner', details: getRefinerDetails(deployment) },
      { key: 'uiConfigured', name: 'User Interface', details: getUIDetails(deployment) }
    ];

    console.log(chalk.blue.bold('📋 Deployment Progress:'));
    steps.forEach(step => {
      const isCompleted = stateManager.isCompleted(step.key);
      const hasError = deployment.errors && deployment.errors[step.key];
      
      let status, statusText;
      if (hasError) {
        status = chalk.red('❌');
        statusText = chalk.red('Failed');
      } else if (isCompleted) {
        status = chalk.green('✅');
        statusText = chalk.green('Completed');
      } else {
        status = chalk.gray('⏸️');
        statusText = chalk.gray('Pending');
      }

      console.log(`  ${status} ${step.name} - ${statusText}`);
      if (step.details && (isCompleted || hasError)) {
        console.log(chalk.gray(`     ${step.details}`));
      }
    });
    console.log();

    // Check for issues and offer recovery
    const issues = stateManager.validateConfiguration();
    const hasErrors = deployment.errors && Object.keys(deployment.errors).length > 0;

    if (issues.length > 0 || hasErrors) {
      output.warning('Issues detected in your setup');
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🔧 Fix configuration issues', value: 'fix' },
            { name: '🔄 Show recovery options', value: 'recover' },
            { name: '📝 Update credentials', value: 'credentials' },
            { name: '📊 View detailed errors', value: 'errors' },
            { name: '✅ Continue anyway', value: 'continue' }
          ]
        }
      ]);

      switch (action) {
        case 'fix':
          await stateManager.fixConfiguration();
          break;
        case 'recover':
          const recoveryAction = await stateManager.showRecoveryMenu();
          if (recoveryAction === 'retry') {
            await retryFailedSteps(stateManager);
          }
          break;
        case 'credentials':
          await updateCredentials(stateManager);
          break;
        case 'errors':
          showDetailedErrors(deployment.errors);
          break;
        case 'continue':
          break;
      }
    } else {
      // All good - show next steps
      const nextSteps = getNextSteps(deployment);
      if (nextSteps.length > 0) {
        output.nextSteps(nextSteps);
      } else {
        output.success('🎉 Your DataDAO is fully configured and ready to use!');
        output.nextSteps([
          'Start the UI: cd ui && npm run dev',
          'Visit: http://localhost:3000',
          'Test the contributor flow'
        ]);
      }
    }

  } catch (error) {
    output.error(`Status check failed: ${error.message}`);
    process.exit(1);
  }
}

function getContractDetails(deployment) {
  if (deployment.tokenAddress && deployment.proxyAddress) {
    return `Token: ${deployment.tokenAddress.slice(0, 10)}... | Proxy: ${deployment.proxyAddress.slice(0, 10)}...`;
  }
  return null;
}

function getRegistrationDetails(deployment) {
  if (deployment.dlpId) {
    return `DLP ID: ${deployment.dlpId}`;
  }
  return null;
}

function getProofDetails(deployment) {
  if (deployment.proofUrl) {
    return `Published: ${deployment.proofUrl.includes('github.com') ? 'GitHub' : 'Custom'}`;
  }
  return null;
}

function getRefinerDetails(deployment) {
  if (deployment.refinerId) {
    return `Refiner ID: ${deployment.refinerId}`;
  }
  return null;
}

function getUIDetails(deployment) {
  if (deployment.state && deployment.state.uiConfigured) {
    return 'Ready for development';
  }
  return null;
}

function getNextSteps(deployment) {
  const steps = [];
  
  if (!deployment.state.contractsDeployed) {
    steps.push('Deploy smart contracts: npm run deploy:contracts');
  } else if (!deployment.state.dataDAORegistered) {
    steps.push('Register DataDAO: npm run register:datadao');
  } else if (!deployment.state.proofConfigured) {
    steps.push('Configure proof system: npm run deploy:proof');
  } else if (!deployment.state.refinerConfigured) {
    steps.push('Configure data refiner: npm run deploy:refiner');
  } else if (!deployment.state.uiConfigured) {
    steps.push('Configure UI: npm run deploy:ui');
  }
  
  return steps;
}

async function retryFailedSteps(stateManager) {
  const errors = Object.keys(stateManager.state.errors);
  
  for (const step of errors) {
    output.step(`Retrying ${step}`, 'Attempting automatic recovery...');
    
    try {
      // Clear the error first
      stateManager.clearError(step);
      
      // Run the appropriate script
      const { execSync } = require('child_process');
      const scriptMap = {
        contractsDeployed: 'deploy:contracts',
        dataDAORegistered: 'register:datadao',
        proofConfigured: 'deploy:proof',
        refinerConfigured: 'deploy:refiner',
        uiConfigured: 'deploy:ui'
      };
      
      if (scriptMap[step]) {
        execSync(`npm run ${scriptMap[step]}`, { stdio: 'inherit' });
        output.success(`${step} completed successfully`);
      }
    } catch (error) {
      output.error(`${step} failed again: ${error.message}`);
      stateManager.recordError(step, error);
    }
  }
}

async function updateCredentials(stateManager) {
  const { credentialType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'credentialType',
      message: 'Which credentials would you like to update?',
      choices: [
        { name: '🔑 Pinata (IPFS storage)', value: 'pinata' },
        { name: '🔐 Google OAuth', value: 'google' },
        { name: '💰 Wallet private key', value: 'wallet' },
        { name: '📋 View current config', value: 'view' }
      ]
    }
  ]);

  switch (credentialType) {
    case 'pinata':
      const { pinataApiKey, pinataApiSecret } = await inquirer.prompt([
        {
          type: 'input',
          name: 'pinataApiKey',
          message: 'Pinata API Key:',
          default: stateManager.state.pinataApiKey
        },
        {
          type: 'password',
          name: 'pinataApiSecret',
          message: 'Pinata API Secret:',
          default: stateManager.state.pinataApiSecret
        }
      ]);
      stateManager.updateDeployment({ pinataApiKey, pinataApiSecret });
      output.success('Pinata credentials updated');
      break;

    case 'google':
      const { googleClientId, googleClientSecret } = await inquirer.prompt([
        {
          type: 'input',
          name: 'googleClientId',
          message: 'Google OAuth Client ID:',
          default: stateManager.state.googleClientId
        },
        {
          type: 'password',
          name: 'googleClientSecret',
          message: 'Google OAuth Client Secret:',
          default: stateManager.state.googleClientSecret
        }
      ]);
      stateManager.updateDeployment({ googleClientId, googleClientSecret });
      output.success('Google OAuth credentials updated');
      break;

    case 'view':
      output.summary('Current Configuration', [
        { label: 'Pinata API Key', value: stateManager.state.pinataApiKey ? '***' + stateManager.state.pinataApiKey.slice(-4) : 'Not set' },
        { label: 'Google Client ID', value: stateManager.state.googleClientId || 'Not set' },
        { label: 'Wallet Address', value: stateManager.state.address || 'Not set' }
      ]);
      break;
  }
}

function showDetailedErrors(errors) {
  if (!errors || Object.keys(errors).length === 0) {
    output.info('No errors recorded');
    return;
  }

  output.step('Detailed Error Information');
  
  for (const [step, error] of Object.entries(errors)) {
    console.log(chalk.red.bold(`❌ ${step}`));
    console.log(chalk.gray(`   Time: ${new Date(error.timestamp).toLocaleString()}`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    console.log();
  }
}

// Run the status check
showStatus();