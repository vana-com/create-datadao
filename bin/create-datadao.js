#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const generator = require('../src/index');

// Get project name from command line arguments
const projectName = process.argv[2];

if (!projectName) {
  console.error(chalk.red('Please specify a name for your DataDAO project:'));
  console.log(`  ${chalk.cyan('create-datadao')} ${chalk.green('<project-name>')}`);
  console.log();
  console.log('For example:');
  console.log(`  ${chalk.cyan('npx create-datadao')} ${chalk.green('my-datadao')}`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);

// Check if directory already exists
if (fs.existsSync(targetDir)) {
  console.error(chalk.red(`Error: Directory ${projectName} already exists.`));
  process.exit(1);
}

// Create the project directory
fs.mkdirSync(targetDir);

// Run the generator
generator.run(targetDir)
  .then(() => {
    console.log();
    console.log(chalk.green('Success!') + ' Created DataDAO project at ' + chalk.cyan(targetDir));
    console.log();
    console.log('Inside that directory, you can run these commands:');
    console.log();
    console.log('  ' + chalk.cyan('npm run setup') + '   Setup the DataDAO configuration');
    console.log('  ' + chalk.cyan('npm run dev') + '      Start local development environment');
    console.log('  ' + chalk.cyan('npm run deploy:all') + ' Deploy all components');
    console.log();
    console.log('Begin by running:');
    console.log();
    console.log('  ' + chalk.cyan('cd') + ' ' + projectName);
    console.log('  ' + chalk.cyan('npm install'));
    console.log('  ' + chalk.cyan('npm run setup'));
    console.log();
  })
  .catch((err) => {
    console.error(chalk.red('Error during generation:'));
    console.error(err);
    // Clean up by removing the directory
    fs.removeSync(targetDir);
    process.exit(1);
  });