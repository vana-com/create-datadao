const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Deploy Proof of Contribution component
 */
async function deployProof() {
  try {
    console.log(chalk.blue('Preparing Proof of Contribution component for deployment...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');

    if (!fs.existsSync(deploymentPath)) {
      console.error(chalk.red('Error: deployment.json not found. Run "npm run deploy:contracts" and "npm run register:datadao" first.'));
      process.exit(1);
    }

    // Load deployment information
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment.dlpId) {
      console.error(chalk.red('Error: dlpId not found in deployment.json. Run "npm run register:datadao" first.'));
      process.exit(1);
    }

    // Update dlp_id in proof component
    console.log(chalk.blue('Updating proof configuration with dlpId:', deployment.dlpId));

    const mainPyPath = path.join(process.cwd(), 'proof', 'my_proof', '__main__.py');

    if (!fs.existsSync(mainPyPath)) {
      console.error(chalk.red(`Error: ${mainPyPath} not found. Check your proof component.`));
      process.exit(1);
    }

    let mainPy = fs.readFileSync(mainPyPath, 'utf8');

    // Replace the dlp_id in the configuration
    mainPy = mainPy.replace(
      /def load_config\(\):\s+return\s+{\s+"dlp_id":\s+\d+/,
      `def load_config():\n    return {\n        "dlp_id": ${deployment.dlpId}`
    );

    fs.writeFileSync(mainPyPath, mainPy);

    console.log(chalk.green('Proof configuration updated successfully.'));
    console.log();

    // Display instructions for deploying the proof component
    console.log(chalk.blue('To deploy the Proof of Contribution:'));
    console.log();
    console.log(chalk.yellow('1. Push your changes to GitHub:'));
    console.log(chalk.cyan('   cd proof && git init && git add . && git commit -m "Update dlpId" && git push'));
    console.log();
    console.log(chalk.yellow('2. Wait for GitHub Actions to complete and check the Releases section'));
    console.log(chalk.yellow('   for the proof artifact (.tar.gz file)'));
    console.log();

    // Prompt for the proof artifact URL
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'proofUrl',
        message: 'Enter the .tar.gz URL for the proof artifact:',
        validate: (input) => {
          if (input.trim() === '') return 'Proof URL is required';
          if (!input.includes('.tar.gz')) return 'URL must point to a .tar.gz file';
          return true;
        }
      }
    ]);

    // Update deployment.json with proof URL
    deployment.proofUrl = answers.proofUrl;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    // Update UI .env with proof URL
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    let uiEnv = fs.readFileSync(uiEnvPath, 'utf8');

    // Add NEXT_PUBLIC_PROOF_URL if it doesn't exist
    if (!uiEnv.includes('NEXT_PUBLIC_PROOF_URL')) {
      uiEnv += `\nNEXT_PUBLIC_PROOF_URL=${answers.proofUrl}\n`;
      fs.writeFileSync(uiEnvPath, uiEnv);
    } else {
      // Replace it if it exists
      uiEnv = uiEnv.replace(
        /NEXT_PUBLIC_PROOF_URL=.*/,
        `NEXT_PUBLIC_PROOF_URL=${answers.proofUrl}`
      );
      fs.writeFileSync(uiEnvPath, uiEnv);
    }

    console.log(chalk.green('Proof URL saved successfully.'));
    console.log();
    console.log(chalk.blue('Next step:'));
    console.log('Run ' + chalk.cyan('npm run deploy:refiner') + ' to deploy the Data Refinement');

  } catch (error) {
    console.error(chalk.red('Proof deployment preparation failed:'), error.message);
    process.exit(1);
  }
}

// Run the deployment
deployProof();