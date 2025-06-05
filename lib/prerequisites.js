const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Check system prerequisites before starting DataDAO creation
 * @returns {Promise<boolean>} True if all required prerequisites are met
 */
async function checkPrerequisites() {
  const spinner = ora('Checking prerequisites...').start();
  const issues = [];
  const warnings = [];

  try {
    // Required checks (fail if missing)

    // Check Node.js version
    const nodeVersion = process.version;
    const minNodeVersion = 'v18.0.0';
    if (nodeVersion < minNodeVersion) {
      issues.push(`Node.js ${minNodeVersion}+ required (found ${nodeVersion})`);
    }

    // Check Git
    try {
      execSync('git --version', { stdio: 'pipe', shell: true });
    } catch {
      issues.push('Git is required for repository operations');
    }

    // Optional checks (warn if missing but don't block)

    // Check Docker
    try {
      execSync('docker --version', { stdio: 'pipe', shell: true });
    } catch {
      warnings.push('Docker not found - needed for local testing of proof/refiner containers');
    }

    // Check Python
    try {
      execSync('python3 --version', { stdio: 'pipe', shell: true });
    } catch {
      try {
        execSync('python --version', { stdio: 'pipe', shell: true });
      } catch {
        warnings.push('Python not found - needed for local proof/refiner development');
      }
    }

    // Check Poetry
    try {
      execSync('poetry --version', { stdio: 'pipe', shell: true });
    } catch {
      warnings.push('Poetry not found - useful for Python dependency management');
    }

    // Check GitHub CLI
    try {
      execSync('gh --version', { stdio: 'pipe', shell: true });
    } catch {
      warnings.push('GitHub CLI not found - enables automated repository setup');
    }

    spinner.stop();

    // Handle hard failures
    if (issues.length > 0) {
      console.log(chalk.red('❌ Missing required dependencies:'));
      issues.forEach(issue => console.log(chalk.red(`   • ${issue}`)));
      console.log();
      console.log(chalk.yellow('Please install missing dependencies and try again.'));
      console.log(chalk.blue('Installation guides:'));
      console.log('  • Node.js: https://nodejs.org/');
      console.log('  • Git: https://git-scm.com/downloads');
      return false;
    }

    // Show warnings but continue
    if (warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Optional tools not found:'));
      warnings.forEach(warning => console.log(chalk.yellow(`   • ${warning}`)));
      console.log();
      console.log(chalk.blue('💡 Installation guides (optional):'));
      console.log('  • Docker: https://docs.docker.com/get-docker/');
      console.log('  • Python: https://www.python.org/downloads/');
      console.log('  • Poetry: https://python-poetry.org/docs/#installation');
      console.log('  • GitHub CLI: https://cli.github.com/');
      console.log();
      console.log(chalk.green('✅ You can install these later if needed for local development'));
      console.log();
    } else {
      console.log(chalk.green('✅ All prerequisites found'));
      console.log();
    }

    return true;

  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error checking prerequisites:'), error.message);
    return false;
  }
}

module.exports = {
  checkPrerequisites
};