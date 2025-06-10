#!/usr/bin/env node

/**
 * Create DataDAO CLI
 * Thin wrapper that delegates to lib/cli/index.js
 * 
 * This keeps the bin/ directory clean while moving all logic
 * to the lib/ directory following Node.js CLI best practices
 */

const CLI = require('../lib/cli/index');

async function main() {
  try {
    const cli = new CLI();
    await cli.run();
  } catch (error) {
    console.error('Unexpected error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();