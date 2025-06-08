const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const chalk = require('chalk');
const TemplateEngine = require('../lib/template-engine');

/**
 * Run the generator
 * @param {string} targetDir - The target directory to create the project in
 */
async function run(targetDir) {
  console.log(chalk.blue('Creating your DataDAO project...'));

  try {
    // Clone repositories
    await cloneRepositories(targetDir);

    // Create project files
    await createProjectFiles(targetDir);

    return true;
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

/**
 * Clone the required repositories into the target directory
 * @param {string} targetDir - The target directory
 */
async function cloneRepositories(targetDir) {
  console.log(chalk.blue('Cloning repositories...'));

  try {
    // Create directories for each component
    fs.mkdirSync(path.join(targetDir, 'contracts'));
    fs.mkdirSync(path.join(targetDir, 'proof'));
    fs.mkdirSync(path.join(targetDir, 'refiner'));
    fs.mkdirSync(path.join(targetDir, 'ui'));

    // Clone smart contracts repo (with specific branch)
    console.log(chalk.blue('Cloning smart contracts repository...'));

    // Using develop branch as per tutorial
    await execPromise(`git clone --depth 1 -b develop https://github.com/vana-com/vana-smart-contracts.git ${path.join(targetDir, 'contracts')}`);

    // Clone proof repository
    console.log(chalk.blue('Cloning proof of contribution repository...'));
    await execPromise(`git clone --depth 1 https://github.com/vana-com/dlp-proof-template.git ${path.join(targetDir, 'proof')}`);

    // Clone refiner repository
    console.log(chalk.blue('Cloning data refinement repository...'));
    await execPromise(`git clone --depth 1 https://github.com/vana-com/vana-data-refinement-template.git ${path.join(targetDir, 'refiner')}`);

    // Clone UI repository
    console.log(chalk.blue('Cloning UI repository...'));
    await execPromise(`git clone --depth 1 https://github.com/vana-com/dlp-ui-template.git ${path.join(targetDir, 'ui')}`);

    // Remove .git directories to start fresh
    fs.removeSync(path.join(targetDir, 'contracts', '.git'));
    fs.removeSync(path.join(targetDir, 'proof', '.git'));
    fs.removeSync(path.join(targetDir, 'refiner', '.git'));
    fs.removeSync(path.join(targetDir, 'ui', '.git'));

    console.log(chalk.green('Repositories cloned successfully.'));
  } catch (error) {
    console.error(chalk.red('Failed to clone repositories:'), error.message);
    throw error;
  }
}

/**
 * Create project files (package.json, README.md, etc.)
 * @param {string} targetDir - The target directory
 */
async function createProjectFiles(targetDir) {
  console.log(chalk.blue('Creating project files...'));

  try {
    // Create package.json
    const packageJson = {
      name: path.basename(targetDir),
      version: '0.1.0',
      private: true,
      scripts: {
        setup: 'node scripts/setup.js',
        dev: 'docker-compose up',
        'deploy:contracts': 'node scripts/deploy-contracts.js',
        'register:datadao': 'node scripts/register-datadao.js',
        'deploy:proof': 'node scripts/deploy-proof.js',
        'deploy:refiner': 'node scripts/deploy-refiner.js',
        'deploy:ui': 'cd ui && npm run deploy',
        'deploy:all': 'npm run deploy:contracts && npm run register:datadao && npm run deploy:proof && npm run deploy:refiner && npm run deploy:ui',
        test: 'node scripts/test-all.js'
      },
      dependencies: {
        'fs-extra': '^11.1.1',
        'inquirer': '^8.2.5',
        'viem': '^1.19.9',
        'chalk': '^4.1.2'
      }
    };

    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create docker-compose.yml
    const dockerCompose = `version: '3'
services:
  proof:
    build: ./proof
    volumes:
      - ./proof/input:/input
      - ./proof/output:/output
    environment:
      - USER_EMAIL=test@example.com

  refiner:
    build: ./refiner
    volumes:
      - ./refiner/input:/input
      - ./refiner/output:/output
    env_file:
      - ./refiner/.env
`;

    fs.writeFileSync(
      path.join(targetDir, 'docker-compose.yml'),
      dockerCompose
    );

    // Create scripts directory and generate script templates
    fs.mkdirSync(path.join(targetDir, 'scripts'));

    // Initialize template engine with default Vana config
    const templateEngine = new TemplateEngine();
    const defaultConfig = templateEngine.getDefaultVanaConfig();

    // Process template files (with .template extension)
    templateEngine.processTemplateToFile(
      'deploy-contracts.js.template',
      path.join(targetDir, 'scripts', 'deploy-contracts.js'),
      defaultConfig
    );

    templateEngine.processTemplateToFile(
      'register-datadao.js.template',
      path.join(targetDir, 'scripts', 'register-datadao.js'),
      defaultConfig
    );

    // Copy non-template scripts directly
    fs.copyFileSync(
      path.join(__dirname, 'templates', 'setup.js'),
      path.join(targetDir, 'scripts', 'setup.js')
    );

    fs.copyFileSync(
      path.join(__dirname, 'templates', 'deploy-proof.js'),
      path.join(targetDir, 'scripts', 'deploy-proof.js')
    );

    fs.copyFileSync(
      path.join(__dirname, 'templates', 'deploy-refiner.js'),
      path.join(targetDir, 'scripts', 'deploy-refiner.js')
    );

    fs.copyFileSync(
      path.join(__dirname, 'templates', 'test-all.js'),
      path.join(targetDir, 'scripts', 'test-all.js')
    );

    // Create README.md
    const readme = `# DataDAO Project

A DataDAO (Data Decentralized Autonomous Organization) built on the Vana network.

## Components

- Smart Contracts (contracts/)
- Proof of Contribution (proof/)
- Data Refinement (refiner/)
- User Interface (ui/)

## Getting Started

1. Set up your environment:
   \`\`\`bash
   npm install
   npm run setup
   \`\`\`

2. Deploy the DataDAO:
   \`\`\`bash
   npm run deploy:all
   \`\`\`

3. Run the local development environment:
   \`\`\`bash
   npm run dev
   \`\`\`

## Scripts

- \`npm run setup\` - Configure all components
- \`npm run dev\` - Run the local development environment
- \`npm run deploy:contracts\` - Deploy smart contracts
- \`npm run register:datadao\` - Register the DataDAO on-chain
- \`npm run deploy:proof\` - Deploy the Proof of Contribution
- \`npm run deploy:refiner\` - Deploy the Data Refinement
- \`npm run deploy:ui\` - Deploy the UI
- \`npm run deploy:all\` - Deploy all components
`;

    fs.writeFileSync(
      path.join(targetDir, 'README.md'),
      readme
    );

    console.log(chalk.green('Project files created successfully.'));
  } catch (error) {
    console.error(chalk.red('Failed to create project files:'), error.message);
    throw error;
  }
}

module.exports = {
  run
};
