const { formatDataDAOName, formatTokenName, formatTokenSymbol } = require('../formatting');

describe('Formatting Functions', () => {
  describe('formatDataDAOName', () => {
    test('formats simple project name', () => {
      expect(formatDataDAOName('my-project')).toBe('MyProject');
    });

    test('formats project name with DAO suffix', () => {
      expect(formatDataDAOName('my-data-dao')).toBe('MyDataDAO');
    });

    test('formats project name ending with dao', () => {
      expect(formatDataDAOName('datadao')).toBe('DataDAO');
    });

    test('handles standalone dao', () => {
      expect(formatDataDAOName('dao')).toBe('DAO');
    });

    test('handles multiple separators', () => {
      expect(formatDataDAOName('my_awesome-data dao')).toBe('MyAwesomeDataDAO');
    });

    test('handles camelCase input', () => {
      expect(formatDataDAOName('myAwesomeProject')).toBe('Myawesomeproject');
    });

    test('handles mixed case with separators', () => {
      expect(formatDataDAOName('My-AWESOME_project')).toBe('MyAwesomeProject');
    });

    test('handles project with multiple dao occurrences', () => {
      expect(formatDataDAOName('dao-my-datadao')).toBe('DAOMyDataDAO');
    });

    test('handles empty string', () => {
      expect(formatDataDAOName('')).toBe('');
    });

    test('handles single character', () => {
      expect(formatDataDAOName('a')).toBe('A');
    });

    test('preserves DAO capitalization in compound words', () => {
      expect(formatDataDAOName('mydatadao')).toBe('MydataDAO');
      expect(formatDataDAOName('testdao')).toBe('TestDAO');
      expect(formatDataDAOName('dao-test')).toBe('DAOTest');
    });

    test('handles special characters and numbers', () => {
      expect(formatDataDAOName('project-2024')).toBe('Project2024');
      expect(formatDataDAOName('my-project_v2')).toBe('MyProjectV2');
    });

    test('handles long project names', () => {
      const longName = 'my-super-awesome-data-analytics-dao-project';
      expect(formatDataDAOName(longName)).toBe('MySuperAwesomeDataAnalyticsDAOProject');
    });
  });

  describe('formatTokenName', () => {
    test('converts DAO to Token in name', () => {
      expect(formatTokenName('my-data-dao')).toBe('MyDataToken');
    });

    test('adds Token suffix if no DAO', () => {
      expect(formatTokenName('my-project')).toBe('MyProjectToken');
    });

    test('handles project already ending with Token', () => {
      expect(formatTokenName('my-token')).toBe('MyTokenToken');
    });

    test('handles simple project name', () => {
      expect(formatTokenName('simple')).toBe('SimpleToken');
    });

    test('handles complex DAO name', () => {
      expect(formatTokenName('awesome-data-dao')).toBe('AwesomeDataToken');
    });

    test('handles standalone DAO', () => {
      expect(formatTokenName('dao')).toBe('Token');
    });

    test('handles multiple DAO occurrences', () => {
      expect(formatTokenName('dao-data-dao')).toBe('TokenDataDAO');
    });

    test('handles mixed case', () => {
      expect(formatTokenName('My-AWESOME_DAO')).toBe('MyAwesomeToken');
    });

    test('handles compound datadao', () => {
      expect(formatTokenName('mydatadao')).toBe('MydataToken');
    });

    test('preserves complex formatting', () => {
      expect(formatTokenName('multi-word-data-dao-project')).toBe('MultiWordDataDAOProjectToken');
    });
  });

  describe('formatTokenSymbol', () => {
    test('creates symbol from first letters', () => {
      expect(formatTokenSymbol('my-data-dao')).toBe('MDD');
    });

    test('handles single word', () => {
      expect(formatTokenSymbol('project')).toBe('PTT'); // P + padded with T
    });

    test('handles two words', () => {
      expect(formatTokenSymbol('my-project')).toBe('MPT'); // M + P + padded with T
    });

    test('handles four or more words', () => {
      expect(formatTokenSymbol('my-awesome-data-dao')).toBe('MADD');
    });

    test('handles more than four words (truncates)', () => {
      expect(formatTokenSymbol('my-super-awesome-data-dao-project')).toBe('MSAD');
    });

    test('handles mixed separators', () => {
      expect(formatTokenSymbol('my_awesome-data dao')).toBe('MADD');
    });

    test('handles camelCase', () => {
      expect(formatTokenSymbol('myAwesomeProject')).toBe('MTT');
    });

    test('handles empty string', () => {
      expect(formatTokenSymbol('')).toBe('TTT');
    });

    test('handles single character', () => {
      expect(formatTokenSymbol('a')).toBe('ATT');
    });

    test('pads short symbols with T', () => {
      expect(formatTokenSymbol('a')).toBe('ATT');
      expect(formatTokenSymbol('a-b')).toBe('ABT');
    });

    test('handles uppercase input', () => {
      expect(formatTokenSymbol('MY-DATA-DAO')).toBe('MDD');
    });

    test('handles lowercase input', () => {
      expect(formatTokenSymbol('my-data-dao')).toBe('MDD');
    });

    test('handles mixed case input', () => {
      expect(formatTokenSymbol('My-Data-Dao')).toBe('MDD');
    });

    test('handles numbers in words', () => {
      expect(formatTokenSymbol('project-2024-dao')).toBe('P2D');
    });

    test('handles special characters', () => {
      expect(formatTokenSymbol('my@project#dao')).toBe('MTT');
    });

    test('ignores empty words from multiple separators', () => {
      expect(formatTokenSymbol('my--project---dao')).toBe('MPD');
    });

    test('returns exactly 3-4 characters', () => {
      const testCases = [
        'a',
        'ab',
        'abc',
        'a-b',
        'a-b-c',
        'a-b-c-d',
        'a-b-c-d-e-f-g-h-i-j'
      ];
      
      testCases.forEach(input => {
        const result = formatTokenSymbol(input);
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(4);
        expect(result).toMatch(/^[A-Z]+$/);
      });
    });
  });

  describe('edge cases and integration', () => {
    test('all functions handle empty input gracefully', () => {
      expect(formatDataDAOName('')).toBe('');
      expect(formatTokenName('')).toBe('Token');
      expect(formatTokenSymbol('')).toBe('TTT');
    });

    test('all functions handle whitespace-only input', () => {
      expect(formatDataDAOName('   ')).toBe('');
      expect(formatTokenName('   ')).toBe('Token');
      expect(formatTokenSymbol('   ')).toBe('TTT');
    });

    test('consistent formatting across functions', () => {
      const projectName = 'my-awesome-data-dao';
      
      const daoName = formatDataDAOName(projectName);
      const tokenName = formatTokenName(projectName);
      const tokenSymbol = formatTokenSymbol(projectName);
      
      expect(daoName).toBe('MyAwesomeDataDAO');
      expect(tokenName).toBe('MyAwesomeDataToken');
      expect(tokenSymbol).toBe('MADD');
    });

    test('handles unicode characters', () => {
      expect(formatDataDAOName('café-dao')).toBe('CaféDAO');
      expect(formatTokenName('café-dao')).toBe('CaféToken');
      expect(formatTokenSymbol('café-dao')).toBe('CDT');
    });

    test('handles very long input', () => {
      const longInput = 'supercalifragilisticexpialidocious-data-dao';
      
      expect(formatDataDAOName(longInput)).toBe('SupercalifragilisticexpialidociousDataDAO');
      expect(formatTokenName(longInput)).toBe('SupercalifragilisticexpialidociousDataToken');
      expect(formatTokenSymbol(longInput)).toBe('SDD');
    });
  });
});