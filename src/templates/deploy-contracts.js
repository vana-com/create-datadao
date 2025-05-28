const { exec } = require('child_process');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const execPromise = util.promisify(exec);

/**
 * Deploy smart contracts
 */
async function deployContracts() {
  try {
    console.log(chalk.blue('Deploying smart contracts...'));

    // Check if .env exists
    if (!fs.existsSync(path.join(process.cwd(), 'contracts', '.env'))) {
      console.error(chalk.red('Error: contracts/.env file not found. Run "npm run setup" first.'));
      process.exit(1);
    }

    // Execute Hardhat deployment with force flag to prevent reusing existing contracts
    console.log(chalk.blue('Running deployment command...'));
    const { stdout, stderr } = await execPromise('npx hardhat deploy --reset --network moksha --tags DLPDeploy', {
      cwd: path.join(process.cwd(), 'contracts'),
    });

    console.log(stdout);

    if (stderr) {
      console.error(chalk.yellow('Deployment warnings:'), stderr);
    }

    // Extract contract addresses from output
    const tokenAddressMatch = stdout.match(/deployed at (0x[a-fA-F0-9]{40})/);
    const proxyAddressMatch = stdout.match(/DLP deployed to: (0x[a-fA-F0-9]{40})/);

    if (!tokenAddressMatch || !proxyAddressMatch) {
      console.error(chalk.red('Error: Failed to extract contract addresses from deployment output.'));
      console.error(chalk.yellow('Please check deployment logs above for contract addresses.'));
      process.exit(1);
    }

    const tokenAddress = tokenAddressMatch[1];
    const proxyAddress = proxyAddressMatch[1];

    console.log(chalk.green('Contracts deployed successfully:'));
    console.log(chalk.blue('Token Address:'), tokenAddress);
    console.log(chalk.blue('Proxy Address:'), proxyAddress);

    // Save to deployment.json and update state
    const deploymentPath = path.join(process.cwd(), 'deployment.json');
    let deployment = {};

    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    }

    deployment.tokenAddress = tokenAddress;
    deployment.proxyAddress = proxyAddress;

    // Update state to mark contracts as deployed
    if (!deployment.state) {
      deployment.state = {};
    }
    deployment.state.contractsDeployed = true;

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log();
    console.log(chalk.blue('Next step:'));
    console.log('Run ' + chalk.cyan('npm run register:datadao') + ' to register your DataDAO on-chain');

  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error.message);
    process.exit(1);
  }
}

// Run the deployment
deployContracts();