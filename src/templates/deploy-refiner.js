const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const child_process = require('child_process');
const util = require('util');

const execPromise = util.promisify(child_process.exec);

/**
 * Deploy Data Refinement component
 */
async function deployRefiner() {
  try {
    console.log(chalk.blue('Preparing Data Refinement component for deployment...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');

    if (!fs.existsSync(deploymentPath)) {
      console.error(chalk.red('Error: deployment.json not found. Run previous deployment steps first.'));
      process.exit(1);
    }

    // Check if refinement key exists in refiner .env
    const refinerEnvPath = path.join(process.cwd(), 'refiner', '.env');
    if (!fs.existsSync(refinerEnvPath)) {
      console.error(chalk.red('Error: refiner/.env not found. Run "npm run register:datadao" first.'));
      process.exit(1);
    }

    const refinerEnv = fs.readFileSync(refinerEnvPath, 'utf8');
    if (!refinerEnv.includes('REFINEMENT_ENCRYPTION_KEY')) {
      console.error(chalk.red('Error: REFINEMENT_ENCRYPTION_KEY not found in refiner/.env. Run "npm run register:datadao" first.'));
      process.exit(1);
    }

    // Load deployment information
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    if (!deployment.dlpId) {
      console.error(chalk.red('Error: dlpId not found in deployment.json. Run "npm run register:datadao" first.'));
      process.exit(1);
    }

    // Update schema.json with dlpId
    console.log(chalk.blue('Updating refiner schema with dlpId:', deployment.dlpId));

    const schemaPath = path.join(process.cwd(), 'refiner', 'schema.json');

    if (!fs.existsSync(schemaPath)) {
      console.error(chalk.red(`Error: ${schemaPath} not found. Check your refiner component.`));
      process.exit(1);
    }

    let schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Update dlpId in schema
    if (schema.dlpId !== undefined) {
      schema.dlpId = deployment.dlpId;
      fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
      console.log(chalk.green('Refiner schema updated successfully.'));
    } else {
      console.warn(chalk.yellow('Warning: dlpId field not found in schema.json. Check your refiner component.'));
    }

    // Instructions for pinning schema to IPFS
    console.log();
    console.log(chalk.blue('To deploy the Data Refinement component:'));
    console.log();
    console.log(chalk.yellow('1. First, pin the schema to IPFS using Pinata:'));
    console.log(chalk.cyan('   https://app.pinata.cloud/pinmanager'));
    console.log(chalk.yellow('   Upload the file: ' + schemaPath));
    console.log();

    // Prompt for the schema IPFS hash
    const schemaAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'schemaIpfs',
        message: 'Enter the IPFS hash (CID) for the pinned schema:',
        validate: (input) => input.trim() !== '' ? true : 'IPFS hash is required'
      }
    ]);

    // Update deployment.json with schema IPFS hash
    deployment.schemaIpfs = schemaAnswer.schemaIpfs;
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log();
    console.log(chalk.blue('Now register the refiner with the DataDAO Registry:'));
    console.log();
    console.log(chalk.yellow('1. Visit RefinementRegistryProxy contract on VanaScan:'));
    console.log(chalk.cyan('   https://moksha.vanascan.io/address/0x5dfa114b1022b3ffa295c97c25261ab9668843a8'));
    console.log();
    console.log(chalk.yellow('2. Connect your wallet'));
    console.log();
    console.log(chalk.yellow('3. Call the registerRefiner function with:'));
    console.log(chalk.cyan('   dlpId:'), deployment.dlpId);
    console.log(chalk.cyan('   schemaHash: ipfs://') + schemaAnswer.schemaIpfs);
    console.log(chalk.yellow('   Include 0.001 VANA with the transaction (click ×10^15 button)'));
    console.log();
    console.log(chalk.yellow('4. After submitting the transaction, find the refinerId in the transaction logs'));
    console.log();

    // Prompt for refinerId
    const refinerAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'refinerId',
        message: 'Enter the refinerId from the transaction logs:',
        validate: (input) => {
          if (input.trim() === '') return 'refinerId is required';
          if (isNaN(parseInt(input))) return 'refinerId must be a number';
          return true;
        }
      }
    ]);

    // Update deployment.json with refinerId
    deployment.refinerId = parseInt(refinerAnswer.refinerId);
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    // Update UI .env with refinerId
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    let uiEnv = fs.readFileSync(uiEnvPath, 'utf8');

    // Add REFINER_ID if it doesn't exist
    if (!uiEnv.includes('REFINER_ID')) {
      uiEnv += `\nREFINER_ID=${refinerAnswer.refinerId}\n`;
      fs.writeFileSync(uiEnvPath, uiEnv);
    } else {
      // Replace it if it exists
      uiEnv = uiEnv.replace(
        /REFINER_ID=.*/,
        `REFINER_ID=${refinerAnswer.refinerId}`
      );
      fs.writeFileSync(uiEnvPath, uiEnv);
    }

    console.log(chalk.green('Refiner registration information saved.'));
    console.log();

    // Instructions for deploying refiner
    console.log(chalk.blue('To deploy the Refiner to GitHub:'));
    console.log();
    console.log(chalk.yellow('1. Push your changes to GitHub:'));
    console.log(chalk.cyan('   cd refiner && git init && git add . && git commit -m "Update configuration" && git push'));
    console.log();
    console.log(chalk.yellow('2. Wait for GitHub Actions to complete'));
    console.log();
    console.log(chalk.blue('Next step:'));
    console.log('Run ' + chalk.cyan('npm run deploy:ui') + ' to deploy the UI');

  } catch (error) {
    console.error(chalk.red('Refiner deployment preparation failed:'), error.message);
    process.exit(1);
  }
}

// Run the deployment
deployRefiner();