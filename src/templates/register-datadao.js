const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Register DataDAO on-chain
 */
async function registerDataDAO() {
  try {
    console.log(chalk.blue('Registering DataDAO on-chain...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');

    if (!fs.existsSync(deploymentPath)) {
      console.error(chalk.red('Error: deployment.json not found. Run "npm run deploy:contracts" first.'));
      process.exit(1);
    }

    // Load deployment information
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment.proxyAddress) {
      console.error(chalk.red('Error: proxyAddress not found in deployment.json. Run "npm run deploy:contracts" first.'));
      process.exit(1);
    }

    // Display instructions for registration
    console.log(chalk.blue('Please register your DataDAO using the following information:'));
    console.log();
    console.log(chalk.yellow('1. Visit DLPRegistryProxy contract on VanaScan:'));
    console.log(chalk.cyan('   https://moksha.vanascan.io/address/0xA6dFc0ef21D91F166Ca51c731D1a115a5b715a3F'));
    console.log();
    console.log(chalk.yellow('2. Connect your wallet'));
    console.log();
    console.log(chalk.yellow('3. Call the registerDlp function with:'));
    console.log(chalk.cyan('   dlpAddress:'), deployment.proxyAddress);
    console.log(chalk.cyan('   ownerAddress:'), deployment.address);
    console.log(chalk.cyan('   treasuryAddress:'), deployment.address); // Using same address for treasury
    console.log(chalk.cyan('   name:'), deployment.dlpName);
    console.log(chalk.yellow('   Include 1 VANA with the transaction (click ×10^18 button)'));
    console.log();
    console.log(chalk.yellow('4. After submitting the transaction, find the dlpId in the transaction logs'));
    console.log();

    // Prompt for dlpId
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'dlpId',
        message: 'Enter the dlpId from the transaction logs:',
        validate: (input) => {
          if (input.trim() === '') return 'dlpId is required';
          if (isNaN(parseInt(input))) return 'dlpId must be a number';
          return true;
        }
      }
    ]);

    // Update deployment.json with dlpId
    deployment.dlpId = parseInt(answers.dlpId);
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log(chalk.green('DataDAO registration information saved.'));
    console.log();

    // Get encryption key
    console.log(chalk.blue('Next, get your refinement encryption key:'));
    console.log();
    console.log(chalk.yellow('1. Visit QueryEngineImplementation contract on VanaScan:'));
    console.log(chalk.cyan('   https://moksha.vanascan.io/address/0xd25Eb66EA2452cf3238A2eC6C1FD1B7F5B320490'));
    console.log();
    console.log(chalk.yellow('2. Call the dlpPubKeys(dlpId) function with:'));
    console.log(chalk.cyan('   dlpId:'), deployment.dlpId);
    console.log();

    // Prompt for encryption key
    const keyAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'refinementKey',
        message: 'Enter the encryption key returned by the function:',
        validate: (input) => {
          if (input.trim() === '') return 'Encryption key is required';
          if (!input.startsWith('0x')) return 'Encryption key must start with 0x';
          return true;
        }
      }
    ]);

    // Update deployment.json with encryption key
    deployment.refinementKey = keyAnswer.refinementKey;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    // Update refiner .env with encryption key
    const refinerEnvPath = path.join(process.cwd(), 'refiner', '.env');
    let refinerEnv = fs.readFileSync(refinerEnvPath, 'utf8');
    refinerEnv = refinerEnv.replace('# Will be populated with refinement encryption key after DataDAO registration', '');
    refinerEnv = `REFINEMENT_ENCRYPTION_KEY=${keyAnswer.refinementKey}\n` + refinerEnv;
    fs.writeFileSync(refinerEnvPath, refinerEnv);

    console.log(chalk.green('Refinement encryption key saved.'));
    console.log();
    console.log(chalk.blue('Next steps:'));
    console.log('1. Run ' + chalk.cyan('npm run deploy:proof') + ' to deploy the Proof of Contribution');
    console.log('2. Run ' + chalk.cyan('npm run deploy:refiner') + ' to deploy the Data Refinement');

  } catch (error) {
    console.error(chalk.red('Registration failed:'), error.message);
    process.exit(1);
  }
}

// Run the registration
registerDataDAO();