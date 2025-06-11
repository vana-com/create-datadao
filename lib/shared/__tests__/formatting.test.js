const Formatter = require('../formatting');

describe('Formatter', () => {
  
  describe('formatDataDAOName', () => {
    test('should handle basic project names', () => {
      expect(Formatter.formatDataDAOName('my-project')).toBe('MyProject');
      expect(Formatter.formatDataDAOName('data_collection')).toBe('DataCollection');
      expect(Formatter.formatDataDAOName('super awesome project')).toBe('SuperAwesomeProject');
    });

    test('should handle DAO special cases', () => {
      expect(Formatter.formatDataDAOName('my dao')).toBe('MyDAO');
      expect(Formatter.formatDataDAOName('datadao')).toBe('DataDAO');
      expect(Formatter.formatDataDAOName('mydatadao')).toBe('MydataDAO');
      expect(Formatter.formatDataDAOName('governance-dao')).toBe('GovernanceDAO');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatDataDAOName('')).toBe('');
      expect(Formatter.formatDataDAOName(null)).toBe('');
      expect(Formatter.formatDataDAOName(undefined)).toBe('');
      expect(Formatter.formatDataDAOName(123)).toBe('');
    });

    test('should handle mixed separators', () => {
      expect(Formatter.formatDataDAOName('my-awesome_project name')).toBe('MyAwesomeProjectName');
      expect(Formatter.formatDataDAOName('data---collection___system')).toBe('DataCollectionSystem');
    });
  });

  describe('formatTokenName', () => {
    test('should convert DAO to Token', () => {
      expect(Formatter.formatTokenName('my-project')).toBe('MyProjectToken');
      expect(Formatter.formatTokenName('datadao')).toBe('DataToken');
      expect(Formatter.formatTokenName('governance-dao')).toBe('GovernanceToken');
    });

    test('should add Token suffix if no DAO', () => {
      expect(Formatter.formatTokenName('rewards')).toBe('RewardsToken');
      expect(Formatter.formatTokenName('staking-pool')).toBe('StakingPoolToken');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatTokenName('')).toBe('Token');
      expect(Formatter.formatTokenName(null)).toBe('Token');
      expect(Formatter.formatTokenName(undefined)).toBe('Token');
      expect(Formatter.formatTokenName(123)).toBe('Token');
    });
  });

  describe('formatTokenSymbol', () => {
    test('should create symbols from first letters', () => {
      expect(Formatter.formatTokenSymbol('My Data Project')).toBe('MDP');
      expect(Formatter.formatTokenSymbol('super-awesome-token')).toBe('SAT');
      expect(Formatter.formatTokenSymbol('governance_dao_token')).toBe('GDT');
    });

    test('should pad short symbols with T', () => {
      expect(Formatter.formatTokenSymbol('A')).toBe('ATT');
      expect(Formatter.formatTokenSymbol('My Project')).toBe('MPT');
    });

    test('should limit to 4 characters from words', () => {
      expect(Formatter.formatTokenSymbol('One Two Three Four Five')).toBe('OTTF');
    });

    test('should truncate very long symbols', () => {
      const longName = 'One Two Three Four Five Six Seven Eight Nine Ten Eleven';
      const result = Formatter.formatTokenSymbol(longName);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatTokenSymbol('')).toBe('TKN');
      expect(Formatter.formatTokenSymbol(null)).toBe('TKN');
      expect(Formatter.formatTokenSymbol(undefined)).toBe('TKN');
      expect(Formatter.formatTokenSymbol(123)).toBe('TKN');
    });

    test('should handle special characters', () => {
      expect(Formatter.formatTokenSymbol('my-awesome_project!')).toBe('MAP');
      expect(Formatter.formatTokenSymbol('data@collection#system')).toBe('DTT');
    });
  });

  describe('formatProjectDirectory', () => {
    test('should create file-system safe names', () => {
      expect(Formatter.formatProjectDirectory('My Project')).toBe('my-project');
      expect(Formatter.formatProjectDirectory('DATA_COLLECTION')).toBe('data-collection');
      expect(Formatter.formatProjectDirectory('Super-Awesome_Project')).toBe('super-awesome-project');
    });

    test('should remove special characters', () => {
      expect(Formatter.formatProjectDirectory('My@Project!')).toBe('myproject');
      expect(Formatter.formatProjectDirectory('Data#Collection$System')).toBe('datacollectionsystem');
    });

    test('should handle multiple spaces and separators', () => {
      expect(Formatter.formatProjectDirectory('My   Project   Name')).toBe('my-project-name');
      expect(Formatter.formatProjectDirectory('---My___Project---')).toBe('my-project');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatProjectDirectory('')).toBe('my-datadao');
      expect(Formatter.formatProjectDirectory(null)).toBe('my-datadao');
      expect(Formatter.formatProjectDirectory(undefined)).toBe('my-datadao');
      expect(Formatter.formatProjectDirectory(123)).toBe('my-datadao');
    });
  });

  describe('formatBytes', () => {
    test('should format bytes correctly', () => {
      expect(Formatter.formatBytes(0)).toBe('0 Bytes');
      expect(Formatter.formatBytes(1024)).toBe('1 KB');
      expect(Formatter.formatBytes(1536)).toBe('1.5 KB');
      expect(Formatter.formatBytes(1048576)).toBe('1 MB');
      expect(Formatter.formatBytes(1073741824)).toBe('1 GB');
    });

    test('should handle decimal places', () => {
      expect(Formatter.formatBytes(1536, 0)).toBe('2 KB');
      expect(Formatter.formatBytes(1536, 1)).toBe('1.5 KB');
      expect(Formatter.formatBytes(1536, 3)).toBe('1.5 KB');
    });

    test('should handle negative decimals', () => {
      expect(Formatter.formatBytes(1536, -1)).toBe('2 KB');
    });
  });

  describe('formatDuration', () => {
    test('should format milliseconds', () => {
      expect(Formatter.formatDuration(500)).toBe('500ms');
      expect(Formatter.formatDuration(999)).toBe('999ms');
    });

    test('should format seconds', () => {
      expect(Formatter.formatDuration(1000)).toBe('1s');
      expect(Formatter.formatDuration(45000)).toBe('45s');
    });

    test('should format minutes and seconds', () => {
      expect(Formatter.formatDuration(60000)).toBe('1m');
      expect(Formatter.formatDuration(90000)).toBe('1m 30s');
      expect(Formatter.formatDuration(3540000)).toBe('59m');
    });

    test('should format hours and minutes', () => {
      expect(Formatter.formatDuration(3600000)).toBe('1h');
      expect(Formatter.formatDuration(5400000)).toBe('1h 30m');
      expect(Formatter.formatDuration(7200000)).toBe('2h');
    });
  });

  describe('formatAddress', () => {
    test('should truncate long addresses', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(Formatter.formatAddress(address)).toBe('0x1234...5678');
      expect(Formatter.formatAddress(address, 8, 6)).toBe('0x123456...345678');
    });

    test('should return short addresses unchanged', () => {
      expect(Formatter.formatAddress('0x1234')).toBe('0x1234');
      expect(Formatter.formatAddress('short')).toBe('short');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatAddress('')).toBe('');
      expect(Formatter.formatAddress(null)).toBe(null);
      expect(Formatter.formatAddress(undefined)).toBe(undefined);
    });
  });

  describe('formatTxHash', () => {
    test('should format transaction hashes', () => {
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      expect(Formatter.formatTxHash(txHash)).toBe('0xabcdef...567890');
    });
  });

  describe('formatNumber', () => {
    test('should format numbers with separators', () => {
      expect(Formatter.formatNumber(1000)).toBe('1,000');
      expect(Formatter.formatNumber(1234567)).toBe('1,234,567');
      expect(Formatter.formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatNumber(0)).toBe('0');
      expect(Formatter.formatNumber('not a number')).toBe('0');
      expect(Formatter.formatNumber(null)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    test('should format percentages', () => {
      expect(Formatter.formatPercentage(0.5)).toBe('50.0%');
      expect(Formatter.formatPercentage(0.1234)).toBe('12.3%');
      expect(Formatter.formatPercentage(1)).toBe('100.0%');
    });

    test('should handle decimal places', () => {
      expect(Formatter.formatPercentage(0.1234, 0)).toBe('12%');
      expect(Formatter.formatPercentage(0.1234, 2)).toBe('12.34%');
      expect(Formatter.formatPercentage(0.1234, 3)).toBe('12.340%');
    });

    test('should handle edge cases', () => {
      expect(Formatter.formatPercentage('not a number')).toBe('0%');
      expect(Formatter.formatPercentage(null)).toBe('0%');
    });
  });

  describe('string utilities', () => {
    describe('capitalize', () => {
      test('should capitalize first letter', () => {
        expect(Formatter.capitalize('hello')).toBe('Hello');
        expect(Formatter.capitalize('HELLO')).toBe('HELLO');
        expect(Formatter.capitalize('hELLO')).toBe('HELLO');
      });

      test('should handle edge cases', () => {
        expect(Formatter.capitalize('')).toBe('');
        expect(Formatter.capitalize(null)).toBe('');
        expect(Formatter.capitalize(undefined)).toBe('');
        expect(Formatter.capitalize(123)).toBe('');
      });
    });

    describe('camelToKebab', () => {
      test('should convert camelCase to kebab-case', () => {
        expect(Formatter.camelToKebab('camelCase')).toBe('camel-case');
        expect(Formatter.camelToKebab('PascalCase')).toBe('pascal-case');
        expect(Formatter.camelToKebab('myVariableName')).toBe('my-variable-name');
        expect(Formatter.camelToKebab('HTMLElement')).toBe('htmlelement');
      });

      test('should handle edge cases', () => {
        expect(Formatter.camelToKebab('lowercase')).toBe('lowercase');
        expect(Formatter.camelToKebab('')).toBe('');
        expect(Formatter.camelToKebab(null)).toBe('');
      });
    });

    describe('kebabToCamel', () => {
      test('should convert kebab-case to camelCase', () => {
        expect(Formatter.kebabToCamel('kebab-case')).toBe('kebabCase');
        expect(Formatter.kebabToCamel('my-variable-name')).toBe('myVariableName');
        expect(Formatter.kebabToCamel('single')).toBe('single');
      });

      test('should handle edge cases', () => {
        expect(Formatter.kebabToCamel('')).toBe('');
        expect(Formatter.kebabToCamel(null)).toBe('');
        expect(Formatter.kebabToCamel(undefined)).toBe('');
      });
    });

    describe('pluralize', () => {
      test('should pluralize correctly', () => {
        expect(Formatter.pluralize(1, 'item')).toBe('1 item');
        expect(Formatter.pluralize(2, 'item')).toBe('2 items');
        expect(Formatter.pluralize(0, 'item')).toBe('0 items');
        expect(Formatter.pluralize(5, 'item')).toBe('5 items');
      });

      test('should use custom plural form', () => {
        expect(Formatter.pluralize(1, 'child', 'children')).toBe('1 child');
        expect(Formatter.pluralize(2, 'child', 'children')).toBe('2 children');
        expect(Formatter.pluralize(1, 'person', 'people')).toBe('1 person');
        expect(Formatter.pluralize(3, 'person', 'people')).toBe('3 people');
      });
    });
  });

  describe('integration tests', () => {
    test('should handle complete project formatting workflow', () => {
      const projectName = 'My Awesome Data DAO';
      
      const dlpName = Formatter.formatDataDAOName(projectName);
      const tokenName = Formatter.formatTokenName(projectName);
      const tokenSymbol = Formatter.formatTokenSymbol(projectName);
      const dirName = Formatter.formatProjectDirectory(projectName);
      
      expect(dlpName).toBe('MyAwesomeDataDAO');
      expect(tokenName).toBe('MyAwesomeDataToken');
      expect(tokenSymbol).toBe('MADD');
      expect(dirName).toBe('my-awesome-data-dao');
    });

    test('should handle special DAO cases consistently', () => {
      const daoProject = 'governance dao';
      
      const dlpName = Formatter.formatDataDAOName(daoProject);
      const tokenName = Formatter.formatTokenName(daoProject);
      const tokenSymbol = Formatter.formatTokenSymbol(daoProject);
      
      expect(dlpName).toBe('GovernanceDAO');
      expect(tokenName).toBe('GovernanceToken');
      expect(tokenSymbol).toBe('GDT');
    });
  });
}); 