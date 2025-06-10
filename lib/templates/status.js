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
    
    // Auto-sync state flags based on actual data
    const syncedUpdates = stateManager.syncStateFromData();
    if (syncedUpdates) {
      console.log(chalk.blue('🔄 Syncing deployment state...'));
      Object.keys(syncedUpdates).forEach(key => {
        console.log(chalk.green(`   ✅ Detected completed: ${key}`));
      });
      console.log();
    }
    
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
    const hasIncompleteSteps = !stateManager.isCompleted('contractsDeployed') ||
                              !stateManager.isCompleted('dataDAORegistered') ||
                              !stateManager.isCompleted('proofConfigured') ||
                              !stateManager.isCompleted('refinerConfigured') ||
                              !stateManager.isCompleted('uiConfigured');

    if (hasErrors) {
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
    } else if (hasIncompleteSteps) {
      // Automatically resume the guided setup flow without asking
      console.log();
      output.info('Resuming guided setup from where you left off...');
      await resumeGuidedSetup(stateManager, deployment);
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
          'Test the contributor flow',
          'Note: If you run into any errors, please check the UI logs for more details'
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
        { label: 'Google Client ID', value: stateManager.state.googleClientId ? `${stateManager.state.googleClientId.slice(0, 20)}...` : 'Missing (required)' },
        { label: 'Wallet Address', value: stateManager.state.address || 'Not set' }
      ]);
      break;
  }
}

async function resumeGuidedSetup(stateManager, deployment) {
  const { execSync } = require('child_process');

  try {
    // Check wallet balance first
    if (!deployment.state.contractsDeployed) {
      output.step('Step 1: Deploy Smart Contracts', 'Checking wallet balance...');

      // Check if wallet needs funding
      const needsFunding = await checkWalletBalance(deployment.address);
      if (needsFunding) {
        output.warning('Your wallet needs VANA tokens to deploy contracts');
        console.log(chalk.yellow(`Please fund your wallet at: https://faucet.vana.org`));
        console.log(chalk.cyan(`Wallet address: ${deployment.address}`));
        console.log();

        const { readyToContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'readyToContinue',
            message: 'Have you funded your wallet?',
            default: false
          }
        ]);

        if (!readyToContinue) {
          output.info('Resume setup anytime by running: create-datadao status');
          return;
        }
      }

      // Deploy contracts
      output.step('Deploying contracts...', 'This may take a few minutes');

      try {
        execSync('npm run deploy:contracts', { stdio: 'inherit' });
        output.success('Smart contracts deployed successfully!');
      } catch (error) {
        output.error('Contract deployment failed');
        stateManager.recordError('contractsDeployed', error);
        return;
      }
    }

    // Register DataDAO
    if (!deployment.state.dataDAORegistered) {
      console.log();
      output.step('Step 2: Register DataDAO', 'Registering on Vana network...');

      try {
        execSync('npm run register:datadao', { stdio: 'inherit' });
        output.success('DataDAO registered successfully!');
      } catch (error) {
        output.error('Registration failed');
        stateManager.recordError('dataDAORegistered', error);
        return;
      }
    }

    // Setup GitHub repos if needed
    if (!deployment.proofRepo || !deployment.refinerRepo) {
      console.log();
      output.step('Step 3: GitHub Repository Setup', 'Creating repositories...');

      // Check if we have GitHub username, if not ask for it
      let githubUsername = deployment.githubUsername;
      if (!githubUsername) {
        const { username } = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: 'GitHub username:',
            validate: (input) => input.trim() !== '' || 'GitHub username is required'
          }
        ]);

        githubUsername = username;
        stateManager.updateDeployment({ githubUsername });
      }

      // Try automated GitHub setup
      let canUseAutomation = false;
      try {
        const { execSync } = require('child_process');
        execSync('gh --version', { stdio: 'pipe' });

        try {
          const authStatus = execSync('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
          canUseAutomation = !authStatus.toLowerCase().includes('not logged in') &&
                           !authStatus.toLowerCase().includes('not authenticated');
        } catch (error) {
          canUseAutomation = false;
        }
      } catch (error) {
        canUseAutomation = false;
      }

      if (canUseAutomation) {
        try {
          console.log(chalk.blue('🚀 Creating repositories automatically...'));

          // Create repositories using GitHub CLI
          const dlpName = deployment.dlpName;
          const repos = [
            {
              name: `${dlpName.toLowerCase().replace(/\s+/g, '-')}-proof`,
              description: `Proof of Contribution for ${dlpName} DataDAO`,
              template: 'vana-com/dlp-proof-template'
            },
            {
              name: `${dlpName.toLowerCase().replace(/\s+/g, '-')}-refiner`,
              description: `Data Refinement for ${dlpName} DataDAO`,
              template: 'vana-com/vana-data-refinement-template'
            }
          ];

          const createdRepos = [];
          for (const repo of repos) {
            try {
              // Check if repo already exists
              try {
                execSync(`gh repo view ${githubUsername}/${repo.name}`, { stdio: 'pipe' });
                console.log(chalk.green(`✅ Using existing repository: ${repo.name}`));
                createdRepos.push(`https://github.com/${githubUsername}/${repo.name}`);
                continue;
              } catch (error) {
                // Repo doesn't exist, proceed with creation
              }

              // Create repository from template
              execSync(`gh repo create ${repo.name} --template ${repo.template} --public --description "${repo.description}"`, { stdio: 'pipe' });

              // Enable GitHub Actions
              execSync(`gh api repos/${githubUsername}/${repo.name}/actions/permissions --method PUT --field enabled=true --field allowed_actions=all`, { stdio: 'pipe' });

              const repoUrl = `https://github.com/${githubUsername}/${repo.name}`;
              createdRepos.push(repoUrl);
              console.log(chalk.green(`✅ Created: ${repo.name}`));
            } catch (error) {
              console.log(chalk.yellow(`⚠️  Failed to create ${repo.name}, will need manual setup`));
            }
          }

          if (createdRepos.length >= 2) {
            // Update deployment with repo URLs
            stateManager.updateDeployment({
              proofRepo: createdRepos[0],
              refinerRepo: createdRepos[1]
            });

            console.log(chalk.green('✅ GitHub repositories configured'));
          } else {
            throw new Error('Failed to create required repositories');
          }
        } catch (error) {
          canUseAutomation = false;
        }
      }

      // Fall back to manual setup if automation failed
      if (!canUseAutomation) {
        console.log(chalk.yellow('⚠️  Automated GitHub setup not available'));
        console.log('Please set up repositories manually and update deployment.json');
        console.log();
        console.log(chalk.cyan('1. Create proof repository with: https://github.com/new?template_name=dlp-proof-template&template_owner=vana-com&visibility=public'));
        console.log(chalk.cyan('2. Create refiner repository from: https://github.com/new?template_name=vana-data-refinement-template&template_owner=vana-com&visibility=public'));
        console.log(chalk.cyan('3. Update deployment.json with the new repository URLs under "proofRepo" and "refinerRepo"'));
        console.log();

        const { skipGitHub } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'skipGitHub',
            message: 'Skip GitHub setup for now and continue?',
            default: true
          }
        ]);

        if (!skipGitHub) {
          output.info('Please set up GitHub repositories and run create-datadao status again');
          return;
        }
      }
    }

    // Deploy proof
    if (!deployment.state.proofConfigured) {
      console.log();
      output.step('Step 4: Deploy Proof System', 'Setting up proof of contribution...');

      try {
        execSync('npm run deploy:proof', { stdio: 'inherit' });
        output.success('Proof system deployed!');
      } catch (error) {
        output.error('Proof deployment failed');
        stateManager.recordError('proofConfigured', error);
        return;
      }
    }

    // Deploy refiner
    if (!deployment.state.refinerConfigured) {
      console.log();
      output.step('Step 5: Deploy Data Refiner', 'Setting up data refinement...');

      try {
        execSync('npm run deploy:refiner', { stdio: 'inherit' });
        output.success('Data refiner deployed!');
      } catch (error) {
        output.error('Refiner deployment failed');
        stateManager.recordError('refinerConfigured', error);
        return;
      }
    }

    // Configure UI
    if (!deployment.state.uiConfigured) {
      console.log();
      output.step('Step 6: Configure UI', 'Setting up user interface...');

      try {
        execSync('npm run deploy:ui', { stdio: 'inherit' });
        output.success('UI configured successfully!');
      } catch (error) {
        output.error('UI configuration failed');
        stateManager.recordError('uiConfigured', error);
        return;
      }
    }

    // All done!
    console.log();
    output.success('🎉 Your DataDAO is fully configured and ready to use!');
    output.nextSteps([
      'Start the UI: cd ui && npm run dev',
      'Visit: http://localhost:3000',
      'Test the contributor flow',
      'Note: If you run into any errors, please check the UI logs for more details'
    ]);

  } catch (error) {
    output.error(`Setup failed: ${error.message}`);
  }
}

async function checkWalletBalance(address) {
  // This is a placeholder - in real implementation, check actual balance
  // For now, we'll prompt the user
  return true;
}

function showDetailedErrors(errors) {
  if (!errors || Object.keys(errors).length === 0) {
    output.info('No errors recorded - all pending steps are waiting to be executed');
    console.log(chalk.gray('Use the commands shown above to continue setup'));
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