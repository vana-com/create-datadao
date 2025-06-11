const {
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  VALIDATION_RULES,
  DEFAULTS,
  SYMBOLS,
  MESSAGES,
  ERROR_MESSAGES,
  PROMPTS
} = require('../constants');

describe('Constants', () => {
  
  describe('NETWORK_CONFIG', () => {
    test('should have Moksha testnet configuration', () => {
      expect(NETWORK_CONFIG.MOKSHA).toBeDefined();
      expect(NETWORK_CONFIG.MOKSHA.name).toBe('moksha');
      expect(NETWORK_CONFIG.MOKSHA.rpcUrl).toBe('https://rpc.moksha.vana.org');
      expect(NETWORK_CONFIG.MOKSHA.chainId).toBe(14800);
      expect(NETWORK_CONFIG.MOKSHA.explorerUrl).toBe('https://moksha.vanascan.io');
      expect(NETWORK_CONFIG.MOKSHA.faucetUrl).toBe('https://faucet.vana.org');
    });

    test('should have valid DEFAULT_NETWORK', () => {
      expect(DEFAULT_NETWORK).toEqual(NETWORK_CONFIG.MOKSHA);
    });
  });

  describe('VALIDATION_RULES', () => {
    test('should have DLP_NAME rules', () => {
      expect(VALIDATION_RULES.DLP_NAME.minLength).toBe(3);
      expect(VALIDATION_RULES.DLP_NAME.maxLength).toBe(50);
      expect(VALIDATION_RULES.DLP_NAME.required).toBe(true);
    });

    test('should have TOKEN_SYMBOL rules', () => {
      expect(VALIDATION_RULES.TOKEN_SYMBOL.minLength).toBe(3);
      expect(VALIDATION_RULES.TOKEN_SYMBOL.maxLength).toBe(10);
      expect(VALIDATION_RULES.TOKEN_SYMBOL.pattern).toEqual(/^[A-Z]+$/);
      expect(VALIDATION_RULES.TOKEN_SYMBOL.required).toBe(true);
    });

    test('should have PRIVATE_KEY rules', () => {
      expect(VALIDATION_RULES.PRIVATE_KEY.pattern).toEqual(/^0x[a-fA-F0-9]{64}$/);
      expect(VALIDATION_RULES.PRIVATE_KEY.required).toBe(true);
    });
  });

  describe('DEFAULTS', () => {
    test('should have project defaults', () => {
      expect(DEFAULTS.PROJECT.dlpName).toBe('MyDataDAO');
      expect(DEFAULTS.PROJECT.tokenName).toBe('MyDataToken');
      expect(DEFAULTS.PROJECT.tokenSymbol).toBe('MDT');
    });

    test('should have network default', () => {
      expect(DEFAULTS.NETWORK).toEqual(DEFAULT_NETWORK);
    });
  });

  describe('SYMBOLS', () => {
    test('should have all required symbols', () => {
      expect(SYMBOLS.SUCCESS).toBe('✅');
      expect(SYMBOLS.ERROR).toBe('❌');
      expect(SYMBOLS.WARNING).toBe('⚠️');
      expect(SYMBOLS.INFO).toBe('ℹ️');
      expect(SYMBOLS.STEP).toBe('🔄');
      expect(SYMBOLS.PROGRESS).toBe('⏳');
      expect(SYMBOLS.ROCKET).toBe('🚀');
      expect(SYMBOLS.CLIPBOARD).toBe('📋');
    });

    test('should have user interaction symbols', () => {
      expect(SYMBOLS.USER_INPUT).toBe('👤');
    });

    test('should have formatting symbols', () => {
      expect(SYMBOLS.DIVIDER).toBe('━');
      expect(SYMBOLS.BULLET).toBe('•');
    });
  });

  describe('MESSAGES', () => {
    test('should have welcome messages', () => {
      expect(MESSAGES.WELCOME.SETUP_INTRO).toContain('complete your DataDAO setup');
      expect(MESSAGES.WELCOME.TUTORIAL_ORDER).toContain('tutorial order');
      expect(MESSAGES.WELCOME.CONFIG_INTRO).toContain('information for your DataDAO');
    });

    test('should have wallet messages', () => {
      expect(MESSAGES.WALLET.HEADER).toBe('Wallet Configuration:');
      expect(MESSAGES.WALLET.PURPOSE).toContain('deploy contracts');
      expect(MESSAGES.WALLET.WARNING).toContain('dedicated wallet');
      expect(MESSAGES.WALLET.FUNDING_REMINDER).toContain('testnet VANA');
    });

    test('should have step messages for each phase', () => {
      expect(MESSAGES.STEPS.GITHUB_REPOS.TITLE).toBe('Set up GitHub repositories');
      expect(MESSAGES.STEPS.REGISTER_DATADAO.TITLE).toBe('Register DataDAO');
      expect(MESSAGES.STEPS.PROOF_CONFIG.TITLE).toBe('Configure Proof of Contribution');
      expect(MESSAGES.STEPS.REFINER_CONFIG.TITLE).toBe('Configure Data Refiner');
      expect(MESSAGES.STEPS.UI_CONFIG.TITLE).toBe('Configure UI');
    });

    test('should have completion messages', () => {
      expect(MESSAGES.COMPLETION.FULL_SUCCESS).toContain('fully configured and ready');
      expect(MESSAGES.COMPLETION.PARTIAL_WARNING).toContain('additional configuration');
    });

    test('should have help messages', () => {
      expect(MESSAGES.HELP.USEFUL_COMMANDS).toBe('Useful Commands:');
      expect(MESSAGES.HELP.STATUS_CHECK).toContain('create-datadao status');
      expect(MESSAGES.HELP.TIPS.GET_TESTNET_VANA).toContain('faucet.vana.org');
    });
  });

  describe('ERROR_MESSAGES', () => {
    test('should have validation error messages', () => {
      expect(ERROR_MESSAGES.VALIDATION.REQUIRED).toBe('This field is required');
      expect(ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED).toBe('DataDAO name is required');
      expect(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT).toBe('Token symbol must be uppercase letters only');
      expect(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_FORMAT).toContain('64 hex characters');
    });

    test('should have templated error messages', () => {
      expect(ERROR_MESSAGES.VALIDATION.DLP_NAME_TOO_SHORT).toContain('{min}');
      expect(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_LENGTH).toContain('{min}');
      expect(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_LENGTH).toContain('{max}');
    });

    test('should have config error messages', () => {
      expect(ERROR_MESSAGES.CONFIG.MISSING_FIELD).toContain('{field}');
    });
  });

  describe('PROMPTS', () => {
    test('should have prompt configurations', () => {
      expect(PROMPTS.DLP_NAME.message).toBe('DataDAO name:');
      expect(PROMPTS.DLP_NAME.default).toBe(DEFAULTS.PROJECT.dlpName);
      
      expect(PROMPTS.TOKEN_NAME.message).toBe('Token name:');
      expect(PROMPTS.TOKEN_NAME.default).toBe(DEFAULTS.PROJECT.tokenName);
      
      expect(PROMPTS.TOKEN_SYMBOL.message).toBe('Token symbol:');
      expect(PROMPTS.TOKEN_SYMBOL.default).toBe(DEFAULTS.PROJECT.tokenSymbol);
    });

    test('should have password prompts', () => {
      expect(PROMPTS.PRIVATE_KEY.type).toBe('password');
      expect(PROMPTS.PINATA_API_SECRET.type).toBe('password');
      expect(PROMPTS.GOOGLE_CLIENT_SECRET.type).toBe('password');
    });

    test('should have all required prompt fields', () => {
      const requiredPrompts = [
        'DLP_NAME',
        'TOKEN_NAME', 
        'TOKEN_SYMBOL',
        'PRIVATE_KEY',
        'PINATA_API_KEY',
        'PINATA_API_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GITHUB_USERNAME'
      ];

      requiredPrompts.forEach(prompt => {
        expect(PROMPTS[prompt]).toBeDefined();
        expect(PROMPTS[prompt].message).toBeDefined();
      });
    });
  });

  describe('Message Structure Consistency', () => {
    test('all step messages should have consistent structure', () => {
      const stepKeys = Object.keys(MESSAGES.STEPS);
      
      stepKeys.forEach(stepKey => {
        const step = MESSAGES.STEPS[stepKey];
        expect(step.TITLE).toBeDefined();
        expect(step.DESCRIPTION).toBeDefined();
        
        // Most steps should have these common fields
        if (stepKey !== 'UI_TEST') {
          expect(step.SUCCESS).toBeDefined();
          expect(step.SKIPPED).toBeDefined();
        }
      });
    });

    test('all validation rules should have required field', () => {
      const ruleKeys = Object.keys(VALIDATION_RULES);
      
      ruleKeys.forEach(ruleKey => {
        const rule = VALIDATION_RULES[ruleKey];
        expect(rule.required).toBeDefined();
        expect(typeof rule.required).toBe('boolean');
      });
    });
  });

  describe('Constants Immutability', () => {
    test('constants should maintain their integrity', () => {
      // Test that constants have expected values (basic integrity check)
      expect(DEFAULTS.PROJECT.dlpName).toBe('MyDataDAO');
      expect(DEFAULTS.PROJECT.tokenName).toBe('MyDataToken');
      expect(DEFAULTS.PROJECT.tokenSymbol).toBe('MDT');
      
      // TODO: Implement Object.freeze for true immutability if needed
      // For now, we rely on discipline and linting to prevent modification
    });
  });
}); 