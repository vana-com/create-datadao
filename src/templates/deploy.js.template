const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Main deployment orchestrator - follows tutorial order
 */
async function deployAll() {
  console.log(chalk.blue('🚀 DataDAO Deployment Orchestrator'));
  console.log();
  console.log('This follows the official tutorial order for best results.');
  console.log();

  try {
    // Load deployment state
    const deploymentPath = path.join(process.cwd(), 'deployment.json');
    let deployment = {};

    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    const state = deployment.state || {};

    // Show current progress
    console.log(chalk.blue('📊 Current Progress:'));
    console.log(`  ${state.contractsDeployed ? '✅' : '⏸️'} Smart contracts deployed`);
    console.log(`  ${state.dataDAORegistered ? '✅' : '⏸️'} DataDAO registered`);
    console.log(`  ${state.proofGitSetup ? '✅' : '⏸️'} GitHub repositories setup`);
    console.log(`  ${state.proofConfigured ? '✅' : '⏸️'} Proof of contribution configured`);
    console.log(`  ${state.refinerConfigured ? '✅' : '⏸️'} Data refiner configured`);
    console.log(`  ${state.uiConfigured ? '✅' : '⏸️'} UI configured`);
    console.log();

    // Step 1: Deploy Contracts (if not done)
    if (!state.contractsDeployed) {
      console.log(chalk.blue('📋 Step 1: Deploy Smart Contracts'));
      console.log();

      const { deployContracts } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployContracts',
          message: 'Deploy smart contracts now?',
          default: true
        }
      ]);

      if (deployContracts) {
        console.log(chalk.blue('Running contract deployment...'));
        execSync('npm run deploy:contracts', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping contract deployment. Run manually: npm run deploy:contracts'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 1: Smart contracts already deployed'));
    }

    // Reload state after contracts
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    // Step 2: Register DataDAO (if not done)
    if (!deployment.state?.dataDAORegistered) {
      console.log(chalk.blue('📋 Step 2: Register DataDAO'));
      console.log();

      const { registerDataDAO } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'registerDataDAO',
          message: 'Register DataDAO now?',
          default: true
        }
      ]);

      if (registerDataDAO) {
        console.log(chalk.blue('Running DataDAO registration...'));
        execSync('npm run register:datadao', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping DataDAO registration. Run manually: npm run register:datadao'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 2: DataDAO already registered'));
    }

    // Reload state after registration
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    // Step 3: Configure Proof (follows tutorial order)
    if (!deployment.state?.proofConfigured) {
      console.log(chalk.blue('📋 Step 3: Configure Proof of Contribution'));
      console.log();
      console.log(chalk.yellow('⚠️  This requires GitHub repositories to be set up first.'));
      console.log('If you haven\'t forked the repositories yet, please do so before continuing.');
      console.log();

      const { deployProof } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployProof',
          message: 'Configure proof of contribution now?',
          default: true
        }
      ]);

      if (deployProof) {
        console.log(chalk.blue('Running proof configuration...'));
        execSync('npm run deploy:proof', { stdio: 'inherit' });
        console.log();
      } else {
        console.log(chalk.yellow('Skipping proof configuration. Run manually: npm run deploy:proof'));
        console.log(chalk.yellow('Note: This is required for data validation.'));
        return;
      }
    } else {
      console.log(chalk.green('✅ Step 3: Proof of contribution already configured'));
    }

    // Step 4: Configure Refiner (follows tutorial order)
    if (!deployment.state?.refinerConfigured) {
      console.log(chalk.blue('📋 Step 4: Configure Data Refiner'));
      console.log();
      console.log('This structures contributed data into queryable databases.');
      console.log(chalk.yellow('⚠️  Requires GitHub repositories to be set up first.'));

      if (!deployment.state?.refinerGitSetup) {
        console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
        console.log();
      }

      const { deployRefiner } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployRefiner',
          message: deployment.state?.refinerGitSetup ? 'Configure data refiner now?' : 'Skip refiner configuration (requires GitHub setup)?',
          default: deployment.state?.refinerGitSetup || false
        }
      ]);

      if (deployRefiner && deployment.state?.refinerGitSetup) {
        console.log();
        console.log(chalk.blue('🔧 Configuring data refiner...'));
        try {
          execSync('npm run deploy:refiner', { stdio: 'inherit' });
          console.log();
          console.log(chalk.green('✅ Data refiner configured successfully!'));
        } catch (error) {
          console.log();
          console.log(chalk.red('❌ Refiner configuration failed'));
          console.log(chalk.yellow('You can try again later with: npm run deploy:refiner'));
          console.log();
        }
      } else {
        console.log();
        console.log(chalk.yellow('⏸️  Skipping refiner configuration for now.'));
        if (!deployment.state?.refinerGitSetup) {
          console.log('Complete GitHub setup first, then run: ' + chalk.cyan('npm run deploy:refiner'));
        } else {
          console.log('You can configure later with: ' + chalk.cyan('npm run deploy:refiner'));
        }
        console.log();
      }
    } else {
      console.log(chalk.green('✅ Step 4: Data refiner already configured'));
    }

    // Step 5: Configure UI (follows tutorial order)
    if (!deployment.state?.uiConfigured) {
      console.log(chalk.blue('📋 Step 5: Configure UI'));
      console.log();
      console.log('This sets up the user interface for data contributions.');

      const { deployUI } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deployUI',
          message: 'Configure UI now?',
          default: true
        }
      ]);

      if (deployUI) {
        console.log();
        console.log(chalk.blue('🎨 Configuring UI...'));
        try {
          execSync('npm run deploy:ui', { stdio: 'inherit' });
          console.log();
          console.log(chalk.green('✅ UI configured successfully!'));
        } catch (error) {
          console.log();
          console.log(chalk.red('❌ UI configuration failed'));
          console.log(chalk.yellow('You can try again later with: npm run deploy:ui'));
          console.log();
        }
      } else {
        console.log();
        console.log(chalk.yellow('⏸️  Skipping UI configuration for now.'));
        console.log('You can configure later with: ' + chalk.cyan('npm run deploy:ui'));
        console.log();
      }
    } else {
      console.log(chalk.green('✅ Step 5: UI already configured'));
    }

    // Final status
    console.log(chalk.green('🎉 DataDAO deployment completed!'));
    console.log();
    console.log(chalk.blue('🎯 Your DataDAO is ready to use:'));
    console.log('  • Test the UI: ' + chalk.cyan('npm run ui:dev'));
    console.log('  • Visit: ' + chalk.cyan('http://localhost:3000'));
    console.log('  • Check status: ' + chalk.cyan('npm run status'));
    console.log();
    console.log(chalk.blue('📚 Next steps:'));
    console.log('  • Test the data contribution flow');
    console.log('  • Customize your validation logic');
    console.log('  • Deploy to production when ready');

  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error.message);
    console.log();
    console.log(chalk.yellow('You can resume deployment by running:'));
    console.log('  • ' + chalk.cyan('npm run status') + ' - Check current progress');
    console.log('  • ' + chalk.cyan('npm run deploy') + ' - Resume deployment');
    console.log();
    console.log(chalk.yellow('Or run individual steps:'));
    console.log('  • ' + chalk.cyan('npm run deploy:contracts') + ' - Deploy contracts');
    console.log('  • ' + chalk.cyan('npm run register:datadao') + ' - Register DataDAO');
    console.log('  • ' + chalk.cyan('npm run deploy:proof') + ' - Configure proof');
    console.log('  • ' + chalk.cyan('npm run deploy:refiner') + ' - Configure refiner');
    console.log('  • ' + chalk.cyan('npm run deploy:ui') + ' - Configure UI');
    process.exit(1);
  }
}

// Run deployment
deployAll(); 