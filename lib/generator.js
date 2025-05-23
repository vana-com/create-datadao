const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { deriveWalletFromPrivateKey } = require('./wallet');

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
    await cloneRepositories(targetDir);
    spinner.text = 'Repositories cloned successfully';

    // Generate configuration files
    await generateConfigFiles(targetDir, config);
    spinner.text = 'Configuration files generated';

    // Generate root package.json
    await generateRootPackageJson(targetDir, config);
    spinner.text = 'Root package.json generated';

    // Generate deployment scripts
    await generateDeploymentScripts(targetDir, config);
    spinner.text = 'Deployment scripts generated';

    spinner.succeed('DataDAO project generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating DataDAO project');
    throw error;
  }
}

/**
 * Clone all required repositories
 */
async function cloneRepositories(targetDir) {
  const spinner = ora('Cloning repositories...').start();

  try {
    const repos = [
      {
        url: 'https://github.com/vana-com/vana-dlp-smart-contracts.git',
        dir: 'contracts'
      },
      // NOTE: Tutorial uses vana-smart-contracts/feat/VRC-20-ykyr but it has deployment issues
      // Keeping this working version until the tutorial repo is fixed
      // {
      //   url: 'https://github.com/vana-com/vana-smart-contracts.git',
      //   dir: 'contracts',
      //   branch: 'feat/VRC-20-ykyr'
      // },
      {
        url: 'https://github.com/vana-com/vana-satya-proof-template-py.git',
        dir: 'proof'
      },
      {
        url: 'https://github.com/vana-com/vana-data-refinement-template.git',
        dir: 'refiner'
      },
      {
        url: 'https://github.com/vana-com/dlp-ui-template.git',
        dir: 'ui'
      }
    ];

    for (const repo of repos) {
      const repoPath = path.join(targetDir, repo.dir);

      // Clone repository
      if (repo.branch) {
        execSync(`git clone -b ${repo.branch} ${repo.url} ${repoPath}`, { stdio: 'ignore' });
      } else {
        execSync(`git clone ${repo.url} ${repoPath}`, { stdio: 'ignore' });
      }

      // Remove .git directory to start fresh
      const gitDir = path.join(repoPath, '.git');
      if (fs.existsSync(gitDir)) {
        fs.removeSync(gitDir);
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
    // Generate contracts .env
    const contractsEnv = `DEPLOYER_PRIVATE_KEY=${config.privateKey}
OWNER_ADDRESS=${config.address}
DLP_NAME=${config.dlpName}
DLP_PUBLIC_KEY=${config.publicKey}
DLP_TOKEN_NAME=${config.tokenName}
DLP_TOKEN_SYMBOL=${config.tokenSymbol}
DLP_TOKEN_SALT=${config.tokenSymbol}
DLP_FILE_REWARD_FACTOR=10000000000000000000
DAT_TYPE=0

# Core contracts
ROOT_CONTRACT_ADDRESS=0xff14346dF2B8Fd0c95BF34f1c92e49417b508AD5
DATA_REGISTRY_CONTRACT_ADDRESS=0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C
TEE_POOL_CONTRACT_ADDRESS=0x3c92fD91639b41f13338CE62f19131e7d19eaa0D
DAT_FACTORY_CONTRACT_ADDRESS=0xcc63F29C559fF2420B0C525F28eD6e9801C9CAfB

# External dependencies
TRUSTED_FORWARDER_ADDRESS=0x0000000000000000000000000000000000000000

# Networks
VANA_RPC_URL=http://rpc.vana.org
VANA_API_URL=https://vanascan.io/api
VANA_BROWSER_URL=https://vanascan.io

SATORI_RPC_URL=http://rpc.satori.vana.org
SATORI_API_URL=https://api.satori.vanascan.io/api
SATORI_BROWSER_URL=https://satori.vanascan.io

MOKSHA_RPC_URL=https://rpc.moksha.vana.org
MOKSHA_API_URL=https://moksha.vanascan.io/api
MOKSHA_BROWSER_URL=https://moksha.vanascan.io
`;

    fs.writeFileSync(path.join(targetDir, 'contracts', '.env'), contractsEnv);

    // Generate refiner .env
    const refinerEnv = `PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
`;

    fs.writeFileSync(path.join(targetDir, 'refiner', '.env'), refinerEnv);

    // Generate UI .env
    const uiEnv = `PINATA_API_KEY=${config.pinataApiKey}
PINATA_API_SECRET=${config.pinataApiSecret}
GOOGLE_CLIENT_ID=${config.googleClientId}
GOOGLE_CLIENT_SECRET=${config.googleClientSecret}
`;

    fs.writeFileSync(path.join(targetDir, 'ui', '.env'), uiEnv);

    // Generate initial deployment.json
    const deployment = {
      dlpName: config.dlpName,
      tokenName: config.tokenName,
      tokenSymbol: config.tokenSymbol,
      address: config.address,
      githubUsername: config.githubUsername,
      publicKey: config.publicKey,
      // Store config for templates to use
      pinataApiKey: config.pinataApiKey,
      pinataApiSecret: config.pinataApiSecret,
      googleClientId: config.googleClientId,
      googleClientSecret: config.googleClientSecret,
      state: {
        contractsDeployed: false,
        dataDAORegistered: false,
        proofConfigured: false,
        proofPublished: false,
        refinerConfigured: false,
        refinerPublished: false,
        uiConfigured: false,
        proofGitSetup: false,
        refinerGitSetup: false
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
    const packageJson = {
      name: config.dlpName.toLowerCase().replace(/\s+/g, ''),
      version: '1.0.0',
      description: `${config.dlpName} - A DataDAO on the Vana network`,
      scripts: {
        setup: 'node scripts/setup.js',
        configure: 'node scripts/configure.js',
        status: 'node scripts/status.js',
        'deploy:contracts': 'node scripts/deploy-contracts.js',
        'register:datadao': 'node scripts/register-datadao.js',
        'deploy:proof': 'node scripts/deploy-proof.js',
        'deploy:refiner': 'node scripts/deploy-refiner.js',
        'deploy:ui': 'node scripts/deploy-ui.js',
        'deploy:all': 'npm run deploy:contracts && npm run register:datadao && npm run deploy:proof && npm run deploy:refiner && npm run deploy:ui',
        'ui:dev': 'cd ui && npm run dev',
        'ui:build': 'cd ui && npm run build'
      },
      dependencies: {
        chalk: '^4.1.2',
        'fs-extra': '^11.1.1',
        inquirer: '^8.2.5',
        ora: '^5.4.1'
      }
    };

    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    spinner.succeed('Root package.json generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating root package.json');
    throw error;
  }
}

/**
 * Generate deployment scripts from templates
 */
async function generateDeploymentScripts(targetDir, config) {
  const spinner = ora('Generating deployment scripts...').start();

  try {
    // Create scripts directory
    const scriptsDir = path.join(targetDir, 'scripts');
    fs.ensureDirSync(scriptsDir);

    // Get path to template directory
    const templatesDir = path.join(__dirname, '..', 'src', 'templates');

    // List of template files to copy
    const templateFiles = [
      'setup.js',
      'state-manager.js', 
      'status.js',
      'deploy-contracts.js',
      'register-datadao.js',
      'deploy-proof.js',
      'deploy-refiner.js',
      'deploy-ui.js',
      'test-all.js',
      'configure.js'
    ];

    // Copy each template file to scripts directory
    for (const file of templateFiles) {
      const sourcePath = path.join(templatesDir, file);
      const targetPath = path.join(scriptsDir, file);

      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        spinner.text = `Copied ${file}`;
      } else {
        console.warn(`Warning: Template file ${file} not found at ${sourcePath}`);
      }
    }

    spinner.succeed('Deployment scripts generated successfully');
    return true;
  } catch (error) {
    spinner.fail('Error generating deployment scripts');
    throw error;
  }
}

/**
 * Guide user through next steps in a structured way
 */
async function guideNextSteps(targetDir, config) {
  console.log();
  console.log(chalk.blue('🚀 Let\'s complete your DataDAO setup step by step!'));
  console.log();
  console.log(chalk.yellow('We\'ll guide you through each required step to get your DataDAO fully functional.'));
  console.log();

  // Step 1: GitHub Setup (must come first - registration depends on this)
  console.log(chalk.blue('📋 Step 1: Set up GitHub repositories'));
  console.log();
  console.log('Your DataDAO needs 3 template repositories to be fully functional.');
  console.log(chalk.yellow('⚠️  This step is required before registration - we need the proof URL from GitHub Actions.'));
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
    await guideGitHubSetup(config);
  } else {
    console.log();
    console.log(chalk.yellow('⏸️  Skipping GitHub setup for now.'));
    console.log(chalk.red('⚠️  Warning: DataDAO registration requires GitHub repositories to be set up first.'));
    console.log('You can set this up later, but you\'ll need to complete it before registration.');
    console.log();
  }

  // Step 2: Register DataDAO (depends on GitHub setup)
  console.log(chalk.blue('📋 Step 2: Register your DataDAO on the Vana network'));
  console.log();
  console.log('This step registers your DataDAO with the Vana network so it can accept data contributions.');
  console.log(chalk.yellow('⚠️  This requires additional VANA tokens for registration fees.'));

  if (!proceedWithGitHub) {
    console.log(chalk.red('⚠️  Registration requires GitHub repositories to be set up first.'));
    console.log('Please complete Step 1 before proceeding with registration.');
    console.log();
  }

  const { proceedWithRegistration } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceedWithRegistration',
      message: proceedWithGitHub ? 'Do you want to register your DataDAO now?' : 'Skip registration for now (requires GitHub setup)?',
      default: proceedWithGitHub
    }
  ]);

  if (proceedWithRegistration && proceedWithGitHub) {
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
    if (!proceedWithGitHub) {
      console.log('Complete GitHub setup first, then run: ' + chalk.cyan('npm run register:datadao'));
    } else {
      console.log('You can register later with: ' + chalk.cyan('npm run register:datadao'));
    }
    console.log();
  }

  // Step 3: Test the UI
  console.log(chalk.blue('📋 Step 3: Test your DataDAO UI'));
  console.log();
  console.log('Let\'s test the user interface to make sure everything is working correctly.');
  console.log();

  const { testUI } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'testUI',
      message: 'Do you want to test the UI now?',
      default: true
    }
  ]);

  if (testUI) {
    console.log();
    console.log(chalk.blue('🎨 Starting UI development server...'));
    console.log(chalk.yellow('This will open http://localhost:3000 in your browser'));
    console.log(chalk.yellow('Test the basic functionality, then press Ctrl+C to continue'));
    console.log();

    // Try to open browser
    setTimeout(() => {
      try {
        const open = require('open');
        open('http://localhost:3000').catch(() => {
          console.log(chalk.yellow('Could not open browser automatically. Please visit http://localhost:3000'));
        });
      } catch (e) {
        console.log(chalk.yellow('Please visit http://localhost:3000 in your browser'));
      }
    }, 2000);

    try {
      execSync('npm run ui:dev', { stdio: 'inherit', cwd: targetDir });
    } catch (error) {
      // User pressed Ctrl+C, which is expected
    }

    console.log();
    console.log(chalk.green('✅ UI testing completed'));
  } else {
    console.log();
    console.log(chalk.yellow('⏸️  Skipping UI testing for now.'));
    console.log('You can test the UI later with: ' + chalk.cyan('npm run ui:dev'));
    console.log();
  }

  // Final status and next steps
  console.log();
  console.log(chalk.blue('📊 Setup Summary:'));
  console.log('  ✅ Smart contracts deployed');
  console.log(`  ${proceedWithGitHub ? '✅' : '⏸️'} GitHub repositories setup`);
  console.log(`  ${proceedWithRegistration && proceedWithGitHub ? '✅' : '⏸️'} DataDAO registration`);
  console.log(`  ${testUI ? '✅' : '⏸️'} UI testing`);
  console.log();

  // Only declare "ready" if all steps are completed
  if (proceedWithGitHub && proceedWithRegistration && testUI) {
    console.log(chalk.green('🎉 Your DataDAO is fully set up and ready!'));
    console.log();
    console.log(chalk.blue('🎯 What you can do now:'));
    console.log('  • Start accepting data contributions');
    console.log('  • Customize your DataDAO schemas and validation');
    console.log('  • Deploy to production when ready');
  } else {
    console.log(chalk.yellow('⚠️  Your DataDAO has basic functionality but needs additional setup'));
    console.log();
    console.log(chalk.blue('🎯 To complete setup:'));
    if (!proceedWithGitHub) {
      console.log('  • Set up GitHub repositories (required for registration)');
    }
    if (!proceedWithRegistration) {
      console.log('  • Run ' + chalk.cyan('npm run register:datadao') + ' to register on the network');
    }
    if (!testUI) {
      console.log('  • Test the UI with ' + chalk.cyan('npm run ui:dev'));
    }
  }

  console.log();
  console.log(chalk.blue('📁 Project location: ') + targetDir);
  console.log(chalk.blue('📚 Run ') + chalk.cyan('npm run status') + chalk.blue(' anytime to check progress'));
  console.log();
}

/**
 * Guide user through GitHub repository setup with detailed hand-holding
 */
async function guideGitHubSetup(config) {
  console.log();
  console.log(chalk.blue('🐙 GitHub Repository Setup Guide'));
  console.log();
  console.log('We need to fork 3 template repositories and enable GitHub Actions on each.');
  console.log('This enables your DataDAO to process and validate data contributions.');
  console.log();
  console.log(chalk.yellow('💡 Important: DataDAO registration requires the proof URL from GitHub Actions builds.'));
  console.log();

  const repos = [
    {
      name: 'Proof of Contribution',
      url: 'https://github.com/vana-com/vana-satya-proof-template-py',
      description: 'Validates data authenticity using the Satya network',
      required: 'Required for DataDAO registration'
    },
    {
      name: 'Data Refinement',
      url: 'https://github.com/vana-com/vana-data-refinement-template',
      description: 'Structures data for querying and ensures VRC-15 compliance',
      required: 'Required for data processing'
    },
    {
      name: 'UI Template',
      url: 'https://github.com/vana-com/dlp-ui-template',
      description: 'React app for drag-and-drop data uploads',
      required: 'Required for user interface'
    }
  ];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    console.log(chalk.cyan(`\n${i + 1}. ${repo.name}`));
    console.log(`   ${repo.description}`);
    console.log(`   ${chalk.yellow(repo.required)}`);
    console.log(`   Repository: ${repo.url}`);
    console.log();
    console.log(chalk.yellow('   Steps to complete:'));
    console.log('   a) Click the link above to open the repository');
    console.log('   b) Click the "Fork" button in the top-right corner');
    console.log('   c) Choose your GitHub account as the destination');
    console.log('   d) After forking, go to Settings → Actions → General');
    console.log('   e) Enable "Allow all actions and reusable workflows"');
    console.log('   f) Click "Save"');

    if (i === 0) { // Proof of Contribution
      console.log();
      console.log(chalk.blue('   📝 Additional setup for Proof of Contribution:'));
      console.log('   g) Edit my_proof/__main__.py and update the dlp_id (you\'ll get this after registration)');
      console.log('   h) Commit and push changes to trigger GitHub Actions build');
      console.log('   i) Go to Actions tab and wait for build to complete');
      console.log('   j) Go to Releases section and copy the .tar.gz URL');
      console.log('   k) This URL is needed for DataDAO registration');
    }

    console.log();

    const { completed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'completed',
        message: `Have you completed the fork and enabled Actions for ${repo.name}?`,
        default: false
      }
    ]);

    if (!completed) {
      console.log(chalk.yellow(`   ⏸️  Skipping ${repo.name} for now`));
      console.log('   You can complete this later for full functionality');
    } else {
      console.log(chalk.green(`   ✅ ${repo.name} setup completed`));
    }
  }

  console.log();
  console.log(chalk.blue('🔗 GitHub Setup Summary:'));
  console.log('Your forked repositories will be available at:');
  console.log(`  • https://github.com/${config.githubUsername}/vana-satya-proof-template-py`);
  console.log(`  • https://github.com/${config.githubUsername}/vana-data-refinement-template`);
  console.log(`  • https://github.com/${config.githubUsername}/dlp-ui-template`);
  console.log();
  console.log(chalk.yellow('📋 Next steps after GitHub setup:'));
  console.log('1. Wait for GitHub Actions to build your proof template');
  console.log('2. Copy the proof URL from the Releases section');
  console.log('3. Use that URL when registering your DataDAO');
  console.log();
  console.log(chalk.yellow('💡 Tip: GitHub Actions will automatically build Docker images when you push changes'));
  console.log();
}

module.exports = {
  generateTemplate,
  guideNextSteps
};