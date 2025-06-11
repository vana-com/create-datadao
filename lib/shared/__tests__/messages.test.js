const MessageFormatter = require('../messages');
const { MESSAGES, ERROR_MESSAGES, SYMBOLS } = require('../constants');

describe('MessageFormatter', () => {
  
  describe('interpolate', () => {
    test('should replace placeholders with values', () => {
      const template = 'Hello {name}, you have {count} messages';
      const variables = { name: 'Alice', count: 5 };
      const result = MessageFormatter.interpolate(template, variables);
      
      expect(result).toBe('Hello Alice, you have 5 messages');
    });

    test('should leave unreplaced placeholders unchanged', () => {
      const template = 'Hello {name}, you have {count} messages';
      const variables = { name: 'Alice' };
      const result = MessageFormatter.interpolate(template, variables);
      
      expect(result).toBe('Hello Alice, you have {count} messages');
    });

    test('should handle empty variables object', () => {
      const template = 'Hello {name}';
      const result = MessageFormatter.interpolate(template, {});
      
      expect(result).toBe('Hello {name}');
    });

    test('should handle non-string templates', () => {
      expect(MessageFormatter.interpolate(null)).toBe(null);
      expect(MessageFormatter.interpolate(undefined)).toBe(undefined);
      expect(MessageFormatter.interpolate(123)).toBe(123);
    });

    test('should handle missing variables parameter', () => {
      const template = 'Hello {name}';
      const result = MessageFormatter.interpolate(template);
      
      expect(result).toBe('Hello {name}');
    });
  });

  describe('getMessage', () => {
    test('should retrieve message from nested path', () => {
      const result = MessageFormatter.getMessage('WELCOME.SETUP_INTRO');
      expect(result).toBe(MESSAGES.WELCOME.SETUP_INTRO);
    });

    test('should interpolate variables in retrieved message', () => {
      const result = MessageFormatter.getMessage('OPERATIONS.POLLING_KEY', { dlpId: '123' });
      expect(result).toBe('Polling for encryption key (dlpId: 123)...');
    });

    test('should return error message for invalid path', () => {
      const result = MessageFormatter.getMessage('INVALID.PATH');
      expect(result).toBe('[Missing message: INVALID.PATH]');
    });

    test('should return error message for non-string final value', () => {
      const result = MessageFormatter.getMessage('WELCOME'); // Points to object, not string
      expect(result).toBe('[Invalid message type: WELCOME]');
    });
  });

  describe('getError', () => {
    test('should retrieve error message from nested path', () => {
      const result = MessageFormatter.getError('VALIDATION.REQUIRED');
      expect(result).toBe(ERROR_MESSAGES.VALIDATION.REQUIRED);
    });

    test('should interpolate variables in error message', () => {
      const result = MessageFormatter.getError('VALIDATION.DLP_NAME_TOO_SHORT', { min: 3 });
      expect(result).toBe('DataDAO name must be at least 3 characters');
    });

    test('should return error message for invalid error path', () => {
      const result = MessageFormatter.getError('INVALID.ERROR');
      expect(result).toBe('[Missing error: INVALID.ERROR]');
    });
  });

  describe('formatting methods', () => {
    test('stepTitle should format with step symbol', () => {
      const result = MessageFormatter.stepTitle('Test Step');
      expect(result).toBe(`${SYMBOLS.STEP} Test Step`);
    });

    test('success should format with success symbol', () => {
      const result = MessageFormatter.success('Operation completed');
      expect(result).toBe(`${SYMBOLS.SUCCESS} Operation completed`);
    });

    test('error should format with error symbol', () => {
      const result = MessageFormatter.error('Something went wrong');
      expect(result).toBe(`${SYMBOLS.ERROR} Something went wrong`);
    });

    test('warning should format with warning symbol', () => {
      const result = MessageFormatter.warning('Be careful');
      expect(result).toBe(`${SYMBOLS.WARNING} Be careful`);
    });

    test('info should format with info symbol', () => {
      const result = MessageFormatter.info('FYI');
      expect(result).toBe(`${SYMBOLS.INFO} FYI`);
    });

    test('progress should format with progress symbol', () => {
      const result = MessageFormatter.progress('Working...');
      expect(result).toBe(`${SYMBOLS.PROGRESS} Working...`);
    });

    test('sectionHeader should format with clipboard symbol', () => {
      const result = MessageFormatter.sectionHeader('Configuration');
      expect(result).toBe(`${SYMBOLS.CLIPBOARD} Configuration`);
    });
  });

  describe('list formatting methods', () => {
    test('nextSteps should format numbered list', () => {
      const steps = ['First step', 'Second step', 'Third step'];
      const result = MessageFormatter.nextSteps(steps);
      
      expect(result).toEqual([
        '  1. First step',
        '  2. Second step',
        '  3. Third step'
      ]);
    });

    test('bulletList should format with bullet symbols', () => {
      const items = ['Item one', 'Item two', 'Item three'];
      const result = MessageFormatter.bulletList(items);
      
      expect(result).toEqual([
        `  ${SYMBOLS.BULLET} Item one`,
        `  ${SYMBOLS.BULLET} Item two`,
        `  ${SYMBOLS.BULLET} Item three`
      ]);
    });

    test('manualCommands should format with project name interpolation', () => {
      const result = MessageFormatter.manualCommands('my-project');
      
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('  cd my-project');
      expect(result[1]).toBe('  npm install');
      expect(result[2]).toBe('  cd contracts && npm install');
      expect(result[3]).toBe('  cd ../ui && npm install');
    });

    test('uiTestingInstructions should format with directory interpolation', () => {
      const result = MessageFormatter.uiTestingInstructions('/path/to/project');
      
      expect(result).toHaveLength(6);
      expect(result[0]).toBe('1. Open a new terminal window');
      expect(result[1]).toBe('2. Navigate to your project: cd /path/to/project');
      expect(result[2]).toBe('3. Start the UI: npm run ui:dev');
      expect(result[3]).toBe('4. Visit http://localhost:3000 in your browser');
      expect(result[4]).toBe('5. Test the data contribution flow');
      expect(result[5]).toBe('6. Press Ctrl+C in the UI terminal when done');
    });

    test('walletInstructions should format wallet setup steps', () => {
      const result = MessageFormatter.walletInstructions();
      
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('1. Go to https://privatekeys.pw/keys/ethereum/random (for testing only)');
      expect(result[1]).toBe('2. Pick any random key from the list');
      expect(result[2]).toBe('3. Copy the Private Key');
      expect(result[3]).toBe('4. The address and public key will be automatically derived');
    });
  });

  describe('utility methods', () => {
    test('divider should create line of specified length', () => {
      const result = MessageFormatter.divider(10);
      expect(result).toBe(SYMBOLS.DIVIDER.repeat(10));
    });

    test('divider should use default length of 50', () => {
      const result = MessageFormatter.divider();
      expect(result).toBe(SYMBOLS.DIVIDER.repeat(50));
    });

    test('summaryItem should format with status symbol', () => {
      const result = MessageFormatter.summaryItem('SUCCESS', 'Task completed');
      expect(result).toBe(`  ${SYMBOLS.SUCCESS} Task completed`);
    });

    test('summaryItem should use INFO symbol for unknown status', () => {
      const result = MessageFormatter.summaryItem('UNKNOWN', 'Some task');
      expect(result).toBe(`  ${SYMBOLS.INFO} Some task`);
    });
  });

  describe('edge cases', () => {
    test('should handle empty strings gracefully', () => {
      expect(MessageFormatter.stepTitle('')).toBe(`${SYMBOLS.STEP} `);
      expect(MessageFormatter.interpolate('', {})).toBe('');
    });

    test('should handle null/undefined messages gracefully', () => {
      expect(MessageFormatter.getMessage('NONEXISTENT.PATH')).toContain('[Missing message:');
      expect(MessageFormatter.getError('NONEXISTENT.PATH')).toContain('[Missing error:');
    });

    test('should handle complex variable interpolation', () => {
      const template = 'User {userName} has {count} items in {location}';
      const variables = { 
        userName: 'Alice',
        count: 42, 
        location: 'basket' 
      };
      
      // Only supports simple variable names, not nested object access
      const result = MessageFormatter.interpolate(template, variables);
      
      expect(result).toBe('User Alice has 42 items in basket');
    });
  });
}); 