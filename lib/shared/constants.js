/**
 * Constants and Single Sources of Truth (SSOT)
 * Centralized location for all user-facing messages, validation rules, and configuration values
 */

// ================================
// NETWORK CONFIGURATION
// ================================
const NETWORK_CONFIG = {
  MOKSHA: {
    name: 'moksha',
    rpcUrl: 'https://rpc.moksha.vana.org',
    chainId: 14800,
    explorerUrl: 'https://moksha.vanascan.io',
    faucetUrl: 'https://faucet.vana.org'
  }
};

const DEFAULT_NETWORK = NETWORK_CONFIG.MOKSHA;

// ================================
// VALIDATION RULES
// ================================
const VALIDATION_RULES = {
  DLP_NAME: {
    minLength: 3,
    maxLength: 50,
    required: true
  },
  TOKEN_NAME: {
    minLength: 3,
    maxLength: 50,
    required: true
  },
  TOKEN_SYMBOL: {
    minLength: 3,
    maxLength: 10,
    pattern: /^[A-Z]+$/,
    required: true
  },
  PRIVATE_KEY: {
    pattern: /^0x[a-fA-F0-9]{64}$/,
    required: true
  },
  GITHUB_USERNAME: {
    minLength: 1,
    required: true
  },
  API_KEY: {
    minLength: 1,
    required: true
  }
};

// ================================
// DEFAULT VALUES
// ================================
const DEFAULTS = {
  PROJECT: {
    dlpName: 'MyDataDAO',
    tokenName: 'MyDataToken',
    tokenSymbol: 'MDT'
  },
  NETWORK: DEFAULT_NETWORK
};

// ================================
// EMOJI AND SYMBOLS
// ================================
const SYMBOLS = {
  // Status symbols
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  STEP: '🔄',
  PROGRESS: '⏳',
  SEARCH: '🔍',
  ROCKET: '🚀',
  GEAR: '🔧',
  ART: '🎨',
  CELEBRATION: '🎉',
  TARGET: '🎯',
  FOLDER: '📁',
  BOOKS: '📚',
  CLIPBOARD: '📋',
  FINISH: '🏁',
  PAUSE: '⏸️',
  KEY: '🔑',
  GITHUB: '🐙',
  CHART: '📊',
  
  // User interaction
  USER_INPUT: '👤',
  
  // Dividers and formatting
  DIVIDER: '━',
  BULLET: '•'
};

// ================================
// USER-FACING MESSAGES
// ================================
const MESSAGES = {
  // Welcome and introductions
  WELCOME: {
    SETUP_INTRO: 'Let\'s complete your DataDAO setup step by step!',
    TUTORIAL_ORDER: 'Following the official tutorial order for best results.',
    CONFIG_INTRO: 'Please provide the following information for your DataDAO:'
  },

  // Wallet configuration
  WALLET: {
    HEADER: 'Wallet Configuration:',
    PURPOSE: 'Your wallet is used to deploy contracts and manage your DataDAO.',
    WARNING: 'IMPORTANT: Use a dedicated wallet for testing purposes only.',
    FUNDING_REMINDER: 'Make sure to fund this address with testnet VANA!',
    DERIVING: 'Deriving wallet credentials...',
    DERIVED_SUCCESS: 'Wallet credentials derived successfully',
    INSTRUCTIONS: {
      HEADER: 'To get a private key:',
      STEPS: [
        'Go to https://privatekeys.pw/keys/ethereum/random (for testing only)',
        'Pick any random key from the list',
        'Copy the Private Key',
        'The address and public key will be automatically derived'
      ]
    }
  },

  // External services
  SERVICES: {
    HEADER: 'External Services (Required):',
    PURPOSE: 'These services are required for data collection and storage.',
    PINATA_INSTRUCTIONS: 'Pinata: Sign up at https://pinata.cloud, create an API key and secret pair, and enable legacy IPFS permissions.',
    GOOGLE_INSTRUCTIONS: 'Google OAuth: Create credentials at https://console.cloud.google.com, and enable the Google Drive API for the project.',
    SECRET_WARNING: 'COPY NOW - Won\'t be shown again!'
  },

  // GitHub integration
  GITHUB: {
    HEADER: 'GitHub Integration:',
    PURPOSE: 'Your GitHub username is needed for forking the template repositories.',
    REPOSITORY_SETUP: 'GitHub Repository Setup'
  },

  // Step descriptions
  STEPS: {
    GITHUB_REPOS: {
      TITLE: 'Set up GitHub repositories',
      DESCRIPTION: 'Your DataDAO needs template repositories for proof validation and data refinement.',
      WARNING: 'This step is required before configuring proof/refiner components.',
      SUCCESS: 'GitHub repositories configured and saved',
      ALREADY_DONE: 'GitHub repositories already set up',
      SKIPPED: 'Skipping GitHub setup for now.',
      SKIP_WARNING: 'Warning: Proof and refiner configuration requires GitHub repositories.',
      SKIP_NOTE: 'You can complete this later, but it\'s needed for the next steps.'
    },
    
    REGISTER_DATADAO: {
      TITLE: 'Register DataDAO',
      DESCRIPTION: 'This registers your DataDAO with the Vana network so it can accept data contributions.',
      WARNING: 'This requires additional VANA tokens for registration fees.',
      PROGRESS: 'Registering your DataDAO...',
      SUCCESS: 'DataDAO registered successfully!',
      FAILURE: 'DataDAO registration failed',
      FAILURE_REASON: 'This is usually due to insufficient VANA tokens or network issues.',
      RETRY_COMMAND: 'npm run register:datadao',
      ALREADY_DONE: 'DataDAO already registered',
      SKIPPED: 'Skipping DataDAO registration for now.',
      SKIP_WARNING: 'Warning: Proof configuration requires registration to get dlpId.'
    },
    
    PROOF_CONFIG: {
      TITLE: 'Configure Proof of Contribution',
      DESCRIPTION: 'This validates that contributed data is authentic and meets your criteria.',
      WARNING: 'Requires GitHub repositories and DataDAO registration.',
      GITHUB_REQUIRED: 'GitHub setup required first. Please complete Step 1.',
      REGISTRATION_REQUIRED: 'DataDAO registration required first. Please complete Step 2.',
      PROGRESS: 'Configuring proof of contribution...',
      SUCCESS: 'Proof of contribution configured successfully!',
      FAILURE: 'Proof configuration failed',
      RETRY_COMMAND: 'npm run deploy:proof',
      ALREADY_DONE: 'Proof of contribution already configured',
      SKIPPED: 'Skipping proof configuration for now.',
      SKIP_INSTRUCTIONS: 'Complete GitHub setup and registration first, then run: npm run deploy:proof'
    },
    
    REFINER_CONFIG: {
      TITLE: 'Configure Data Refiner',
      DESCRIPTION: 'This structures contributed data into queryable databases.',
      WARNING: 'Requires GitHub repositories to be set up first.',
      GITHUB_REQUIRED: 'GitHub setup required first. Please complete Step 1.',
      PROGRESS: 'Configuring data refiner...',
      SUCCESS: 'Data refiner configured successfully!',
      FAILURE: 'Refiner configuration failed',
      RETRY_COMMAND: 'npm run deploy:refiner',
      ALREADY_DONE: 'Data refiner already configured',
      SKIPPED: 'Skipping refiner configuration for now.',
      SKIP_INSTRUCTIONS: 'Complete GitHub setup first, then run: npm run deploy:refiner'
    },
    
    UI_CONFIG: {
      TITLE: 'Configure UI',
      DESCRIPTION: 'This sets up the user interface for data contributions.',
      PROGRESS: 'Configuring UI...',
      SUCCESS: 'UI configured successfully!',
      FAILURE: 'UI configuration failed',
      RETRY_COMMAND: 'npm run deploy:ui',
      ALREADY_DONE: 'UI already configured',
      SKIPPED: 'Skipping UI configuration for now.'
    },
    
    UI_TEST: {
      TITLE: 'Test your DataDAO UI',
      DESCRIPTION: 'Let\'s verify the user interface is working correctly.',
      NOTE: 'This will show you how to start the UI, but won\'t block the setup process.',
      INSTRUCTIONS_HEADER: 'UI Testing Instructions:',
      INSTRUCTIONS: [
        'Open a new terminal window',
        'Navigate to your project: cd {targetDir}',
        'Start the UI: npm run ui:dev',
        'Visit http://localhost:3000 in your browser',
        'Test the data contribution flow',
        'Press Ctrl+C in the UI terminal when done'
      ],
      BACKGROUND_NOTE: 'The UI will run in the background while you continue with other tasks.',
      SUCCESS: 'UI testing instructions provided',
      SKIPPED: 'Skipping UI testing instructions.',
      SKIP_COMMAND: 'You can test the UI anytime with: npm run ui:dev'
    }
  },

  // Summary and completion
  SUMMARY: {
    HEADER: 'Setup Summary:',
    ITEMS: {
      CONTRACTS: 'Smart contracts deployed',
      DATADAO_REGISTERED: 'DataDAO registered',
      GITHUB_SETUP: 'GitHub repositories setup',
      PROOF_CONFIGURED: 'Proof of contribution configured',
      REFINER_CONFIGURED: 'Data refiner configured',
      UI_CONFIGURED: 'UI configured'
    }
  },

  // Completion messages
  COMPLETION: {
    FULL_SUCCESS: 'Your DataDAO is fully configured and ready!',
    PARTIAL_WARNING: 'Your DataDAO needs additional configuration to be fully functional',
    WHAT_NOW_HEADER: 'What you can do now:',
    COMPLETE_SETUP_HEADER: 'To complete setup:',
    ACTIONS: {
      TEST_UI: 'Test the UI with: npm run ui:dev',
      START_CONTRIBUTIONS: 'Start accepting data contributions',
      CUSTOMIZE_LOGIC: 'Customize your validation logic and schemas',
      DEPLOY_PRODUCTION: 'Deploy to production when ready',
      REGISTER_DATADAO: 'Register DataDAO: npm run register:datadao',
      SETUP_GITHUB: 'Set up GitHub repositories (required for proof/refiner)',
      CONFIGURE_PROOF: 'Configure proof of contribution: npm run deploy:proof',
      CONFIGURE_REFINER: 'Configure data refiner: npm run deploy:refiner',
      CONFIGURE_UI: 'Configure UI: npm run deploy:ui'
    }
  },

  // General operations
  OPERATIONS: {
    POLLING_KEY: 'Polling for encryption key (dlpId: {dlpId})...',
    KEY_RETRIEVED: 'Encryption key retrieved!',
    WAITING_KEY: 'Waiting for encryption key... ({remaining} attempts remaining)',
    KEY_ERROR: 'Error polling encryption key: {error}',
    EXTRACTING_REFINER_ID: 'Extracting refinerId from transaction: {txHash}',
    REFINER_ID_FOUND: 'Found refinerId: {refinerId}',
    REFINER_ID_ERROR: 'Could not extract refinerId automatically: {error}',
    WAITING_CONFIRMATION: 'Waiting for transaction confirmation...',
    MANUAL_COMMANDS_HEADER: 'You may need to run these commands manually:',
    MANUAL_COMMANDS: [
      'cd {projectName}',
      'npm install',
      'cd contracts && npm install',
      'cd ../ui && npm install'
    ]
  },

  // Help and tips
  HELP: {
    USEFUL_COMMANDS: 'Useful Commands:',
    STATUS_CHECK: 'create-datadao status     - Check progress & resume setup',
    STATUS_CURRENT: 'create-datadao status .   - Status for current directory',
    TIPS: {
      RUN_FROM_PROJECT: 'Tip: Run commands from your project directory',
      CONFIG_VIA_JSON: 'Tip: Provide config via JSON: --config my-config.json',
      GET_TESTNET_VANA: 'Tip: Get testnet VANA at https://faucet.vana.org'
    },
    PROJECT_LOCATION: 'Project location: {path}',
    CHECK_PROGRESS: 'Check progress anytime: npm run status',
    RESUME_SETUP: 'Resume setup anytime: npm run deploy'
  }
};

// ================================
// ERROR MESSAGES
// ================================
const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED: 'This field is required',
    DLP_NAME_REQUIRED: 'DataDAO name is required',
    DLP_NAME_TOO_SHORT: 'DataDAO name must be at least {min} characters',
    DLP_NAME_TOO_LONG: 'DataDAO name must be less than {max} characters',
    TOKEN_NAME_REQUIRED: 'Token name is required',
    TOKEN_NAME_TOO_SHORT: 'Token name must be at least {min} characters',
    TOKEN_NAME_TOO_LONG: 'Token name must be less than {max} characters',
    TOKEN_SYMBOL_REQUIRED: 'Token symbol is required',
    TOKEN_SYMBOL_LENGTH: 'Token symbol must be {min}-{max} characters',
    TOKEN_SYMBOL_FORMAT: 'Token symbol must be uppercase letters only',
    PRIVATE_KEY_REQUIRED: 'Private key is required',
    PRIVATE_KEY_FORMAT: 'Invalid private key format. Expected 64 hex characters (with or without 0x prefix)',
    PRIVATE_KEY_INVALID: 'Invalid private key: Unable to derive wallet credentials',
    GITHUB_USERNAME_REQUIRED: 'GitHub username is required',
    PINATA_KEY_REQUIRED: 'Pinata API Key is required for IPFS storage',
    PINATA_SECRET_REQUIRED: 'Pinata API Secret is required',
    GOOGLE_CLIENT_ID_REQUIRED: 'Google Client ID is required for data collection',
    GOOGLE_CLIENT_SECRET_REQUIRED: 'Google Client Secret is required',
    ADDRESS_FORMAT: 'Invalid address format. Must be a 0x-prefixed 40-character hex string',
    PUBLIC_KEY_FORMAT: 'Invalid public key format. Must be a 0x-prefixed hex string',
    PRIVATE_KEY_STRING: 'Private key must be a non-empty string'
  },
  
  CONFIG: {
    MISSING_FIELD: 'Missing required field: {field}'
  }
};

// ================================
// PROMPT CONFIGURATIONS
// ================================
const PROMPTS = {
  DLP_NAME: {
    message: 'DataDAO name:',
    default: DEFAULTS.PROJECT.dlpName
  },
  TOKEN_NAME: {
    message: 'Token name:',
    default: DEFAULTS.PROJECT.tokenName
  },
  TOKEN_SYMBOL: {
    message: 'Token symbol:',
    default: DEFAULTS.PROJECT.tokenSymbol
  },
  PRIVATE_KEY: {
    message: 'Private key (with or without 0x prefix):',
    type: 'password'
  },
  PINATA_API_KEY: {
    message: 'Pinata API Key:'
  },
  PINATA_API_SECRET: {
    message: 'Pinata API Secret:',
    type: 'password'
  },
  GOOGLE_CLIENT_ID: {
    message: 'Google OAuth Client ID:'
  },
  GOOGLE_CLIENT_SECRET: {
    message: 'Google OAuth Client Secret:',
    type: 'password'
  },
  GITHUB_USERNAME: {
    message: 'GitHub username:'
  }
};

module.exports = {
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  VALIDATION_RULES,
  DEFAULTS,
  SYMBOLS,
  MESSAGES,
  ERROR_MESSAGES,
  PROMPTS
}; 