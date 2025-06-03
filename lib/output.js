const chalk = require('chalk');

/**
 * Clean output utilities for better UX
 */
class OutputManager {
  constructor() {
    this.isQuiet = false;
    this.userInputMarker = '👤';
  }

  /**
   * Set quiet mode to reduce noise
   */
  setQuiet(quiet = true) {
    this.isQuiet = quiet;
  }

  /**
   * Main step header
   */
  step(title, description = '') {
    console.log();
    console.log(chalk.blue.bold(`🔄 ${title}`));
    if (description) {
      console.log(chalk.gray(`   ${description}`));
    }
    console.log();
  }

  /**
   * Success message
   */
  success(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Warning message
   */
  warning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Error message
   */
  error(message) {
    console.log(chalk.red(`❌ ${message}`));
  }

  /**
   * Info message (can be suppressed in quiet mode)
   */
  info(message, force = false) {
    if (!this.isQuiet || force) {
      console.log(chalk.cyan(`ℹ️  ${message}`));
    }
  }

  /**
   * Progress indicator
   */
  progress(message) {
    if (!this.isQuiet) {
      console.log(chalk.blue(`⏳ ${message}`));
    }
  }

  /**
   * Mark user input clearly
   */
  userInput(prompt) {
    console.log();
    console.log(chalk.bgBlue.white.bold(` ${this.userInputMarker} USER INPUT REQUIRED `));
    console.log(chalk.blue.bold(prompt));
    console.log();
  }

  /**
   * Show user's response
   */
  userResponse(response) {
    console.log(chalk.green(`${this.userInputMarker} ${response}`));
    console.log();
  }

  /**
   * Summary section
   */
  summary(title, items) {
    console.log();
    console.log(chalk.blue.bold(`📋 ${title}`));
    items.forEach(item => {
      if (typeof item === 'string') {
        console.log(`  • ${item}`);
      } else {
        console.log(`  • ${chalk.cyan(item.label)}: ${item.value}`);
      }
    });
    console.log();
  }

  /**
   * Next steps section
   */
  nextSteps(steps) {
    console.log();
    console.log(chalk.blue.bold('🚀 Next Steps:'));
    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    console.log();
  }

  /**
   * Divider for sections
   */
  divider() {
    if (!this.isQuiet) {
      console.log(chalk.gray('─'.repeat(50)));
    }
  }

  /**
   * Clear previous line (for progress updates)
   */
  clearLine() {
    process.stdout.write('\r\x1b[K');
  }

  /**
   * Progress bar for long operations
   */
  progressBar(current, total, message = '') {
    // Handle edge cases
    if (total === 0) {
      const bar = '░'.repeat(20);
      this.clearLine();
      process.stdout.write(`${chalk.blue(bar)} 0% ${message}`);
      return;
    }

    const percentage = Math.round((current / total) * 100);
    let filled = Math.round((current / total) * 20);
    
    // Clamp filled between 0 and 20
    filled = Math.max(0, Math.min(20, filled));
    
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    
    this.clearLine();
    process.stdout.write(`${chalk.blue(bar)} ${percentage}% ${message}`);
    
    if (current === total) {
      console.log(); // New line when complete
    }
  }
}

// Create singleton instance
const output = new OutputManager();

module.exports = output; 