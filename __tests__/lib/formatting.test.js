/**
 * Tests for formatting.js - Currently 0% coverage
 * Target: 100% coverage
 */

const {
  formatDataDAOName,
  formatTokenName,
  formatTokenSymbol
} = require('../../lib/formatting');

describe('Formatting Functions', () => {
  describe('formatDataDAOName', () => {
    test('formats single word project names correctly', () => {
      expect(formatDataDAOName('weather')).toBe('Weather');
      expect(formatDataDAOName('medical')).toBe('Medical');
      expect(formatDataDAOName('finance')).toBe('Finance');
    });

    test('formats hyphenated project names correctly', () => {
      expect(formatDataDAOName('weather-data')).toBe('WeatherData');
      expect(formatDataDAOName('medical-records')).toBe('MedicalRecords');
      expect(formatDataDAOName('finance-tracker')).toBe('FinanceTracker');
    });

    test('formats underscore-separated project names correctly', () => {
      expect(formatDataDAOName('weather_data')).toBe('WeatherData');
      expect(formatDataDAOName('medical_records')).toBe('MedicalRecords');
      expect(formatDataDAOName('finance_tracker')).toBe('FinanceTracker');
    });

    test('formats space-separated project names correctly', () => {
      expect(formatDataDAOName('weather data')).toBe('WeatherData');
      expect(formatDataDAOName('medical records')).toBe('MedicalRecords');
      expect(formatDataDAOName('finance tracker')).toBe('FinanceTracker');
    });

    test('handles special case for standalone "dao" word', () => {
      expect(formatDataDAOName('weather dao')).toBe('WeatherDAO');
      expect(formatDataDAOName('my dao')).toBe('MyDAO');
      expect(formatDataDAOName('dao')).toBe('DAO');
    });

    test('handles special case for words ending with "dao"', () => {
      expect(formatDataDAOName('weatherdao')).toBe('WeatherDAO');
      expect(formatDataDAOName('mydao')).toBe('MyDAO');
      expect(formatDataDAOName('testimonialdao')).toBe('TestimonialDAO');
    });

    test('preserves capitalization for words ending with "dao" (e.g., "datadao" -> "DataDAO")', () => {
      expect(formatDataDAOName('datadao')).toBe('DataDAO');
      expect(formatDataDAOName('DATADAO')).toBe('DataDAO');
      expect(formatDataDAOName('DataDao')).toBe('DataDAO');
    });

    test('handles mixed separators (hyphens, underscores, spaces)', () => {
      expect(formatDataDAOName('weather-data_collection system')).toBe('WeatherDataCollectionSystem');
      expect(formatDataDAOName('my-awesome_data dao')).toBe('MyAwesomeDataDAO');
    });

    test('handles empty strings', () => {
      expect(formatDataDAOName('')).toBe('');
    });

    test('handles single character words', () => {
      expect(formatDataDAOName('a b c')).toBe('ABC');
      expect(formatDataDAOName('x-y-z')).toBe('XYZ');
    });

    test('handles project names that already contain "DAO"', () => {
      expect(formatDataDAOName('Weather DAO')).toBe('WeatherDAO');
      expect(formatDataDAOName('MY DAO PROJECT')).toBe('MyDAOProject');
    });

    test('handles numbers in project names', () => {
      expect(formatDataDAOName('web3-dao')).toBe('Web3DAO');
      expect(formatDataDAOName('project-2024')).toBe('Project2024');
      expect(formatDataDAOName('v2-weather-dao')).toBe('V2WeatherDAO');
    });
  });

  describe('formatTokenName', () => {
    test('converts DataDAO names to Token names', () => {
      expect(formatTokenName('weather')).toBe('WeatherToken');
      expect(formatTokenName('weather dao')).toBe('WeatherToken');
      expect(formatTokenName('weatherdao')).toBe('WeatherToken');
    });

    test('handles names ending with "DAO" by replacing with "Token"', () => {
      expect(formatTokenName('WeatherDAO')).toBe('WeatherToken');
      expect(formatTokenName('MedicalDAO')).toBe('MedicalToken');
      expect(formatTokenName('DAO')).toBe('Token');
    });

    test('handles names not ending with "DAO" by appending "Token"', () => {
      expect(formatTokenName('Weather')).toBe('WeatherToken');
      expect(formatTokenName('Medical')).toBe('MedicalToken');
      expect(formatTokenName('Finance')).toBe('FinanceToken');
    });

    test('preserves formatting from formatDataDAOName', () => {
      expect(formatTokenName('weather-data')).toBe('WeatherDataToken');
      expect(formatTokenName('medical_records')).toBe('MedicalRecordsToken');
      expect(formatTokenName('finance tracker')).toBe('FinanceTrackerToken');
    });

    test('handles empty strings', () => {
      expect(formatTokenName('')).toBe('Token');
    });

    test('handles names already containing "Token"', () => {
      // Since formatDataDAOName processes the input, "Token" would be formatted as part of the name
      expect(formatTokenName('weather token')).toBe('WeatherTokenToken');
      expect(formatTokenName('MyToken')).toBe('MytokenToken');
    });
  });

  describe('formatTokenSymbol', () => {
    test('creates symbols from first letter of each word', () => {
      expect(formatTokenSymbol('weather data')).toBe('WDT');
      expect(formatTokenSymbol('medical records system')).toBe('MRS');
      expect(formatTokenSymbol('finance tracker app')).toBe('FTA');
    });

    test('limits symbols to maximum 4 characters', () => {
      expect(formatTokenSymbol('very long project name with many words')).toBe('VLPN');
      expect(formatTokenSymbol('a b c d e f g h')).toBe('ABCD');
    });

    test('pads short symbols with "T" to reach minimum 3 characters', () => {
      expect(formatTokenSymbol('weather')).toBe('WTT');
      expect(formatTokenSymbol('my dao')).toBe('MDT');
      expect(formatTokenSymbol('a')).toBe('ATT');
    });

    test('handles single word project names', () => {
      expect(formatTokenSymbol('weather')).toBe('WTT');
      expect(formatTokenSymbol('medical')).toBe('MTT');
      expect(formatTokenSymbol('finance')).toBe('FTT');
    });

    test('handles multi-word project names', () => {
      expect(formatTokenSymbol('weather data collection')).toBe('WDC');
      expect(formatTokenSymbol('medical records system')).toBe('MRS');
      expect(formatTokenSymbol('finance tracker app platform')).toBe('FTAP');
    });

    test('handles empty strings', () => {
      expect(formatTokenSymbol('')).toBe('TTT');
    });

    test('handles single character words', () => {
      expect(formatTokenSymbol('a b c')).toBe('ABC');
      expect(formatTokenSymbol('x y')).toBe('XYT');
      expect(formatTokenSymbol('z')).toBe('ZTT');
    });

    test('handles project names with numbers', () => {
      expect(formatTokenSymbol('web3 dao')).toBe('WDT');
      expect(formatTokenSymbol('project 2024 version')).toBe('P2V');
      expect(formatTokenSymbol('v2 weather data')).toBe('VWD');
    });

    test('capitalizes all letters in symbol', () => {
      expect(formatTokenSymbol('weather data')).toBe('WDT');
      expect(formatTokenSymbol('WEATHER DATA')).toBe('WDT');
      expect(formatTokenSymbol('Weather Data')).toBe('WDT');
    });

    test('ignores empty words from multiple separators', () => {
      expect(formatTokenSymbol('weather--data')).toBe('WDT');
      expect(formatTokenSymbol('medical  records')).toBe('MRT');
      expect(formatTokenSymbol('finance___tracker')).toBe('FTT');
      expect(formatTokenSymbol('a---b___c   d')).toBe('ABCD');
    });
  });
});