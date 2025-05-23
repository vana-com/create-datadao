const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Update configuration after initial setup
 */
async function configure() {
  console.log(chalk.blue('🔧 Update DataDAO Configuration'));
  console.log();

  const { component } = await inquirer.prompt([
    {
      type: 'list',
      name: 'component',
      message: 'Which component would you like to reconfigure?',
      choices: [
        { name: '📦 Pinata IPFS credentials', value: 'pinata' },
        { name: '🔐 Google OAuth credentials', value: 'google' },
        { name: '🎨 UI configuration', value: 'ui' },
        { name: '📄 View current configuration', value: 'view' }
      ]
    }
  ]);

  if (component === 'view') {
    console.log(chalk.blue('\nCurrent Configuration:'));

    // Show contracts .env (without sensitive data)
    const contractsEnvPath = path.join(process.cwd(), 'contracts', '.env');
    if (fs.existsSync(contractsEnvPath)) {
      const contractsEnv = fs.readFileSync(contractsEnvPath, 'utf8');
      console.log(chalk.cyan('\nContracts (.env):'));
      contractsEnv.split('\n').forEach(line => {
        if (line.includes('=') && !line.includes('PRIVATE_KEY')) {
          console.log('  ' + line);
        }
      });
    }

    // Show UI .env (without sensitive data)
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    if (fs.existsSync(uiEnvPath)) {
      const uiEnv = fs.readFileSync(uiEnvPath, 'utf8');
      console.log(chalk.cyan('\nUI (.env):'));
      uiEnv.split('\n').forEach(line => {
        if (line.includes('=') && !line.includes('SECRET') && !line.includes('CLIENT_SECRET')) {
          console.log('  ' + line);
        }
      });
    }
    return;
  }

  if (component === 'pinata') {
    console.log(chalk.blue('\n📦 Update Pinata IPFS Configuration'));
    console.log('Get your credentials from: https://pinata.cloud → API Keys');
    console.log();

    const pinataConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Pinata API Key:',
        validate: (input) => input.trim() !== '' || 'API Key is required'
      },
      {
        type: 'password',
        name: 'apiSecret',
        message: 'Pinata API Secret:',
        validate: (input) => input.trim() !== '' || 'API Secret is required'
      }
    ]);

    // Update refiner .env
    const refinerEnvPath = path.join(process.cwd(), 'refiner', '.env');
    let refinerEnv = fs.existsSync(refinerEnvPath) ? fs.readFileSync(refinerEnvPath, 'utf8') : '';
    refinerEnv = updateEnvVar(refinerEnv, 'PINATA_API_KEY', pinataConfig.apiKey);
    refinerEnv = updateEnvVar(refinerEnv, 'PINATA_API_SECRET', pinataConfig.apiSecret);
    fs.writeFileSync(refinerEnvPath, refinerEnv);

    // Update UI .env
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    let uiEnv = fs.existsSync(uiEnvPath) ? fs.readFileSync(uiEnvPath, 'utf8') : '';
    uiEnv = updateEnvVar(uiEnv, 'PINATA_API_KEY', pinataConfig.apiKey);
    uiEnv = updateEnvVar(uiEnv, 'PINATA_API_SECRET', pinataConfig.apiSecret);
    fs.writeFileSync(uiEnvPath, uiEnv);

    console.log(chalk.green('✅ Pinata configuration updated!'));
  }

  if (component === 'google') {
    console.log(chalk.blue('\n🔐 Update Google OAuth Configuration'));
    console.log('Get your credentials from: https://console.cloud.google.com');
    console.log('Make sure to add http://localhost:3000 to authorized origins');
    console.log();

    const googleConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Google OAuth Client ID:',
        validate: (input) => input.trim() !== '' || 'Client ID is required'
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Google OAuth Client Secret:',
        validate: (input) => input.trim() !== '' || 'Client Secret is required'
      }
    ]);

    // Update UI .env
    const uiEnvPath = path.join(process.cwd(), 'ui', '.env');
    let uiEnv = fs.existsSync(uiEnvPath) ? fs.readFileSync(uiEnvPath, 'utf8') : '';
    uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_ID', googleConfig.clientId);
    uiEnv = updateEnvVar(uiEnv, 'GOOGLE_CLIENT_SECRET', googleConfig.clientSecret);
    fs.writeFileSync(uiEnvPath, uiEnv);

    console.log(chalk.green('✅ Google OAuth configuration updated!'));
    console.log(chalk.yellow('💡 Restart the UI server to apply changes: cd ui && npm run dev'));
  }

  if (component === 'ui') {
    console.log(chalk.blue('\n🎨 UI Configuration'));
    console.log('Current UI server: http://localhost:3000');
    console.log();
    console.log('Available commands:');
    console.log('  ' + chalk.cyan('cd ui && npm run dev') + ' - Start development server');
    console.log('  ' + chalk.cyan('cd ui && npm run build') + ' - Build for production');
    console.log();
    console.log('Configuration files:');
    console.log('  ' + chalk.cyan('ui/.env') + ' - Environment variables');
    console.log('  ' + chalk.cyan('ui/package.json') + ' - Dependencies and scripts');
  }
}

function updateEnvVar(envContent, key, value) {
  const lines = envContent.split('\n');
  const keyIndex = lines.findIndex(line => line.startsWith(key + '='));

  if (keyIndex >= 0) {
    lines[keyIndex] = `${key}=${value}`;
  } else {
    lines.push(`${key}=${value}`);
  }

  return lines.join('\n');
}

// Run configure
configure().catch(error => {
  console.error(chalk.red('Configuration failed:'), error.message);
  process.exit(1);
}); 