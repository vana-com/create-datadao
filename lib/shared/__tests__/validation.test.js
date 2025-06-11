const Validator = require('../validation');
const { VALIDATION_RULES, ERROR_MESSAGES } = require('../constants');

describe('Validator', () => {
  
  describe('validateRequired', () => {
    test('should pass for non-empty strings', () => {
      expect(Validator.validateRequired('test')).toBe(true);
      expect(Validator.validateRequired(' test ')).toBe(true);
    });

    test('should fail for empty or null values', () => {
      expect(Validator.validateRequired('')).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
      expect(Validator.validateRequired('  ')).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
      expect(Validator.validateRequired(null)).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
      expect(Validator.validateRequired(undefined)).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
    });
  });

  describe('validateDlpName', () => {
    test('should pass for valid DLP names', () => {
      expect(Validator.validateDlpName('MyDataDAO')).toBe(true);
      expect(Validator.validateDlpName('ValidName123')).toBe(true);
      expect(Validator.validateDlpName('A'.repeat(50))).toBe(true); // Max length
    });

    test('should fail for empty names', () => {
      expect(Validator.validateDlpName('')).toBe(ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED);
      expect(Validator.validateDlpName('  ')).toBe(ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED);
    });

    test('should fail for names too short', () => {
      const result = Validator.validateDlpName('AB');
      expect(result).toContain('at least 3 characters');
    });

    test('should fail for names too long', () => {
      const result = Validator.validateDlpName('A'.repeat(51));
      expect(result).toContain('less than 50 characters');
    });
  });

  describe('validateTokenName', () => {
    test('should pass for valid token names', () => {
      expect(Validator.validateTokenName('MyToken')).toBe(true);
      expect(Validator.validateTokenName('DataToken123')).toBe(true);
      expect(Validator.validateTokenName('A'.repeat(50))).toBe(true);
    });

    test('should fail for empty names', () => {
      expect(Validator.validateTokenName('')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_NAME_REQUIRED);
    });

    test('should fail for names too short or too long', () => {
      expect(Validator.validateTokenName('AB')).toContain('at least 3 characters');
      expect(Validator.validateTokenName('A'.repeat(51))).toContain('less than 50 characters');
    });
  });

  describe('validateTokenSymbol', () => {
    test('should pass for valid token symbols', () => {
      expect(Validator.validateTokenSymbol('MDT')).toBe(true);
      expect(Validator.validateTokenSymbol('TOKEN')).toBe(true);
      expect(Validator.validateTokenSymbol('ABCDEFGHIJ')).toBe(true); // 10 chars max
    });

    test('should fail for empty symbols', () => {
      expect(Validator.validateTokenSymbol('')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_REQUIRED);
    });

    test('should fail for wrong length', () => {
      expect(Validator.validateTokenSymbol('AB')).toContain('3-10 characters');
      expect(Validator.validateTokenSymbol('A'.repeat(11))).toContain('3-10 characters');
    });

    test('should fail for lowercase or special characters', () => {
      expect(Validator.validateTokenSymbol('mdt')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT);
      expect(Validator.validateTokenSymbol('MD-T')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT);
      expect(Validator.validateTokenSymbol('MD3')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT);
    });
  });

  describe('validatePrivateKey', () => {
    const validPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const validPrivateKeyNoPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    test('should pass for valid private keys', () => {
      expect(Validator.validatePrivateKey(validPrivateKey)).toBe(true);
      expect(Validator.validatePrivateKey(validPrivateKeyNoPrefix)).toBe(true);
    });

    test('should fail for empty private keys', () => {
      expect(Validator.validatePrivateKey('')).toBe(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_REQUIRED);
    });

    test('should fail for invalid format', () => {
      expect(Validator.validatePrivateKey('invalid')).toBe(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_FORMAT);
      expect(Validator.validatePrivateKey('0x123')).toBe(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_FORMAT);
      expect(Validator.validatePrivateKey('0x' + 'G'.repeat(64))).toBe(ERROR_MESSAGES.VALIDATION.PRIVATE_KEY_FORMAT);
    });
  });

  describe('normalizePrivateKey', () => {
    test('should add 0x prefix if missing', () => {
      const key = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(Validator.normalizePrivateKey(key)).toBe('0x' + key);
    });

    test('should preserve 0x prefix if present', () => {
      const key = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(Validator.normalizePrivateKey(key)).toBe(key);
    });

    test('should throw for invalid input', () => {
      expect(() => Validator.normalizePrivateKey(null)).toThrow();
      expect(() => Validator.normalizePrivateKey('')).toThrow();
      expect(() => Validator.normalizePrivateKey(123)).toThrow();
    });
  });

  describe('validateGithubUsername', () => {
    test('should pass for valid usernames', () => {
      expect(Validator.validateGithubUsername('octocat')).toBe(true);
      expect(Validator.validateGithubUsername('user123')).toBe(true);
      expect(Validator.validateGithubUsername('my-username')).toBe(true);
    });

    test('should fail for empty usernames', () => {
      expect(Validator.validateGithubUsername('')).toBe(ERROR_MESSAGES.VALIDATION.GITHUB_USERNAME_REQUIRED);
      expect(Validator.validateGithubUsername('  ')).toBe(ERROR_MESSAGES.VALIDATION.GITHUB_USERNAME_REQUIRED);
    });
  });

  describe('validateApiKey', () => {
    test('should pass for valid API keys', () => {
      expect(Validator.validateApiKey('valid-api-key')).toBe(true);
      expect(Validator.validateApiKey('1234567890abcdef')).toBe(true);
    });

    test('should fail for empty keys and return service-specific errors', () => {
      expect(Validator.validateApiKey('', 'pinata')).toBe(ERROR_MESSAGES.VALIDATION.PINATA_KEY_REQUIRED);
      expect(Validator.validateApiKey('', 'pinata secret')).toBe(ERROR_MESSAGES.VALIDATION.PINATA_SECRET_REQUIRED);
      expect(Validator.validateApiKey('', 'google client id')).toBe(ERROR_MESSAGES.VALIDATION.GOOGLE_CLIENT_ID_REQUIRED);
      expect(Validator.validateApiKey('', 'google client secret')).toBe(ERROR_MESSAGES.VALIDATION.GOOGLE_CLIENT_SECRET_REQUIRED);
      expect(Validator.validateApiKey('', 'unknown')).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
    });

    test('should handle whitespace-only keys', () => {
      expect(Validator.validateApiKey('  ', 'pinata')).toBe(ERROR_MESSAGES.VALIDATION.PINATA_KEY_REQUIRED);
    });
  });

  describe('validateAddress', () => {
    test('should pass for valid Ethereum addresses', () => {
      expect(Validator.validateAddress('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(Validator.validateAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(true);
    });

    test('should fail for invalid addresses', () => {
      expect(Validator.validateAddress('invalid')).toBe(ERROR_MESSAGES.VALIDATION.ADDRESS_FORMAT);
      expect(Validator.validateAddress('1234567890123456789012345678901234567890')).toBe(ERROR_MESSAGES.VALIDATION.ADDRESS_FORMAT);
      expect(Validator.validateAddress('0x123')).toBe(ERROR_MESSAGES.VALIDATION.ADDRESS_FORMAT);
    });
  });

  describe('validatePublicKey', () => {
    test('should pass for valid public keys', () => {
      expect(Validator.validatePublicKey('0x1234567890abcdef')).toBe(true);
      expect(Validator.validatePublicKey('0xabcdefghijklmnop')).toBe(true);
    });

    test('should fail for invalid public keys', () => {
      expect(Validator.validatePublicKey('invalid')).toBe(ERROR_MESSAGES.VALIDATION.PUBLIC_KEY_FORMAT);
      expect(Validator.validatePublicKey('1234567890abcdef')).toBe(ERROR_MESSAGES.VALIDATION.PUBLIC_KEY_FORMAT);
    });
  });

  describe('validateConfig', () => {
    const validConfig = {
      dlpName: 'MyDataDAO',
      tokenName: 'MyToken',
      tokenSymbol: 'MTK',
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      pinataApiKey: 'valid-api-key',
      pinataApiSecret: 'valid-secret',
      googleClientId: 'google-client-id',
      googleClientSecret: 'google-secret',
      githubUsername: 'octocat'
    };

    test('should pass for valid complete config', () => {
      expect(Validator.validateConfig(validConfig)).toBe(true);
    });

    test('should fail for missing required fields', () => {
      const incompleteConfig = { ...validConfig };
      delete incompleteConfig.dlpName;
      
      const result = Validator.validateConfig(incompleteConfig);
      expect(result).toContain('Missing required field: dlpName');
    });

    test('should fail for invalid field values', () => {
      const invalidConfig = { ...validConfig, dlpName: 'AB' }; // Too short
      
      const result = Validator.validateConfig(invalidConfig);
      expect(result).toContain('dlpName:');
      expect(result).toContain('at least 3 characters');
    });

    test('should validate derived fields if present', () => {
      const configWithDerived = {
        ...validConfig,
        address: 'invalid-address'
      };
      
      const result = Validator.validateConfig(configWithDerived);
      expect(result).toContain('address:');
    });
  });

  describe('getValidator', () => {
    test('should return correct validator functions', () => {
      expect(typeof Validator.getValidator('dlpName')).toBe('function');
      expect(typeof Validator.getValidator('tokenName')).toBe('function');
      expect(typeof Validator.getValidator('tokenSymbol')).toBe('function');
      expect(typeof Validator.getValidator('privateKey')).toBe('function');
      expect(typeof Validator.getValidator('githubUsername')).toBe('function');
    });

    test('should return validateRequired for unknown fields', () => {
      const validator = Validator.getValidator('unknown');
      expect(validator).toBe(Validator.validateRequired);
    });

    test('returned validators should work correctly', () => {
      const dlpValidator = Validator.getValidator('dlpName');
      expect(dlpValidator('ValidName')).toBe(true);
      expect(dlpValidator('')).toBe(ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED);
    });
  });

  describe('integration with constants', () => {
    test('should use VALIDATION_RULES for all validations', () => {
      // Test that the rules from constants are actually being used
      expect(Validator.validateDlpName('A'.repeat(VALIDATION_RULES.DLP_NAME.maxLength))).toBe(true);
      expect(Validator.validateDlpName('A'.repeat(VALIDATION_RULES.DLP_NAME.maxLength + 1))).not.toBe(true);
      
      expect(Validator.validateTokenSymbol('A'.repeat(VALIDATION_RULES.TOKEN_SYMBOL.minLength))).toBe(true);
      expect(Validator.validateTokenSymbol('A'.repeat(VALIDATION_RULES.TOKEN_SYMBOL.minLength - 1))).not.toBe(true);
    });

    test('should use ERROR_MESSAGES for all error responses', () => {
      expect(Validator.validateRequired('')).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
      expect(Validator.validateDlpName('')).toBe(ERROR_MESSAGES.VALIDATION.DLP_NAME_REQUIRED);
      expect(Validator.validateTokenSymbol('mdt')).toBe(ERROR_MESSAGES.VALIDATION.TOKEN_SYMBOL_FORMAT);
    });
  });
}); 