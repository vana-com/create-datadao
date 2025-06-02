# create-datadao

Launch a DataDAO on Vana in minutes. This CLI tool automates the entire DataDAO creation workflow—from smart contracts to data validation.

## Quick Start

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

- Node.js 18+
- A funded wallet (~10 VANA for deployment + registration)
- GitHub account (for proof/refiner repos)
- Google OAuth credentials (for UI authentication)

Get testnet VANA: https://faucet.vana.org

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
- Proof: https://github.com/vana-com/vana-satya-proof-template-py
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
- **Discord:** https://discord.gg/vana

## Contributing

Pull requests welcome. For major changes, please open an issue first.

### Development

```bash
git clone https://github.com/vana-com/create-datadao
cd create-datadao
npm install
npm link  # Test locally
```

### Running Tests

```bash
npm test
```

## License

MIT