const { validatePrivateKey, validateRequired, validateInput, normalizePrivateKey } = require('../validation');

describe('Validation Functions', () => {
  describe('validatePrivateKey', () => {
    test('accepts valid private key with 0x prefix', () => {
      const key = '0x' + 'a'.repeat(64);
      expect(validatePrivateKey(key)).toBe(true);
    });
    
    test('accepts valid private key without 0x prefix', () => {
      const key = 'a'.repeat(64);
      expect(validatePrivateKey(key)).toBe(true);
    });
    
    test('rejects invalid length', () => {
      const key = '0x' + 'a'.repeat(63);
      expect(validatePrivateKey(key)).toContain('Invalid private key');
    });
    
    test('rejects non-hex characters', () => {
      const key = '0x' + 'g'.repeat(64);
      expect(validatePrivateKey(key)).toContain('Invalid private key');
    });
    
    test('handles empty input', () => {
      expect(validatePrivateKey('')).toContain('Private key is required');
    });
  });

  describe('validateRequired', () => {
    test('accepts non-empty string', () => {
      expect(validateRequired('test')).toBe(true);
    });
    
    test('rejects empty string', () => {
      expect(validateRequired('')).toContain('This field is required');
    });
    
    test('rejects whitespace only', () => {
      expect(validateRequired('   ')).toContain('This field is required');
    });
  });

  describe('validateInput', () => {
    test('validates DataDAO name', () => {
      expect(validateInput.dlpName('My DataDAO')).toBe(true);
      expect(validateInput.dlpName('')).toContain('DataDAO name is required');
    });
    
    test('validates token symbol', () => {
      expect(validateInput.tokenSymbol('TKN')).toBe(true);
      expect(validateInput.tokenSymbol('TOOLONG')).toContain('Token symbol must be 3-5 characters');
      expect(validateInput.tokenSymbol('TK')).toContain('Token symbol must be 3-5 characters');
    });
  });
  
  describe('normalizePrivateKey', () => {
    test('adds 0x prefix if missing', () => {
      expect(normalizePrivateKey('abc123')).toBe('0xabc123');
    });
    
    test('preserves existing 0x prefix', () => {
      expect(normalizePrivateKey('0xabc123')).toBe('0xabc123');
    });
    
    test('handles empty string', () => {
      expect(normalizePrivateKey('')).toBe('0x');
    });
  });
});