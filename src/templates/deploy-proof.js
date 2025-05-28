const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Deploy Proof of Contribution component
 */
async function deployProof() {
  try {
    console.log(chalk.blue('Preparing Proof of Contribution for deployment...'));

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

    if (!deployment.proofRepo) {
      console.error(chalk.red('Error: proofRepo not found in deployment.json. Run GitHub setup first.'));
      process.exit(1);
    }

    // Extract repository name from URL
    const repoMatch = deployment.proofRepo.match(/github\.com\/[^\/]+\/(.+?)(?:\.git)?$/);
    if (!repoMatch) {
      console.error(chalk.red('Error: Invalid proof repository URL format.'));
      process.exit(1);
    }
    const repoName = repoMatch[1];

    // Update proof configuration with dlpId
    console.log(chalk.blue('🔧 Updating proof configuration...'));

    const configPath = path.join(process.cwd(), 'proof', 'my_proof', '__main__.py');
    if (fs.existsSync(configPath)) {
      let config = fs.readFileSync(configPath, 'utf8');

      // Update dlpId
      config = config.replace(
        /"dlp_id":\s*\d+/,
        `"dlp_id": ${deployment.dlpId}`
      );

      fs.writeFileSync(configPath, config);
      console.log(chalk.green('✅ Proof configuration updated with dlpId'));
    } else {
      console.log(chalk.yellow('⚠️  Proof config file not found, but continuing...'));
    }

    // Set up git repository
    const proofDir = path.join(process.cwd(), 'proof');
    process.chdir(proofDir);

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
        execSync(`git remote set-url origin ${deployment.proofRepo}`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Git remote origin updated'));
      } catch (e) {
        // If it doesn't exist, add it
        execSync(`git remote add origin ${deployment.proofRepo}`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Git remote origin added'));
      }

      // Stage and commit changes
      execSync('git add .', { stdio: 'pipe' });

      try {
        execSync(`git commit -m "Update dlpId to ${deployment.dlpId}"`, { stdio: 'pipe' });
        console.log(chalk.green('✅ Changes committed'));
      } catch (e) {
        // Might fail if no changes or already committed
        console.log(chalk.yellow('ℹ️  No new changes to commit'));
      }

      console.log(chalk.green('✅ Git setup completed'));
      console.log();

    } catch (error) {
      console.log(chalk.yellow('⚠️  Git setup failed. You\'ll need to set up manually:'));
      console.log(chalk.yellow(`   git remote add origin ${deployment.proofRepo}`));
      console.log();
    }

    // Provide deployment options
    console.log(chalk.blue('📋 Proof Deployment Options:'));
    console.log();

    const { deploymentChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'deploymentChoice',
        message: 'How would you like to deploy your proof?',
        choices: [
          { name: '🚀 Automatic: Push to GitHub and wait for build', value: 'auto' },
          { name: '📝 Manual: I\'ll handle the GitHub workflow myself', value: 'manual' },
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
        console.log(chalk.blue('⏳ GitHub Actions is now building your proof...'));
        console.log(chalk.yellow('This usually takes 2-3 minutes.'));
        console.log();

        console.log(chalk.cyan('📋 Next steps:'));
        console.log('1. Visit: ' + chalk.yellow(`${deployment.proofRepo}/releases`));
        console.log('2. Find the latest release and copy the .tar.gz URL');
        console.log('3. Return here and enter the URL below');

        // Wait for user to get the URL
        const { proofUrl } = await inquirer.prompt([
          {
            type: 'input',
            name: 'proofUrl',
            message: 'Enter the .tar.gz URL from GitHub Releases:',
            validate: (input) => {
              if (input.trim() === '') return 'Proof URL is required';
              if (!input.includes('.tar.gz')) return 'URL must point to a .tar.gz file';
              if (!input.includes('github.com') && !input.includes('githubusercontent.com')) {
                return 'URL should be from GitHub releases';
              }
              return true;
            }
          }
        ]);

        // Save the proof URL
        deployment.proofUrl = proofUrl;
        deployment.state = deployment.state || {};
        deployment.state.proofConfigured = true;
        deployment.state.proofPublished = true;

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
      console.log(chalk.yellow('2. Monitor the build:'));
      console.log(chalk.cyan(`   ${deployment.proofRepo}/actions`));
      console.log();
      console.log(chalk.yellow('3. Get the artifact URL from Releases section'));
      console.log();

      const { proofUrl } = await inquirer.prompt([
        {
          type: 'input',
          name: 'proofUrl',
          message: 'Enter the .tar.gz URL when ready:',
          validate: (input) => {
            if (input.trim() === '') return 'Proof URL is required';
            if (!input.includes('.tar.gz')) return 'URL must point to a .tar.gz file';
            return true;
          }
        }
      ]);

      deployment.proofUrl = proofUrl;
      deployment.state = deployment.state || {};
      deployment.state.proofConfigured = true;
      deployment.state.proofPublished = true;

    } else {
      console.log(chalk.yellow('⏸️  Proof deployment skipped.'));
      console.log(chalk.yellow('You can complete this later by running: npm run deploy:proof'));

      deployment.state = deployment.state || {};
      deployment.state.proofConfigured = true;
      deployment.state.proofPublished = false;

      // Go back to project root
      process.chdir('..');
      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
      return;
    }

    // Go back to project root
    process.chdir('..');

    // Update deployment.json
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    // Update UI .env with proof URL
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    if (fs.existsSync(uiEnvPath)) {
      let uiEnv = fs.readFileSync(uiEnvPath, 'utf8');

      // Add NEXT_PUBLIC_PROOF_URL if it doesn't exist
      if (!uiEnv.includes('NEXT_PUBLIC_PROOF_URL')) {
        uiEnv += `\nNEXT_PUBLIC_PROOF_URL=${deployment.proofUrl}\n`;
      } else {
        // Replace it if it exists
        uiEnv = uiEnv.replace(
          /NEXT_PUBLIC_PROOF_URL=.*/,
          `NEXT_PUBLIC_PROOF_URL=${deployment.proofUrl}`
        );
      }

      fs.writeFileSync(uiEnvPath, uiEnv);
      console.log(chalk.green('✅ UI configuration updated with proof URL'));
    }

    console.log();
    console.log(chalk.green('🎉 Proof of Contribution configured successfully!'));
    console.log();
    console.log(chalk.blue('🎯 Next step:'));
    console.log('Run ' + chalk.cyan('npm run deploy:refiner') + ' to configure the Data Refiner');

  } catch (error) {
    console.error(chalk.red('Proof deployment preparation failed:'), error.message);
    process.exit(1);
  }
}

// Run the deployment
deployProof();