const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { deriveWalletFromPrivateKey } = require('./wallet');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');
const TemplateEngine = require('./template-engine');

/**
 * Generate a complete DataDAO project from templates
 */
async function generateTemplate(targetDir, config) {
  const spinner = ora('Generating DataDAO project...').start();

  try {
    // Ensure wallet credentials are derived
    if (!config.address || !config.publicKey) {
      spinner.text = 'Deriving wallet credentials...';
      const derivedWallet = deriveWalletFromPrivateKey(config.privateKey);
      config.address = derivedWallet.address;
      config.publicKey = derivedWallet.publicKey;
    }

    // Ensure target directory exists
    fs.ensureDirSync(targetDir);

    // Clone repositories
    await cloneRepositories(targetDir, config);
    spinner.text = 'Repositories cloned successfully';

    // Generate configuration files
    await generateConfigFiles(targetDir, config);
    spinner.text = 'Configuration files generated';

    // Set up GitHub repositories if username is provided
    if (config.githubUsername) {
      spinner.text = 'Setting up GitHub repositories...';
      try {
        // Determine if this is quick mode (no proofRepo/refinerRepo set yet)
        const isQuickMode = !config.proofRepo && !config.refinerRepo;
        const repoSetup = await guideGitHubSetup(config, isQuickMode);
        
        if (repoSetup && repoSetup.proofRepo && repoSetup.refinerRepo) {
          config.proofRepo = repoSetup.proofRepo;
          config.refinerRepo = repoSetup.refinerRepo;
          
          // Update deployment.json with the repository URLs
          const deploymentPath = path.join(targetDir, 'deployment.json');
          if (fs.existsSync(deploymentPath)) {
            const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
            deployment.proofRepo = repoSetup.proofRepo;
            deployment.refinerRepo = repoSetup.refinerRepo;
            deployment.state = deployment.state || {};
            deployment.state.proofGitSetup = true;
            deployment.state.refinerGitSetup = true;
            fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
          }
        }
      } catch (error) {
          // Don't fail the entire setup if GitHub repos fail
          spinner.text = 'GitHub setup skipped (can be configured later)';
      }
    }

    // Generate root package.json
    await generateRootPackageJson(targetDir, config);
    spinner.text = 'Root package.json generated';

    // Generate deployment scripts
    await generateDeploymentScripts(targetDir, config);
    spinner.text = 'Deployment scripts generated';

    // Install dependencies
    console.log(); // Add space before dependency installation
    const depSpinner = ora({
      text: 'Installing project dependencies...\n' +
            chalk.yellow('💡 This usually takes 1-3 minutes depending on your internet connection\n') +
            chalk.gray('   • Installing root dependencies\n') +
            chalk.gray('   • Installing smart contract dependencies\n') +
            chalk.gray('   • Installing UI dependencies'),
      spinner: 'dots'
    }).start();

    try {
      // Install root dependencies
      depSpinner.text = chalk.blue('Installing root dependencies...\n') +
                        chalk.gray('This includes deployment scripts and CLI tools');
      execSync('npm install', { cwd: targetDir, stdio: 'pipe' });
      depSpinner.text = chalk.green('✅ Root dependencies installed\n') +
                        chalk.blue('Installing smart contract dependencies...\n') +
                        chalk.gray('This includes Hardhat, OpenZeppelin, and Viem');

      // Install contract dependencies
      execSync('npm install', { cwd: path.join(targetDir, 'contracts'), stdio: 'pipe' });
      depSpinner.text = chalk.green('✅ Root dependencies installed\n') +
                        chalk.green('✅ Smart contract dependencies installed\n') +
                        chalk.blue('Installing UI dependencies...\n') +
                        chalk.gray('This includes Next.js, React, and authentication libraries');

      // Install UI dependencies
      execSync('npm install', { cwd: path.join(targetDir, 'ui'), stdio: 'pipe' });
      depSpinner.succeed(chalk.green('✅ All dependencies installed successfully!'));
    } catch (error) {
      depSpinner.fail(chalk.red('❌ Failed to install some dependencies automatically'));
      console.log(chalk.yellow('You may need to run these commands manually:'));
      console.log(chalk.cyan('  cd ' + path.basename(targetDir)));
      console.log(chalk.cyan('  npm install'));
      console.log(chalk.cyan('  cd contracts && npm install'));
      console.log(chalk.cyan('  cd ../ui && npm install'));
      console.log();
    }

    spinner.succeed('DataDAO project generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating DataDAO project');
    throw error;
  }
}

/**
 * Clone repositories into the target directory
 */
async function cloneRepositories(targetDir, config) {
  const spinner = ora('Setting up repositories...').start();

  try {
    // Create subdirectories for each component
    const dirs = ['contracts', 'proof', 'refiner', 'ui'];
    dirs.forEach(dir => {
      fs.ensureDirSync(path.join(targetDir, dir));
    });

    // Clone repositories
    const repositories = [
      {
        url: 'https://github.com/vana-com/vana-smart-contracts.git',
        dir: 'contracts',
        branch: 'develop',
        removeGit: true // Contracts are never pushed back
      },
      {
        url: config.proofRepo || 'https://github.com/vana-com/vana-satya-proof-template-py.git',
        dir: 'proof',
        branch: 'main',
        removeGit: false // Keep git for pushing changes
      },
      {
        url: config.refinerRepo || 'https://github.com/vana-com/vana-data-refinement-template.git',
        dir: 'refiner',
        branch: 'main',
        removeGit: false // Keep git for pushing changes
      },
      {
        url: 'https://github.com/vana-com/dlp-ui-template.git',
        dir: 'ui',
        branch: 'main',
        removeGit: true // UI template, not pushed back
      }
    ];

    for (const repo of repositories) {
      spinner.text = `Cloning ${repo.dir}...`;

      const targetPath = path.join(targetDir, repo.dir);

      // Clone repository with full history for repos we'll push to
      const cloneCmd = repo.removeGit
        ? `git clone --depth 1 --branch ${repo.branch} ${repo.url} ${targetPath}`
        : `git clone --branch ${repo.branch} ${repo.url} ${targetPath}`;

      execSync(cloneCmd, { stdio: 'pipe' });

      // Only remove .git for repos we don't push back to
      if (repo.removeGit) {
        const gitDir = path.join(targetPath, '.git');
        if (fs.existsSync(gitDir)) {
          fs.removeSync(gitDir);
        }
      }
    }

    spinner.succeed('Repositories cloned successfully');
    return true;
  } catch (error) {
    spinner.fail('Error cloning repositories');
    throw error;
  }
}

/**
 * Generate configuration files for all components
 */
async function generateConfigFiles(targetDir, config) {
  const spinner = ora('Generating configuration files...').start();

  try {
    const templateEngine = new TemplateEngine();
    const defaultConfig = templateEngine.getDefaultVanaConfig();
    
    // Add entropy variables for unique salt generation
    const entropyVariables = {
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substring(2, 8)
    };
    
    const variables = { ...defaultConfig, ...config, ...entropyVariables };

    // Generate all environment files using templates
    const envTemplates = [
      {
        template: 'env/contracts.env.template',
        target: path.join(targetDir, 'contracts', '.env'),
        variables
      },
      {
        template: 'env/refiner.env.template',
        target: path.join(targetDir, 'refiner', '.env'),
        variables
      },
      {
        template: 'env/ui.env.template',
        target: path.join(targetDir, 'ui', '.env'),
        variables
      }
    ];

    // Process all environment templates
    const results = templateEngine.processMultipleTemplates(envTemplates);

    // Check for any failures
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      failed.forEach(f => {
        console.warn(`Warning: Failed to generate ${f.target}: ${f.error}`);
      });
    }

    // Generate initial deployment.json
    const deployment = {
      dlpName: config.dlpName,
      tokenName: config.tokenName,
      tokenSymbol: config.tokenSymbol,
      privateKey: config.privateKey,
      address: config.address,
      publicKey: config.publicKey,
      githubUsername: config.githubUsername,
      pinataApiKey: config.pinataApiKey,
      pinataApiSecret: config.pinataApiSecret,
      googleClientId: config.googleClientId,
      googleClientSecret: config.googleClientSecret,
      proofRepo: config.proofRepo || null,
      refinerRepo: config.refinerRepo || null,
      network: config.network,
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      state: {
        contractsDeployed: false,
        dataDAORegistered: false,
        proofConfigured: false,
        proofPublished: false,
        refinerConfigured: false,
        refinerPublished: false,
        uiConfigured: false,
        proofGitSetup: config.proofRepo ? true : false,
        refinerGitSetup: config.refinerRepo ? true : false
      }
    };

    fs.writeFileSync(
      path.join(targetDir, 'deployment.json'),
      JSON.stringify(deployment, null, 2)
    );

    spinner.succeed('Configuration files generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating configuration files');
    throw error;
  }
}

/**
 * Generate root package.json with deployment scripts
 */
async function generateRootPackageJson(targetDir, config) {
  const spinner = ora('Generating root package.json...').start();

  try {
    const templateEngine = new TemplateEngine();
    const variables = {
      name: config.dlpName.toLowerCase().replace(/\s+/g, ''),
      dlpName: config.dlpName
    };

    templateEngine.processTemplateToFile(
      'package.json.template',
      path.join(targetDir, 'package.json'),
      variables
    );

    spinner.succeed('Root package.json generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating root package.json');
    throw error;
  }
}

/**
 * Generate deployment scripts using templates
 */
async function generateDeploymentScripts(targetDir, config) {
  const spinner = ora('Generating deployment scripts...').start();

  try {
    // Create scripts directory
    const scriptsDir = path.join(targetDir, 'scripts');
    fs.ensureDirSync(scriptsDir);

    // Create lib directory and copy required utility files
    const libDir = path.join(targetDir, 'lib');
    fs.ensureDirSync(libDir);

    // Copy output.js from the create-datadao lib directory to the project lib directory
    const sourceOutputPath = path.join(__dirname, 'output.js');
    const targetOutputPath = path.join(libDir, 'output.js');
    fs.copyFileSync(sourceOutputPath, targetOutputPath);
    spinner.text = 'Copied output utility';

    // Copy existing automated scripts from templates
    const templateScripts = [
      'state-manager.js',
      'deploy-proof.js',
      'deploy-refiner.js',
      'deploy-ui.js',
      'setup.js',
      'status.js'
    ];

    templateScripts.forEach(scriptName => {
      const templatePath = path.join(__dirname, '..', 'src', 'templates', scriptName);
      const targetPath = path.join(scriptsDir, scriptName);

      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, targetPath);
        spinner.text = `Copied ${scriptName}`;
      }
    });

    // Use template engine for complex scripts that need variable substitution
    const templateEngine = new TemplateEngine();
    const defaultConfig = templateEngine.getDefaultVanaConfig();
    
    // Add entropy variables for unique salt generation
    const entropyVariables = {
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substring(2, 8)
    };
    
    const variables = { ...defaultConfig, ...config, ...entropyVariables };

    // Generate deploy-contracts.js from template
    templateEngine.processTemplateToFile(
      'deploy-contracts.js.template',
      path.join(scriptsDir, 'deploy-contracts.js'),
      variables
    );

    // Generate register-datadao.js from template
    templateEngine.processTemplateToFile(
      'register-datadao.js.template',
      path.join(scriptsDir, 'register-datadao.js'),
      variables
    );

    // Generate deploy.js orchestrator script from template
    templateEngine.processTemplateToFile(
      'deploy.js.template',
      path.join(scriptsDir, 'deploy.js'),
      variables
    );

    spinner.succeed('Deployment scripts generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating deployment scripts');
    throw error;
  }
}

/**
 * Guide user through next steps in the CORRECT tutorial order
 */
async function guideNextSteps(targetDir, config) {
  console.log();
  console.log(chalk.blue('🚀 Let\'s complete your DataDAO setup step by step!'));
  console.log();
  console.log(chalk.yellow('Following the official tutorial order for best results.'));
  console.log();

  // Load current deployment state
  const deploymentPath = path.join(targetDir, 'deployment.json');
  let deployment = {};
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  const state = deployment.state || {};

  // Step 1: GitHub Setup (must come first - registration depends on this)
  if (!state.proofGitSetup || !state.refinerGitSetup) {
    console.log(chalk.blue('📋 Step 1: Set up GitHub repositories'));
    console.log();
    console.log('Your DataDAO needs template repositories for proof validation and data refinement.');
    console.log(chalk.yellow('⚠️  This step is required before configuring proof/refiner components.'));
    console.log();

    const { proceedWithGitHub } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedWithGitHub',
        message: 'Do you want to set up GitHub repositories now?',
        default: true
      }
    ]);

    if (proceedWithGitHub) {
      const githubResult = await guideGitHubSetup(config);
      // Update state to reflect GitHub setup completion
      deployment.state = deployment.state || {};
      deployment.state.proofGitSetup = true;
      deployment.state.refinerGitSetup = true;

      // Save the repository URLs
      if (githubResult.proofRepo) {
        deployment.proofRepo = githubResult.proofRepo;
      }
      if (githubResult.refinerRepo) {
        deployment.refinerRepo = githubResult.refinerRepo;
      }

      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

      console.log();
      console.log(chalk.green('✅ GitHub repositories configured and saved'));
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping GitHub setup for now.'));
      console.log(chalk.red('⚠️  Warning: Proof and refiner configuration requires GitHub repositories.'));
      console.log('You can complete this later, but it\'s needed for the next steps.');
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 1: GitHub repositories already set up'));
  }

  // Reload state after GitHub setup
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  // Step 2: Register DataDAO (required before proof configuration)
  if (!deployment.state?.dataDAORegistered) {
    console.log(chalk.blue('📋 Step 2: Register DataDAO'));
    console.log();
    console.log('This registers your DataDAO with the Vana network so it can accept data contributions.');
    console.log(chalk.yellow('⚠️  This requires additional VANA tokens for registration fees.'));
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
      console.log();
      console.log(chalk.blue('🏁 Registering your DataDAO...'));
      try {
        execSync('npm run register:datadao', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ DataDAO registered successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ DataDAO registration failed'));
        console.log(chalk.yellow('This is usually due to insufficient VANA tokens or network issues.'));
        console.log(chalk.yellow('You can try again later with: npm run register:datadao'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping DataDAO registration for now.'));
      console.log('You can register later with: ' + chalk.cyan('npm run register:datadao'));
      console.log(chalk.red('⚠️  Warning: Proof configuration requires registration to get dlpId.'));
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 2: DataDAO already registered'));
  }

  // Reload state after registration
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }

  // Step 3: Configure Proof of Contribution (requires dlpId from registration)
  if (!deployment.state?.proofConfigured) {
    console.log(chalk.blue('📋 Step 3: Configure Proof of Contribution'));
    console.log();
    console.log('This validates that contributed data is authentic and meets your criteria.');
    console.log(chalk.yellow('⚠️  Requires GitHub repositories and DataDAO registration.'));

    if (!deployment.state?.proofGitSetup) {
      console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
      console.log();
    }

    if (!deployment.state?.dataDAORegistered) {
      console.log(chalk.red('⚠️  DataDAO registration required first. Please complete Step 2.'));
      console.log();
    }

    const canConfigureProof = deployment.state?.proofGitSetup && deployment.state?.dataDAORegistered;

    const { configureProof } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureProof',
        message: canConfigureProof ? 'Configure proof of contribution now?' : 'Skip proof configuration (requires GitHub setup and registration)?',
        default: canConfigureProof || false
      }
    ]);

    if (configureProof && canConfigureProof) {
      console.log();
      console.log(chalk.blue('🔍 Configuring proof of contribution...'));
      try {
        execSync('npm run deploy:proof', { stdio: 'inherit', cwd: targetDir });
        console.log();
        console.log(chalk.green('✅ Proof of contribution configured successfully!'));
      } catch (error) {
        console.log();
        console.log(chalk.red('❌ Proof configuration failed'));
        console.log(chalk.yellow('You can try again later with: npm run deploy:proof'));
        console.log();
      }
    } else {
      console.log();
      console.log(chalk.yellow('⏸️  Skipping proof configuration for now.'));
      if (!canConfigureProof) {
        console.log('Complete GitHub setup and registration first, then run: ' + chalk.cyan('npm run deploy:proof'));
      } else {
        console.log('You can configure later with: ' + chalk.cyan('npm run deploy:proof'));
      }
      console.log();
    }
  } else {
    console.log(chalk.green('✅ Step 3: Proof of contribution already configured'));
  }

  // Step 4: Configure Data Refiner (follows tutorial order)
  if (!deployment.state?.refinerConfigured) {
    console.log(chalk.blue('📋 Step 4: Configure Data Refiner'));
    console.log();
    console.log('This structures contributed data into queryable databases.');
    console.log(chalk.yellow('⚠️  Requires GitHub repositories to be set up first.'));

    if (!deployment.state?.refinerGitSetup) {
      console.log(chalk.red('⚠️  GitHub setup required first. Please complete Step 1.'));
      console.log();
    }

    const { configureRefiner } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureRefiner',
        message: deployment.state?.refinerGitSetup ? 'Configure data refiner now?' : 'Skip refiner configuration (requires GitHub setup)?',
        default: deployment.state?.refinerGitSetup || false
      }
    ]);

    if (configureRefiner && deployment.state?.refinerGitSetup) {
      console.log();
      console.log(chalk.blue('🔧 Configuring data refiner...'));
      try {
        execSync('npm run deploy:refiner', { stdio: 'inherit', cwd: targetDir });
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

    const { configureUI } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configureUI',
        message: 'Configure UI now?',
        default: true
      }
    ]);

    if (configureUI) {
      console.log();
      console.log(chalk.blue('🎨 Configuring UI...'));
      try {
        execSync('npm run deploy:ui', { stdio: 'inherit', cwd: targetDir });
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

  // Step 6: Test the UI (NON-BLOCKING)
  console.log(chalk.blue('📋 Step 6: Test your DataDAO UI'));
  console.log();
  console.log('Let\'s verify the user interface is working correctly.');
  console.log(chalk.yellow('💡 This will show you how to start the UI, but won\'t block the setup process.'));
  console.log();

  const { showUIInstructions } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showUIInstructions',
      message: 'Show UI testing instructions?',
      default: true
    }
  ]);

  if (showUIInstructions) {
    console.log();
    console.log(chalk.blue('🎨 UI Testing Instructions:'));
    console.log();
    console.log(chalk.cyan('To test your UI:'));
    console.log('1. Open a new terminal window');
    console.log(`2. Navigate to your project: ${chalk.yellow(`cd ${targetDir}`)}`);
    console.log(`3. Start the UI: ${chalk.yellow('npm run ui:dev')}`);
    console.log('4. Visit http://localhost:3000 in your browser');
    console.log('5. Test the data contribution flow');
    console.log('6. Press Ctrl+C in the UI terminal when done');
    console.log();
    console.log(chalk.yellow('💡 The UI will run in the background while you continue with other tasks.'));
    console.log();

    const { openUILater } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openUILater',
        message: 'Got it! I\'ll test the UI separately.',
        default: true
      }
    ]);

    if (openUILater) {
      console.log(chalk.green('✅ UI testing instructions provided'));
    }
  } else {
    console.log();
    console.log(chalk.yellow('⏸️  Skipping UI testing instructions.'));
    console.log('You can test the UI anytime with: ' + chalk.cyan('npm run ui:dev'));
    console.log();
  }

  // Final status and next steps
  console.log();
  console.log(chalk.blue('📊 Setup Summary:'));
  console.log('  ✅ Smart contracts deployed');
  console.log(`  ${deployment.state?.dataDAORegistered ? '✅' : '⏸️'} DataDAO registered`);
  console.log(`  ${deployment.state?.proofGitSetup ? '✅' : '⏸️'} GitHub repositories setup`);
  console.log(`  ${deployment.state?.proofConfigured ? '✅' : '⏸️'} Proof of contribution configured`);
  console.log(`  ${deployment.state?.refinerConfigured ? '✅' : '⏸️'} Data refiner configured`);
  console.log(`  ${deployment.state?.uiConfigured ? '✅' : '⏸️'} UI configured`);
  console.log();

  // Check completion status
  const coreStepsCompleted = deployment.state?.dataDAORegistered && deployment.state?.proofConfigured && deployment.state?.refinerConfigured && deployment.state?.uiConfigured;

  if (coreStepsCompleted) {
    console.log(chalk.green('🎉 Your DataDAO is fully configured and ready!'));
    console.log();
    console.log(chalk.blue('🎯 What you can do now:'));
    console.log('  • Test the UI with: ' + chalk.cyan('npm run ui:dev'));
    console.log('  • Start accepting data contributions');
    console.log('  • Customize your validation logic and schemas');
    console.log('  • Deploy to production when ready');
  } else {
    console.log(chalk.yellow('⚠️  Your DataDAO needs additional configuration to be fully functional'));
    console.log();
    console.log(chalk.blue('🎯 To complete setup:'));
    if (!deployment.state?.dataDAORegistered) {
      console.log('  • Register DataDAO: ' + chalk.cyan('npm run register:datadao'));
    }
    if (!deployment.state?.proofGitSetup || !deployment.state?.refinerGitSetup) {
      console.log('  • Set up GitHub repositories (required for proof/refiner)');
    }
    if (!deployment.state?.proofConfigured) {
      console.log('  • Configure proof of contribution: ' + chalk.cyan('npm run deploy:proof'));
    }
    if (!deployment.state?.refinerConfigured) {
      console.log('  • Configure data refiner: ' + chalk.cyan('npm run deploy:refiner'));
    }
    if (!deployment.state?.uiConfigured) {
      console.log('  • Configure UI: ' + chalk.cyan('npm run deploy:ui'));
    }
  }

  console.log();
  console.log(chalk.blue('📁 Project location: ') + targetDir);
  console.log(chalk.blue('📚 Check progress anytime: ') + chalk.cyan('npm run status'));
  console.log(chalk.blue('📚 Resume setup anytime: ') + chalk.cyan('npm run deploy'));
  console.log();
}

/**
 * ENHANCED: Guide GitHub repository setup with fresh repo creation
 */
async function guideGitHubSetup(config, quickMode = false) {
  if (!quickMode) {
    console.log();
    console.log(chalk.blue('🐙 GitHub Repository Setup'));
    console.log();
    console.log('We need to create 2 repositories for your DataDAO:');
    console.log('• Proof of Contribution - validates data authenticity');
    console.log('• Data Refinement - structures data for querying');
    console.log();
  }

  // Check GitHub CLI availability and authentication
  if (!quickMode) {
    console.log(chalk.blue('🔍 Checking GitHub CLI availability...'));
  }
  const ghStatus = await checkGitHubCLI();

  if (ghStatus.available && ghStatus.authenticated) {
    if (!quickMode) {
      console.log(chalk.green('✅ GitHub CLI detected and authenticated'));
      console.log(chalk.blue('📋 Available options:'));
      console.log('  1. Automated setup (recommended) - creates repos automatically');
      console.log('  2. Manual setup - you create repos via GitHub web interface');
      console.log();

      const { setupMethod } = await inquirer.prompt([
        {
          type: 'list',
          name: 'setupMethod',
          message: 'How would you like to set up repositories?',
          choices: [
            { name: '⚡ Automated setup using GitHub CLI (recommended)', value: 'auto' },
            { name: '🌐 Manual setup via GitHub website', value: 'manual' }
          ]
        }
      ]);

      if (setupMethod === 'auto') {
        return await createRepositoriesAutomatically(config);
      }
    } else {
      // Quick mode: automatically use GitHub CLI if available
      console.log(chalk.blue('🚀 Creating GitHub repositories automatically...'));
      return await createRepositoriesAutomatically(config, true);
    }
  } else if (ghStatus.available && !ghStatus.authenticated) {
    console.log(chalk.yellow('⚠️  GitHub CLI detected but not authenticated'));
    console.log();

    const { authenticateNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'authenticateNow',
        message: 'Would you like to authenticate with GitHub CLI now?',
        default: true
      }
    ]);

    if (authenticateNow) {
      console.log();
      console.log(chalk.blue('🔐 Starting GitHub CLI authentication...'));
      console.log(chalk.yellow('Follow the prompts in your terminal to complete authentication.'));
      console.log();

      try {
        execSync('gh auth login', { stdio: 'inherit' });

        // Re-check authentication after login
        const finalStatus = await checkGitHubCLI();
        if (finalStatus.authenticated) {
          console.log();
          console.log(chalk.green('✅ GitHub CLI authentication successful!'));

          const { useAutomationAfterAuth } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useAutomationAfterAuth',
              message: 'Create repositories automatically now?',
              default: true
            }
          ]);

          if (useAutomationAfterAuth) {
            return await createRepositoriesAutomatically(config);
          }
        } else {
          console.log(chalk.yellow('⚠️  Authentication may not have completed successfully.'));
          console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  GitHub CLI authentication failed or was cancelled.'));
        console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
      }
    } else {
      console.log(chalk.yellow('You can authenticate later with: gh auth login'));
      console.log();

      const { nextStep } = await inquirer.prompt([
        {
          type: 'list',
          name: 'nextStep',
          message: 'What would you like to do?',
          choices: [
            { name: '🔄 Retry GitHub setup (check CLI status again)', value: 'retry' },
            { name: '🌐 Continue with manual setup', value: 'manual' }
          ]
        }
      ]);

      if (nextStep === 'retry') {
        console.log();
        return await guideGitHubSetup(config);
      }
    }
  } else {
    console.log(chalk.yellow('⚠️  GitHub CLI not detected'));
    console.log();
    console.log(chalk.blue('📋 Available options:'));
    console.log('  1. Install GitHub CLI for automated setup');
    console.log('  2. Use manual setup via GitHub website');
    console.log();

    const { installChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'installChoice',
        message: 'What would you like to do?',
        choices: [
          { name: '📥 Install GitHub CLI (opens installation guide)', value: 'install' },
          { name: '🌐 Continue with manual setup', value: 'manual' }
        ]
      }
    ]);

    if (installChoice === 'install') {
      console.log();
      console.log(chalk.blue('📥 GitHub CLI Installation:'));
      console.log();
      console.log(chalk.cyan('Installation instructions:'));
      console.log('• Visit: https://cli.github.com/');
      console.log('• Follow installation instructions for your OS');
      console.log('• Run: gh auth login');
      console.log('• Then re-run this setup');
      console.log();

      const { installCompleted } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'installCompleted',
          message: 'Have you installed and authenticated GitHub CLI?',
          default: false
        }
      ]);

      if (installCompleted) {
        console.log();
        console.log(chalk.blue('🔍 Re-checking GitHub CLI...'));
        const newStatus = await checkGitHubCLI();

        if (newStatus.available && newStatus.authenticated) {
          console.log(chalk.green('✅ GitHub CLI detected and authenticated!'));

          const { useAutomationAfterInstall } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'useAutomationAfterInstall',
              message: 'Create repositories automatically now?',
              default: true
            }
          ]);

          if (useAutomationAfterInstall) {
            return await createRepositoriesAutomatically(config);
          }
        } else if (newStatus.available && !newStatus.authenticated) {
          console.log(chalk.yellow('⚠️  GitHub CLI detected but not authenticated'));
          console.log();

          const { authenticateNow } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'authenticateNow',
              message: 'Would you like to authenticate with GitHub CLI now?',
              default: true
            }
          ]);

          if (authenticateNow) {
            console.log();
            console.log(chalk.blue('🔐 Starting GitHub CLI authentication...'));
            console.log(chalk.yellow('Follow the prompts in your terminal to complete authentication.'));
            console.log();

            try {
              execSync('gh auth login', { stdio: 'inherit' });

              // Re-check authentication after login
              const finalStatus = await checkGitHubCLI();
              if (finalStatus.authenticated) {
                console.log();
                console.log(chalk.green('✅ GitHub CLI authentication successful!'));

                const { useAutomationAfterAuth } = await inquirer.prompt([
                  {
                    type: 'confirm',
                    name: 'useAutomationAfterAuth',
                    message: 'Create repositories automatically now?',
                    default: true
                  }
                ]);

                if (useAutomationAfterAuth) {
                  return await createRepositoriesAutomatically(config);
                }
              } else {
                console.log(chalk.yellow('⚠️  Authentication may not have completed successfully.'));
                console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
              }
            } catch (error) {
              console.log(chalk.yellow('⚠️  GitHub CLI authentication failed or was cancelled.'));
              console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
            }
          } else {
            console.log(chalk.yellow('You can authenticate later with: gh auth login'));
            console.log();

            const { nextStep } = await inquirer.prompt([
              {
                type: 'list',
                name: 'nextStep',
                message: 'What would you like to do?',
                choices: [
                  { name: '🔄 Retry GitHub setup (check CLI status again)', value: 'retry' },
                  { name: '🌐 Continue with manual setup', value: 'manual' }
                ]
              }
            ]);

            if (nextStep === 'retry') {
              console.log();
              return await guideGitHubSetup(config);
            }
          }
        } else {
          console.log(chalk.yellow('⚠️  GitHub CLI not detected'));
          console.log(chalk.yellow('Please ensure installation completed successfully'));
          console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
        }
      } else {
        console.log(chalk.yellow('For now, we\'ll continue with manual setup.'));
      }
      console.log();
    }
  }

  // Manual setup fallback
  return await guideManualRepositorySetup(config);
}

/**
 * Check GitHub CLI availability and authentication status
 */
async function checkGitHubCLI() {
  let available = false;
  let authenticated = false;

  // Check if GitHub CLI is installed
  try {
    execSync('gh --version', { stdio: 'pipe' });
    available = true;
  } catch (error) {
    return { available: false, authenticated: false };
  }

  // Check if user is authenticated
  try {
    const authStatus = execSync('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
    // If gh auth status succeeds and doesn't contain "not logged in", user is authenticated
    authenticated = !authStatus.toLowerCase().includes('not logged in') &&
                   !authStatus.toLowerCase().includes('not authenticated');
  } catch (error) {
    // gh auth status exits with non-zero code when not authenticated
    authenticated = false;
  }

  return { available, authenticated };
}

/**
 * Create repositories automatically using GitHub CLI
 */
async function createRepositoriesAutomatically(config, quickMode = false) {
  if (!quickMode) {
    console.log(chalk.blue('🚀 Creating repositories automatically...'));
  }

  // Defensive programming - ensure required config values exist
  if (!config.dlpName || !config.githubUsername) {
    console.error(chalk.red('❌ Missing required configuration:'));
    if (!config.dlpName) console.error('  • dlpName is required');
    if (!config.githubUsername) console.error('  • githubUsername is required');
    throw new Error('Missing required configuration for repository creation');
  }

  const repos = [
    {
      name: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-proof`,
      description: `Proof of Contribution for ${config.dlpName} DataDAO`,
      template: 'vana-com/vana-satya-proof-template-py'
    },
    {
      name: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-refiner`,
      description: `Data Refinement for ${config.dlpName} DataDAO`,
      template: 'vana-com/vana-data-refinement-template'
    }
  ];

  const createdRepos = [];

  for (const repo of repos) {
    try {
      if (!quickMode) {
        console.log(chalk.blue(`Creating ${repo.name}...`));
      }

      // Check if repo already exists
      try {
        execSync(`gh repo view ${config.githubUsername}/${repo.name}`, { stdio: 'pipe' });
        if (!quickMode) {
          console.log(chalk.yellow(`⚠️  Repository ${repo.name} already exists, skipping...`));
        }
        createdRepos.push(`https://github.com/${config.githubUsername}/${repo.name}`);
        continue;
      } catch (error) {
        // Repo doesn't exist, proceed with creation
      }

      // Create repository from template
      execSync(`gh repo create ${repo.name} --template ${repo.template} --public --description "${repo.description}"`, { stdio: 'pipe' });

      // Enable GitHub Actions
      execSync(`gh api repos/${config.githubUsername}/${repo.name}/actions/permissions --method PUT --field enabled=true --field allowed_actions=all`, { stdio: 'pipe' });

      const repoUrl = `https://github.com/${config.githubUsername}/${repo.name}`;
      createdRepos.push(repoUrl);
      if (!quickMode) {
        console.log(chalk.green(`✅ Created: ${repoUrl}`));
      }

    } catch (error) {
      if (!quickMode) {
        console.log(chalk.red(`❌ Failed to create ${repo.name}: ${error.message}`));

        // Provide specific guidance based on error type
        if (error.message.includes('authentication') || error.message.includes('401') || error.message.includes('403')) {
          console.log(chalk.yellow('💡 This appears to be an authentication issue.'));
          console.log(chalk.yellow('Try running: gh auth login'));
        } else if (error.message.includes('already exists')) {
          console.log(chalk.yellow('💡 Repository already exists. You can continue with manual setup.'));
        } else if (error.message.includes('rate limit')) {
          console.log(chalk.yellow('💡 GitHub API rate limit reached. Please wait a few minutes and try again.'));
        } else {
          console.log(chalk.yellow('💡 You can create this repository manually later.'));
        }
      }
      // In quick mode, silently continue - repos can be set up later
    }
  }

  if (createdRepos.length > 0) {
    if (!quickMode) {
      console.log();
      console.log(chalk.green('🎉 Repositories created successfully!'));
      console.log();
      console.log(chalk.blue('📋 Your repositories:'));
      createdRepos.forEach(url => console.log(`  ${url}`));
      console.log();
    }

    return {
      proofRepo: createdRepos[0],
      refinerRepo: createdRepos[1],
      automated: true
    };
  } else {
    if (!quickMode) {
      console.log(chalk.yellow('⚠️  No repositories were created automatically.'));
      console.log(chalk.yellow('This might be due to authentication issues or other GitHub API problems.'));
      console.log();
      console.log(chalk.blue('💡 Troubleshooting:'));
      console.log('• Check authentication: ' + chalk.cyan('gh auth status'));
      console.log('• Re-authenticate if needed: ' + chalk.cyan('gh auth login'));
      console.log('• Or continue with manual setup below');
      console.log();
      return await guideManualRepositorySetup(config);
    } else {
      // In quick mode, return null and let setup continue - repos can be configured later
      return {
        proofRepo: null,
        refinerRepo: null,
        automated: false
      };
    }
  }
}

/**
 * Guide manual repository setup
 */
async function guideManualRepositorySetup(config) {
  console.log(chalk.blue('📝 Manual Repository Setup'));
  console.log();
  console.log('Please create these repositories on GitHub:');
  console.log();

  // Defensive programming - ensure required config values exist
  if (!config.dlpName || !config.githubUsername) {
    console.error(chalk.red('❌ Missing required configuration:'));
    if (!config.dlpName) console.error('  • dlpName is required');
    if (!config.githubUsername) console.error('  • githubUsername is required');
    throw new Error('Missing required configuration for repository setup');
  }

  const suggestedNames = {
    proof: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-proof`,
    refiner: `${config.dlpName.toLowerCase().replace(/\s+/g, '-')}-refiner`
  };

  console.log(chalk.yellow('1. Proof of Contribution Repository:'));
  console.log(`   a) Go to: https://github.com/vana-com/vana-satya-proof-template-py`);
  console.log(`   b) Click "Use this template" → "Create a new repository"`);
  console.log(`   c) Name: ${suggestedNames.proof}`);
  console.log(`   d) Make it Public`);
  console.log(`   e) Click "Create repository"`);
  console.log(`   f) Go to Settings → Actions → General`);
  console.log(`   g) Enable "Allow all actions and reusable workflows"`);
  console.log();

  console.log(chalk.yellow('2. Data Refinement Repository:'));
  console.log(`   a) Go to: https://github.com/vana-com/vana-data-refinement-template`);
  console.log(`   b) Click "Use this template" → "Create a new repository"`);
  console.log(`   c) Name: ${suggestedNames.refiner}`);
  console.log(`   d) Make it Public`);
  console.log(`   e) Click "Create repository"`);
  console.log(`   f) Go to Settings → Actions → General`);
  console.log(`   g) Enable "Allow all actions and reusable workflows"`);
  console.log();

  const { proofRepo, refinerRepo } = await inquirer.prompt([
    {
      type: 'input',
      name: 'proofRepo',
      message: 'Enter the URL of your Proof repository:',
      default: `https://github.com/${config.githubUsername}/${suggestedNames.proof}`,
      validate: (input) => {
        if (!input.includes('github.com')) return 'Please enter a valid GitHub URL';
        return true;
      }
    },
    {
      type: 'input',
      name: 'refinerRepo',
      message: 'Enter the URL of your Refiner repository:',
      default: `https://github.com/${config.githubUsername}/${suggestedNames.refiner}`,
      validate: (input) => {
        if (!input.includes('github.com')) return 'Please enter a valid GitHub URL';
        return true;
      }
    }
  ]);

  return {
    proofRepo,
    refinerRepo,
    automated: false
  };
}

module.exports = {
  generateTemplate,
  guideNextSteps,
  guideGitHubSetup,
  checkGitHubCLI,
  createRepositoriesAutomatically,
  guideManualRepositorySetup
};