const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const { createPublicClient, http } = require('viem');
const { moksha } = require('viem/chains');

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

  // Declare variables outside try block so they're accessible in catch
  let tokenMatch, proxyMatch, vestingMatch;

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

    // Extract contract addresses from output - look for specific patterns
    tokenMatch = output.match(/Token Address:\s*(0x[a-fA-F0-9]{40})/);
    proxyMatch = output.match(/DataLiquidityPoolProxy\s+deployed\s+to:\s*(0x[a-fA-F0-9]{40})/);
    vestingMatch = output.match(/Vesting Wallet Address:\s*(0x[a-fA-F0-9]{40})/);

    // Also look for "Proxy deployed to:" pattern in case format changes
    const altProxyMatch = output.match(/Proxy deployed to:\s*(0x[a-fA-F0-9]{40})/);

    if (!tokenMatch) {
      console.error(chalk.red('Error: Failed to extract token address from deployment output.'));
      console.error(chalk.yellow('Please check deployment logs above for contract addresses.'));
      console.error(chalk.yellow('You may need to manually extract addresses from the output.'));
      process.exit(1);
    }

    const tokenAddress = tokenMatch[1];

    // Get proxy address from either pattern
    const proxyAddress = proxyMatch ? proxyMatch[1] : (altProxyMatch ? altProxyMatch[1] : null);

    if (!proxyAddress) {
      console.error(chalk.red('Error: Failed to extract DataLiquidityPool proxy address from deployment output.'));
      console.error(chalk.yellow('Please check deployment logs above for the proxy address.'));
      process.exit(1);
    }

    // Update deployment.json with contract addresses
    deployment.contracts = {
      tokenAddress: tokenAddress,
      proxyAddress: proxyAddress,
      vestingAddress: vestingMatch ? vestingMatch[1] : null
    };

    // Keep backward compatibility
    deployment.tokenAddress = tokenAddress;
    deployment.proxyAddress = proxyAddress;

    deployment.state = deployment.state || {};
    deployment.state.contractsDeployed = true;

    console.log(chalk.green('✅ Contracts deployed successfully!'));
    console.log(chalk.cyan('Token Address:'), tokenAddress);
    console.log(chalk.cyan('DLP Proxy Address:'), proxyAddress);

    if (vestingMatch) {
      const vestingAddress = vestingMatch[1];
      deployment.vestingAddress = vestingAddress;
      console.log(chalk.cyan('Vesting Address:'), vestingAddress);
    }

    // Save back to parent directory since we changed to contracts dir
    fs.writeFileSync(path.resolve('..', 'deployment.json'), JSON.stringify(deployment, null, 2));

  } catch (error) {
    console.error(chalk.red('Contract deployment failed:'));
    console.error(error.message);

    // Load deployment for error handling
    const deploymentPath = path.resolve('deployment.json');
    let deployment = {};
    try {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    } catch (e) {
      // If we can't load deployment.json, create minimal object
      deployment = { address: 'unknown' };
    }

    // Comprehensive error analysis
    const errorLower = error.message.toLowerCase();
    let suggestedAction = '';
    let canRetry = false;

    if (errorLower.includes('insufficient funds') || errorLower.includes('insufficient_funds')) {
      suggestedAction = 'funding';
      console.error(chalk.yellow('\n💡 Insufficient funds detected'));
      console.error(chalk.yellow('Your wallet needs VANA tokens to deploy contracts.'));
    } else if (errorLower.includes('nonce') || errorLower.includes('already known')) {
      suggestedAction = 'nonce';
      canRetry = true;
      console.error(chalk.yellow('\n💡 Transaction nonce issue detected'));
      console.error(chalk.yellow('This usually happens when a previous transaction is pending.'));
    } else if (errorLower.includes('timeout') || errorLower.includes('network')) {
      suggestedAction = 'network';
      canRetry = true;
      console.error(chalk.yellow('\n💡 Network connectivity issue detected'));
      console.error(chalk.yellow('The network may be congested or unreachable.'));
    } else if (errorLower.includes('reverted') || errorLower.includes('execution failed')) {
      suggestedAction = 'reverted';
      console.error(chalk.yellow('\n💡 Transaction was reverted'));
      console.error(chalk.yellow('The contract deployment was rejected by the network.'));
    } else if (errorLower.includes('enoent') || errorLower.includes('command not found')) {
      suggestedAction = 'setup';
      console.error(chalk.yellow('\n💡 Hardhat not found'));
      console.error(chalk.yellow('Please ensure dependencies are installed.'));
    }

    // Provide specific recovery steps
    console.error(chalk.cyan('\n📋 Recovery Steps:'));

    switch(suggestedAction) {
      case 'funding':
        console.error(chalk.white('1. Check balance: ') + chalk.blue('https://moksha.vanascan.io/address/' + deployment.address));
        console.error(chalk.white('2. Get testnet VANA: ') + chalk.blue('https://faucet.vana.org'));
        console.error(chalk.white('3. Wait for funds to arrive (1-2 minutes)'));
        console.error(chalk.white('4. Run this command again: ') + chalk.green('npm run deploy-contracts'));
        break;

      case 'nonce':
        console.error(chalk.white('1. Wait 30 seconds for pending transactions'));
        console.error(chalk.white('2. Check transaction status: ') + chalk.blue('https://moksha.vanascan.io/address/' + deployment.address));
        console.error(chalk.white('3. Retry deployment: ') + chalk.green('npm run deploy-contracts'));
        break;

      case 'network':
        console.error(chalk.white('1. Check your internet connection'));
        console.error(chalk.white('2. Verify RPC is accessible: ') + chalk.blue('https://rpc.moksha.vana.org'));
        console.error(chalk.white('3. Wait 2-3 minutes for network congestion'));
        console.error(chalk.white('4. Retry deployment: ') + chalk.green('npm run deploy-contracts'));
        break;

      case 'setup':
        console.error(chalk.white('1. Install dependencies: ') + chalk.green('npm install'));
        console.error(chalk.white('2. Clean and reinstall: ') + chalk.green('rm -rf node_modules && npm install'));
        console.error(chalk.white('3. Retry deployment: ') + chalk.green('npm run deploy-contracts'));
        break;

      default:
        console.error(chalk.white('1. Check deployment logs above for details'));
        console.error(chalk.white('2. Verify your configuration in deployment.json'));
        console.error(chalk.white('3. Try running from project root directory'));
        console.error(chalk.white('4. Contact support with the error message'));
    }

    // Save partial state if we got any addresses
    if (tokenMatch || proxyMatch || vestingMatch) {
      console.error(chalk.yellow('\n⚠️  Partial deployment detected. Saving progress...'));
      const partialState = {
        ...deployment,
        state: deployment.state || {},
        partial: true
      };
      if (tokenMatch) partialState.tokenAddress = tokenMatch[1];
      if (proxyMatch) partialState.proxyAddress = proxyMatch[1];
      if (vestingMatch) partialState.vestingAddress = vestingMatch[1];

      fs.writeFileSync(deploymentPath, JSON.stringify(partialState, null, 2));
      console.error(chalk.green('✅ Partial progress saved to deployment.json'));
    }

    // Offer retry option for retriable errors
    if (canRetry) {
      console.error(chalk.cyan('\n🔄 This error may be temporary.'));
      console.error(chalk.white('You can retry with: ') + chalk.green('npm run deploy-contracts'));
    }

    process.exit(1);
  }
}

// Run deployment
deployContracts();