const { exec } = require('child_process');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');

const execPromise = util.promisify(exec);

/**
 * Check wallet balance before deployment
 */
async function checkWalletBalance(address) {
  const client = createPublicClient({
    chain: moksha,
    transport: http('https://rpc.moksha.vana.org')
  });

  try {
    const balance = await client.getBalance({ address });
    const balanceInVana = Number(balance) / 1e18;

    console.log(chalk.blue('💰 Wallet Information:'));
    console.log(`  Address: ${address}`);
    console.log(`  Balance: ${balanceInVana.toFixed(4)} VANA`);
    console.log();

    if (balanceInVana < 0.1) {
      console.error(chalk.red('❌ Insufficient balance for deployment!'));
      console.error(chalk.yellow('Please fund your wallet with at least 0.1 VANA from https://faucet.vana.org'));
      console.error(chalk.yellow(`Your wallet address: ${address}`));
      process.exit(1);
    }

    console.log(chalk.green('✅ Wallet has sufficient balance for deployment'));
    return balanceInVana;
  } catch (error) {
    console.error(chalk.yellow(`⚠️  Could not check wallet balance: ${error.message}`));
    console.log(chalk.yellow('Proceeding with deployment...'));
    return null;
  }
}

/**
 * Deploy smart contracts
 */
async function deployContracts() {
  console.log(chalk.blue('Deploying smart contracts...'));

  try {
    // Load deployment info to get wallet address
    const deploymentPath = path.resolve('deployment.json');
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    // Check wallet balance first
    await checkWalletBalance(deployment.address);

    // Change to contracts directory
    process.chdir('contracts');

    // Deploy contracts using hardhat with spinner
    const spinner = ora({
      text: 'Running hardhat deployment...\n' +
            chalk.yellow('💡 This usually takes 2-5 minutes depending on network conditions\n') +
            chalk.gray('   • Compiling contracts\n') +
            chalk.gray('   • Deploying to Moksha testnet\n') +
            chalk.gray('   • Verifying on block explorer'),
      spinner: 'dots'
    }).start();

    let output;
    try {
      output = execSync('npx hardhat deploy --network moksha --tags DLPDeploy', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      spinner.succeed(chalk.green('✅ Hardhat deployment completed successfully!'));
    } catch (deployError) {
      spinner.fail(chalk.red('❌ Hardhat deployment failed'));
      throw deployError;
    }

    console.log();
    console.log(chalk.cyan('📋 Deployment Output:'));
    console.log(output);

    // Extract contract addresses from output
    const tokenAddressMatch = output.match(/deployed at (0x[a-fA-F0-9]{40})/);
    const proxyAddressMatch = output.match(/DLP deployed to: (0x[a-fA-F0-9]{40})/);

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