const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Shared state management for DataDAO deployment
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

    return deployment;
  }

  /**
   * Save state to file
   */
  saveState(newState = null) {
    const stateToSave = newState || this.state;
    fs.writeFileSync(this.deploymentPath, JSON.stringify(stateToSave, null, 2));
    if (!newState) {
      this.state = stateToSave;
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
   * Check if a step is completed
   */
  isCompleted(step) {
    return !!this.state.state[step];
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
   * Validate required fields for a step
   */
  validateRequiredFields(requiredFields) {
    const missing = requiredFields.filter(field => !this.state[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}

module.exports = DeploymentStateManager;