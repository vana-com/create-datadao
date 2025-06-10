const { exec } = require('child_process');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const execPromise = util.promisify(exec);

/**
 * Test all components
 */
async function testAll() {
  try {
    console.log(chalk.blue('Testing all DataDAO components...'));

    // Check if deployment.json exists
    const deploymentPath = path.join(process.cwd(), 'deployment.json');
    if (!fs.existsSync(deploymentPath)) {
      console.warn(chalk.yellow('Warning: deployment.json not found. Some tests may fail.'));
    }

    // Track test results
    const results = {
      contracts: false,
      proof: false,
      refiner: false,
      ui: false
    };

    // Test contracts
    console.log(chalk.blue('Testing smart contracts...'));
    try {
      await execPromise('npx hardhat test', {
        cwd: path.join(process.cwd(), 'contracts'),
      });
      results.contracts = true;
      console.log(chalk.green('Smart contract tests passed.'));
    } catch (error) {
      console.error(chalk.red('Smart contract tests failed:'), error.message);
    }

    // Test proof component
    console.log(chalk.blue('Testing proof component...'));
    try {
      // Check if the proof component has a test script
      const proofPackagePath = path.join(process.cwd(), 'proof', 'package.json');

      if (fs.existsSync(proofPackagePath)) {
        const proofPackage = JSON.parse(fs.readFileSync(proofPackagePath, 'utf8'));

        if (proofPackage.scripts && proofPackage.scripts.test) {
          await execPromise('npm test', {
            cwd: path.join(process.cwd(), 'proof'),
          });
          results.proof = true;
          console.log(chalk.green('Proof component tests passed.'));
        } else {
          console.log(chalk.yellow('No test script found for proof component. Validating structure instead.'));

          // Basic validation of proof structure
          const mainPyExists = fs.existsSync(path.join(process.cwd(), 'proof', 'my_proof', '__main__.py'));
          const dockerfileExists = fs.existsSync(path.join(process.cwd(), 'proof', 'Dockerfile'));

          if (mainPyExists && dockerfileExists) {
            results.proof = true;
            console.log(chalk.green('Proof component structure validation passed.'));
          } else {
            console.warn(chalk.yellow('Proof component structure validation failed. Missing required files.'));
          }
        }
      } else {
        console.warn(chalk.yellow('No package.json found for proof component. Skipping tests.'));
      }
    } catch (error) {
      console.error(chalk.red('Proof component tests failed:'), error.message);
    }

    // Test refiner component
    console.log(chalk.blue('Testing refiner component...'));
    try {
      // Check if the refiner component has a test script
      const refinerPackagePath = path.join(process.cwd(), 'refiner', 'package.json');

      if (fs.existsSync(refinerPackagePath)) {
        const refinerPackage = JSON.parse(fs.readFileSync(refinerPackagePath, 'utf8'));

        if (refinerPackage.scripts && refinerPackage.scripts.test) {
          await execPromise('npm test', {
            cwd: path.join(process.cwd(), 'refiner'),
          });
          results.refiner = true;
          console.log(chalk.green('Refiner component tests passed.'));
        } else {
          console.log(chalk.yellow('No test script found for refiner component. Validating structure instead.'));

          // Basic validation of refiner structure
          const schemaExists = fs.existsSync(path.join(process.cwd(), 'refiner', 'schema.json'));
          const dockerfileExists = fs.existsSync(path.join(process.cwd(), 'refiner', 'Dockerfile'));

          if (schemaExists && dockerfileExists) {
            results.refiner = true;
            console.log(chalk.green('Refiner component structure validation passed.'));
          } else {
            console.warn(chalk.yellow('Refiner component structure validation failed. Missing required files.'));
          }
        }
      } else {
        console.warn(chalk.yellow('No package.json found for refiner component. Skipping tests.'));
      }
    } catch (error) {
      console.error(chalk.red('Refiner component tests failed:'), error.message);
    }

    // Test UI component
    console.log(chalk.blue('Testing UI component...'));
    try {
      // Run UI tests
      await execPromise('npm test', {
        cwd: path.join(process.cwd(), 'ui'),
      });
      results.ui = true;
      console.log(chalk.green('UI component tests passed.'));
    } catch (error) {
      console.error(chalk.red('UI component tests failed:'), error.message);
    }

    // Summary
    console.log();
    console.log(chalk.blue('Test Summary:'));
    console.log(chalk.blue('============'));
    console.log('Smart Contracts: ' + (results.contracts ? chalk.green('PASSED') : chalk.red('FAILED')));
    console.log('Proof Component: ' + (results.proof ? chalk.green('PASSED') : chalk.red('FAILED')));
    console.log('Refiner Component: ' + (results.refiner ? chalk.green('PASSED') : chalk.red('FAILED')));
    console.log('UI Component: ' + (results.ui ? chalk.green('PASSED') : chalk.red('FAILED')));
    console.log();

    const overallResult = Object.values(results).every(Boolean);

    if (overallResult) {
      console.log(chalk.green('All tests passed successfully.'));
    } else {
      console.log(chalk.yellow('Some tests failed. Review the logs above for details.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Testing failed:'), error.message);
    process.exit(1);
  }
}

// Run the tests
testAll();