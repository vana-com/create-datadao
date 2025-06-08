# create-datadao

Launch a DataDAO on Vana in minutes. This CLI tool automates the entire DataDAO creation workflow—from smart contracts to data validation.

## Quick Start

### Setup Modes

**Quick Setup (5 minutes):**
```bash
create-datadao create my-datadao
# Choose "Quick Setup" when prompted
```
- Auto-generates wallet and uses smart defaults
- Minimal prompts with automated flow
- Perfect for development and testing
- Skips external service setup initially

**Full Setup (30-45 minutes):**
```bash
create-datadao create my-datadao
# Choose "Full Setup" when prompted
```
- Complete configuration with explanations
- Step-by-step guidance with confirmations
- Sets up all external services (Pinata, Google OAuth)
- Production-ready deployment

Both modes execute the same underlying deployment steps - the difference is in user interaction. Quick mode automates decisions while Normal mode explains and asks for confirmation at each step.

### Basic Usage

```bash
npx create-datadao my-first-dao
```

Follow the prompts. You'll have a DataDAO deployed in ~15 minutes.

## What This Tool Does

1. **Deploys smart contracts** - Token, liquidity pool, and vesting contracts on Vana testnet
2. **Registers your DataDAO** - Makes it discoverable on the network
3. **Sets up data validation** - Configures proof-of-contribution and data refinement
4. **Creates a UI** - Deploys a contribution interface for your users

## Prerequisites

**Required:**
- Node.js 18+
- GitHub account (for proof/refiner repos)
- Pinata account for IPFS storage (https://pinata.cloud)
- Google OAuth credentials (https://console.cloud.google.com)
- GitHub CLI for automated repository setup (https://cli.github.com)

## Installation

```bash
# Global installation
npm install -g create-datadao

# Or use npx (recommended)
npx create-datadao
```

## Commands

### Create a New DataDAO

```bash
create-datadao my-datadao
```

Options:
- `--config <path>` - Use a JSON configuration file
- `--quick` - Skip optional features for faster setup

### Check Status

```bash
create-datadao status           # Lists all projects
create-datadao status my-dao    # Specific project status
```

### Deploy Individual Components

```bash
create-datadao deploy:contracts [project-path]
create-datadao register [project-path]
create-datadao ui [project-path]
```

## Configuration

### Interactive Mode (Default)

The CLI guides you through setup:

```bash
? DataDAO name: Weather Data Collective
? Token name: Weather Token
? Token symbol: WEATHER
? Private key (or press enter to generate):
```

### Config File Mode

Create a config file for automated deployment:

```json
{
  "projectName": "weather-dao",
  "privateKey": "0x...",
  "dlpName": "Weather Data Collective",
  "dlpToken": "WEATHER",
  "tokenName": "Weather Token",
  "tokenSymbol": "WEATHER",
  "githubUsername": "your-username",
  "googleClientId": "your-client-id",
  "googleClientSecret": "your-secret",
  "pinataApiKey": "your-key",
  "pinataApiSecret": "your-secret"
}
```

Deploy with:
```bash
create-datadao --config weather-config.json
```

## Project Structure

After creation, your project contains:

```
my-datadao/
├── contracts/       # Smart contract code
├── proof/          # Data validation logic
├── refiner/        # Data transformation pipeline
├── ui/             # Contribution interface
├── scripts/        # Deployment scripts
└── deployment.json # Deployment state
```

## Deployment Flow

1. **Contract Deployment** (~3 minutes)
   - Deploys token contract
   - Deploys DataLiquidityPool proxy
   - Sets up vesting wallet

2. **DataDAO Registration** (~1 minute)
   - Registers with Vana network
   - Requires 1 VANA fee
   - Returns unique dlpId

3. **Proof & Refiner Setup** (~5 minutes)
   - Creates GitHub repositories
   - Configures validation rules
   - Sets up data pipeline

4. **UI Deployment** (~5 minutes)
   - Deploys to Vercel
   - Configures authentication
   - Enables data contributions

## Common Issues

### Insufficient Funds

```
Error: Insufficient funds for transaction
```

**Fix:** Get testnet VANA from https://faucet.vana.org

### Registration Failed

```
Error: Transaction reverted
```

**Fix:** Ensure contracts deployed successfully. Run `create-datadao status` to check.

### GitHub Repository Exists

```
Warning: Repository already exists
```

**Fix:** The tool continues with existing repos. No action needed.

## Recovery

If deployment fails midway:

```bash
create-datadao status my-dao    # Check current state
npm run deploy:contracts        # Resume from failure point
```

All progress is saved in `deployment.json`.

## Advanced Usage

### Custom Templates

Fork template repositories before creation:
- Proof: https://github.com/vana-com/dlp-proof-template
- Refiner: https://github.com/vana-com/vana-data-refinement-template

### Manual Deployment

Each step can be run independently:

```bash
cd my-datadao
npm run deploy:contracts
npm run register:datadao
npm run deploy:proof
npm run deploy:refiner
npm run deploy:ui
```

### State Management

View deployment state:
```bash
cat deployment.json | jq
```

Key fields:
- `tokenAddress` - Your DataDAO token
- `proxyAddress` - DataLiquidityPool address
- `dlpId` - Network registration ID
- `state` - Deployment progress

## Environment Variables

Optional configuration via `.env`:

```bash
PRIVATE_KEY=0x...
GITHUB_USERNAME=your-username
PINATA_API_KEY=your-key
PINATA_API_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
```

## Network Information

**Vana Moksha Testnet**
- Chain ID: 14800
- RPC: https://rpc.moksha.vana.org
- Explorer: https://moksha.vanascan.io
- Faucet: https://faucet.vana.org

**Key Contracts**
- DataRegistry: `0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C`

## Support

- **Issues:** https://github.com/vana-com/create-datadao/issues
- **Docs:** https://docs.vana.org
- **Discord:** https://discord.gg/vanabuilders

## Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes this project better.

### Getting Started

#### Prerequisites for Development
- Node.js 18+ and npm
- Git and GitHub account
- GitHub CLI (recommended): `brew install gh` or `npm install -g @github/cli`
- Basic familiarity with CLI tools and Node.js

#### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub first, then:
   git clone https://github.com/YOUR_USERNAME/create-datadao
   cd create-datadao
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Link for Local Testing**
   ```bash
   npm link
   # Now you can test with: create-datadao create test-project
   ```

4. **Verify Setup**
   ```bash
   # Test the CLI works
   create-datadao --help
   
   # Run the test suite
   npm test
   ```

### Project Structure

```
create-datadao/
├── bin/
│   └── create-datadao.js          # CLI entry point
├── lib/
│   ├── generator.js               # Project template generation
│   ├── config.js                  # Configuration management
│   ├── wallet.js                  # Blockchain wallet utilities
│   ├── validation.js              # Input validation
│   └── formatting.js              # String formatting helpers
├── src/
│   ├── index.js                   # Core generator logic
│   └── templates/                 # Script templates for generated projects
├── __tests__/
│   ├── lib/                       # Unit tests
│   ├── integration/               # Integration tests
│   └── production/                # End-to-end tests
└── package.json
```

### Testing

We use Jest for testing with multiple test suites:

```bash
# Run all tests
npm test

# Unit tests only (fast)
npm run test:unit

# Integration tests (medium speed)
npm run test:integration

# Production tests (slow, requires network)
npm run test:production

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

#### Testing Your Changes

1. **Unit Tests**: Test individual functions in isolation
   ```bash
   npm run test:unit
   ```

2. **Integration Tests**: Test CLI commands end-to-end
   ```bash
   npm run test:integration
   ```

3. **Manual Testing**: Test the full user experience
   ```bash
   create-datadao create test-dao
   create-datadao status test-dao
   ```

### Making Changes

#### Code Style
- Use consistent formatting (we recommend Prettier)
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Keep functions focused and testable

#### Adding Features

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** (TDD approach recommended)
   ```bash
   # Add tests in __tests__/lib/ for new utilities
   # Add integration tests in __tests__/integration/
   ```

3. **Implement the feature**
   - Follow existing patterns in the codebase
   - Update CLI help text if adding commands
   - Update README if user-facing

4. **Test thoroughly**
   ```bash
   npm test
   npm run test:coverage  # Ensure good coverage
   ```

#### Bug Fixes

1. **Reproduce the bug** with a test case
2. **Fix the issue** while keeping tests passing
3. **Add regression tests** to prevent future occurrences

### Submitting Changes

#### Pull Request Process

1. **Ensure tests pass**
   ```bash
   npm test
   ```

2. **Update documentation** if needed
   - README.md for user-facing changes
   - JSDoc comments for code changes
   - Add examples for new features

3. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Include testing instructions

4. **PR Template**
   ```markdown
   ## What Changed
   Brief description of your changes

   ## Why
   Explanation of the problem this solves

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manually tested with: `create-datadao create test-project`

   ## Checklist
   - [ ] Documentation updated
   - [ ] Tests added/updated
   - [ ] No breaking changes (or clearly marked)
   ```

### Reporting Issues

#### Bug Reports
Include:
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (Node version, OS)
- **CLI command and output**
- **Error logs** if any

#### Feature Requests
Include:
- **Use case description**
- **Proposed solution**
- **Alternative approaches considered**
- **Willingness to implement**

### Development Tips

#### Testing Changes Locally

```bash
# Link your development version
npm link

# Test create command
create-datadao create test-project

# Test status command
create-datadao status test-project

# Clean up test projects
rm -rf test-project

# Unlink when done
npm unlink -g create-datadao
```

#### Debugging

```bash
# Add debug logs to your code
console.log(chalk.gray('DEBUG:'), 'variable value:', variable);

# Run with verbose output
DEBUG=* create-datadao create test-project
```

#### Common Gotchas

- **File paths**: Use `path.join()` for cross-platform compatibility
- **Async operations**: Always handle Promise rejections
- **User input**: Validate and sanitize all inputs
- **Error messages**: Make them actionable and user-friendly

### Release Process

We use semantic-release for automated releases:
- **fix**: Patch version (0.0.1)
- **feat**: Minor version (0.1.0)  
- **BREAKING CHANGE**: Major version (1.0.0)

Use conventional commits:
```bash
git commit -m "feat: add support for custom templates"
git commit -m "fix: resolve Windows path issues"
git commit -m "docs: update installation instructions"
```

### Need Help?

- **Questions**: Open a discussion on GitHub
- **Chat**: Join our Discord community
- **Issues**: Search existing issues before creating new ones

Thank you for contributing to create-datadao! 🚀

## License

MIT
