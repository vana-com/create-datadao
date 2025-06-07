const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

/**
 * Enhanced state management for DataDAO deployment with error recovery
 */
class DeploymentStateManager {
  constructor(projectRoot = process.cwd()) {
    this.deploymentPath = path.join(projectRoot, 'deployment.json');
    this.state = this.loadState();
  }

  /**
   * Load deployment state from file
   */
  loadState() {
    if (!fs.existsSync(this.deploymentPath)) {
      throw new Error('deployment.json not found. Run deployment steps in order.');
    }

    const deployment = JSON.parse(fs.readFileSync(this.deploymentPath, 'utf8'));

    // Initialize state tracking if not present
    if (!deployment.state) {
      deployment.state = {
        contractsDeployed: !!deployment.tokenAddress && !!deployment.proxyAddress,
        dataDAORegistered: !!deployment.dlpId,
        proofConfigured: false,
        proofGitSetup: false,
        proofPublished: false,
        refinerConfigured: false,
        refinerGitSetup: false,
        refinerPublished: false,
        uiConfigured: false
      };
      this.saveState(deployment);
    }

    // Add error tracking
    if (!deployment.errors) {
      deployment.errors = {};
    }

    return deployment;
  }

  /**
   * Save state to file with backup
   */
  saveState(newState = null) {
    const stateToSave = newState || this.state;
    
    // Create backup before saving
    if (fs.existsSync(this.deploymentPath)) {
      const backupPath = this.deploymentPath + '.backup';
      fs.copyFileSync(this.deploymentPath, backupPath);
    }
    
    fs.writeFileSync(this.deploymentPath, JSON.stringify(stateToSave, null, 2));
    if (!newState) {
      this.state = stateToSave;
    }
  }

  /**
   * Record an error for a specific step
   */
  recordError(step, error) {
    this.state.errors[step] = {
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    this.saveState();
  }

  /**
   * Clear error for a step
   */
  clearError(step) {
    if (this.state.errors[step]) {
      delete this.state.errors[step];
      this.saveState();
    }
  }

  /**
   * Get recovery suggestions for failed steps
   */
  getRecoverySuggestions() {
    const suggestions = [];
    
    if (this.state.errors.contractsDeployed) {
      suggestions.push({
        step: 'Contract Deployment',
        issue: 'Smart contract deployment failed',
        solutions: [
          'Check wallet balance (need VANA tokens)',
          'Verify network connectivity',
          'Try again: npm run deploy:contracts'
        ]
      });
    }

    if (this.state.errors.dataDAORegistered) {
      suggestions.push({
        step: 'DataDAO Registration',
        issue: 'Registration on Vana network failed',
        solutions: [
          'Ensure contracts are deployed first',
          'Check you have 1 VANA for registration fee',
          'Try again: npm run register:datadao'
        ]
      });
    }

    if (this.state.errors.proofConfigured) {
      suggestions.push({
        step: 'Proof of Contribution',
        issue: 'Proof system configuration failed',
        solutions: [
          'Ensure GitHub repository is accessible',
          'Check dlpId is available from registration',
          'Verify git configuration and permissions',
          'Try again: npm run deploy:proof'
        ]
      });
    }

    if (this.state.errors.refinerConfigured) {
      suggestions.push({
        step: 'Data Refiner',
        issue: 'Refiner configuration failed',
        solutions: [
          'Ensure Docker is running (for local schema generation)',
          'Check Pinata API credentials are valid',
          'Verify GitHub repository is accessible',
          'Check encryption key retrieval from blockchain',
          'Try again: npm run deploy:refiner'
        ]
      });
    }

    if (this.state.errors.uiConfigured) {
      suggestions.push({
        step: 'User Interface',
        issue: 'UI configuration failed',
        solutions: [
          'Ensure proof deployment completed (need proofUrl)',
          'Ensure refiner registration completed (need refinerId)',
          'Check Google OAuth credentials are valid',
          'Check Pinata API credentials are valid',
          'Try again: npm run deploy:ui'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Interactive recovery menu
   */
  async showRecoveryMenu() {
    const suggestions = this.getRecoverySuggestions();
    
    if (suggestions.length === 0) {
      console.log(chalk.blue('ℹ️  No critical errors detected in completed steps.'));
      console.log(chalk.gray('Note: This only checks for errors, not incomplete steps.'));
      return;
    }

    console.log(chalk.yellow('\n⚠️  Issues detected in your DataDAO setup:'));
    console.log();

    for (const suggestion of suggestions) {
      console.log(chalk.red(`❌ ${suggestion.step}: ${suggestion.issue}`));
      console.log(chalk.blue('   Solutions:'));
      suggestion.solutions.forEach(solution => {
        console.log(chalk.gray(`   • ${solution}`));
      });
      console.log();
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔄 Retry failed steps automatically', value: 'retry' },
          { name: '📝 Update configuration', value: 'config' },
          { name: '📊 Show detailed status', value: 'status' },
          { name: '❌ Exit (fix manually)', value: 'exit' }
        ]
      }
    ]);

    return action;
  }

  /**
   * Validate configuration and suggest fixes
   */
  validateConfiguration() {
    const issues = [];

    // Check required fields
    const requiredFields = [
      'dlpName', 'tokenName', 'tokenSymbol', 'privateKey', 'address'
    ];

    for (const field of requiredFields) {
      if (!this.state[field]) {
        issues.push(`Missing ${field}`);
      }
    }

    // Check external service credentials
    if (!this.state.pinataApiKey || !this.state.pinataApiSecret) {
      issues.push('Missing Pinata credentials');
    }

    if (!this.state.googleClientId || !this.state.googleClientSecret) {
      issues.push('Missing Google OAuth credentials');
    }

    // Check deployment state consistency
    if (this.state.state.dataDAORegistered && !this.state.dlpId) {
      issues.push('Marked as registered but missing dlpId');
    }

    if (this.state.state.contractsDeployed) {
      // Check both old and new contract address formats
      const hasOldFormat = this.state.tokenAddress && this.state.proxyAddress;
      const hasNewFormat = this.state.contracts && this.state.contracts.tokenAddress && this.state.contracts.proxyAddress;
      
      if (!hasOldFormat && !hasNewFormat) {
        issues.push('Marked as deployed but missing contract addresses');
      }
    }

    return issues;
  }

  /**
   * Fix common configuration issues
   */
  async fixConfiguration() {
    const issues = this.validateConfiguration();
    
    if (issues.length === 0) {
      console.log(chalk.green('✅ Configuration looks good!'));
      return;
    }

    console.log(chalk.yellow('🔧 Configuration issues found:'));
    issues.forEach(issue => console.log(`  • ${issue}`));
    console.log();

    const { shouldFix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldFix',
        message: 'Would you like to fix these issues now?',
        default: true
      }
    ]);

    if (!shouldFix) return;

    // Interactive fixes for each issue
    for (const issue of issues) {
      if (issue.includes('Pinata')) {
        const { pinataApiKey, pinataApiSecret } = await inquirer.prompt([
          {
            type: 'input',
            name: 'pinataApiKey',
            message: 'Enter Pinata API Key:',
            validate: input => input.trim() !== '' || 'API Key is required'
          },
          {
            type: 'password',
            name: 'pinataApiSecret',
            message: 'Enter Pinata API Secret:',
            validate: input => input.trim() !== '' || 'API Secret is required'
          }
        ]);

        this.updateDeployment({ pinataApiKey, pinataApiSecret });
        console.log(chalk.green('✅ Pinata credentials updated'));
      }

      if (issue.includes('Google OAuth')) {
        const { googleClientId, googleClientSecret } = await inquirer.prompt([
          {
            type: 'input',
            name: 'googleClientId',
            message: 'Enter Google OAuth Client ID:',
            validate: input => input.trim() !== '' || 'Client ID is required'
          },
          {
            type: 'password',
            name: 'googleClientSecret',
            message: 'Enter Google OAuth Client Secret:',
            validate: input => input.trim() !== '' || 'Client Secret is required'
          }
        ]);

        this.updateDeployment({ googleClientId, googleClientSecret });
        console.log(chalk.green('✅ Google OAuth credentials updated'));
      }
    }
  }

  /**
   * Update specific state fields
   */
  updateState(updates) {
    this.state.state = { ...this.state.state, ...updates };
    this.saveState();
    return this.state;
  }

  /**
   * Update deployment data (non-state fields)
   */
  updateDeployment(updates) {
    Object.assign(this.state, updates);
    this.saveState();
    return this.state;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if a step is completed - looks at both state flags and actual data
   */
  isCompleted(step) {
    // First check the explicit state flag
    if (this.state.state[step]) {
      return true;
    }

    // If state flag is false, check if we have the data that proves completion
    switch (step) {
      case 'contractsDeployed':
        // Check both old and new contract address formats
        const hasOldFormat = this.state.tokenAddress && this.state.proxyAddress;
        const hasNewFormat = this.state.contracts && this.state.contracts.tokenAddress && this.state.contracts.proxyAddress;
        return hasOldFormat || hasNewFormat;

      case 'dataDAORegistered':
        // If we have a dlpId, registration was successful
        return !!this.state.dlpId;

      case 'proofGitSetup':
        // If we have a proof repo URL, GitHub setup was done
        return !!this.state.proofRepo;

      case 'refinerGitSetup':
        // If we have a refiner repo URL, GitHub setup was done
        return !!this.state.refinerRepo;

      case 'proofConfigured':
        // Check for proof deployment artifacts
        return !!(this.state.proofUrl || this.state.proofContractAddress);

      case 'refinerConfigured':
        // Check for refiner deployment artifacts
        return !!(this.state.refinerId || this.state.refinerContractAddress);

      case 'uiConfigured':
        // Check if UI environment files exist (this should check filesystem in real implementation)
        // For now, just use the state flag
        return !!this.state.state[step];

      default:
        return !!this.state.state[step];
    }
  }

  /**
   * Mark a step as completed
   */
  markCompleted(step, data = {}) {
    this.updateState({ [step]: true });
    if (Object.keys(data).length > 0) {
      this.updateDeployment(data);
    }
  }

  /**
   * Sync state flags based on actual data present
   */
  syncStateFromData() {
    const updates = {};
    let hasUpdates = false;

    // Check contracts deployment
    if (!this.state.state.contractsDeployed && this.isCompleted('contractsDeployed')) {
      updates.contractsDeployed = true;
      hasUpdates = true;
    }

    // Check DataDAO registration
    if (!this.state.state.dataDAORegistered && this.isCompleted('dataDAORegistered')) {
      updates.dataDAORegistered = true;
      hasUpdates = true;
    }

    // Check GitHub setup
    if (!this.state.state.proofGitSetup && this.isCompleted('proofGitSetup')) {
      updates.proofGitSetup = true;
      hasUpdates = true;
    }

    if (!this.state.state.refinerGitSetup && this.isCompleted('refinerGitSetup')) {
      updates.refinerGitSetup = true;
      hasUpdates = true;
    }

    // Check proof configuration
    if (!this.state.state.proofConfigured && this.isCompleted('proofConfigured')) {
      updates.proofConfigured = true;
      hasUpdates = true;
    }

    // Check refiner configuration
    if (!this.state.state.refinerConfigured && this.isCompleted('refinerConfigured')) {
      updates.refinerConfigured = true;
      hasUpdates = true;
    }

    if (hasUpdates) {
      this.updateState(updates);
      return updates;
    }

    return null;
  }

  /**
   * Display current progress
   */
  showProgress() {
    const steps = [
      { key: 'contractsDeployed', name: 'Smart Contracts Deployed' },
      { key: 'dataDAORegistered', name: 'DataDAO Registered' },
      { key: 'proofConfigured', name: 'Proof of Contribution Configured' },
      { key: 'proofPublished', name: 'Proof of Contribution Published' },
      { key: 'refinerConfigured', name: 'Data Refiner Configured' },
      { key: 'refinerPublished', name: 'Data Refiner Published' },
      { key: 'uiConfigured', name: 'UI Configured' }
    ];

    console.log(chalk.blue('\n📋 Deployment Progress:'));
    steps.forEach(step => {
      const status = this.isCompleted(step.key) ?
        chalk.green('✅') : chalk.gray('⏸️');
      console.log(`  ${status} ${step.name}`);
    });
    console.log();
  }

  /**
   * Get the next incomplete step in the deployment process
   */
  getNextIncompleteStep() {
    const steps = [
      'contractsDeployed',
      'dataDAORegistered', 
      'proofConfigured',
      'refinerConfigured',
      'uiConfigured'
    ];
    
    for (const step of steps) {
      if (!this.isCompleted(step)) {
        return step;
      }
    }
    
    return null; // All steps completed
  }

  /**
   * Validate required fields for a step
   */
  validateRequiredFields(requiredFields) {
    const missing = requiredFields.filter(field => {
      // Handle nested field paths like 'contracts.tokenAddress'
      const fieldParts = field.split('.');
      let value = this.state;
      
      for (const part of fieldParts) {
        if (!value || !value[part]) {
          return true; // Field is missing
        }
        value = value[part];
      }
      
      return false; // Field exists
    });
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}

module.exports = DeploymentStateManager;