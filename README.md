# create-datadao

🚀 **CLI tool to create and manage DataDAOs on the Vana network**

Generate complete DataDAO projects with smart contracts, proof systems, data refinement, and UI - all from a single command.

## Quick Start

```bash
# Create a new DataDAO project
npx create-datadao create my-datadao

# Or install globally for easier management
npm install -g create-datadao
create-datadao create my-datadao
```

## Global Commands

The CLI works from anywhere - no need to `cd` into project directories:

```bash
# Check project status from anywhere
create-datadao status my-datadao

# Deploy contracts from anywhere
create-datadao deploy:contracts my-datadao

# Register DataDAO on network
create-datadao register my-datadao

# Start UI development server
create-datadao ui my-datadao

# Get help
create-datadao --help
```

## Smart Project Detection

When you have projects in the current directory:

```bash
# Auto-detects single project
create-datadao status

# Lists multiple projects and prompts
create-datadao status
# → Multiple DataDAO projects found:
#   • my-datadao
#   • another-dao
#   Please specify: create-datadao status <project-name>
```

## Requirements

- **Node.js 16+**
- **Wallet with VANA tokens** - Get testnet tokens from [faucet.vana.org](https://faucet.vana.org)
- **Pinata account** - For IPFS storage ([pinata.cloud](https://pinata.cloud))
- **Google Cloud project** - For OAuth ([console.cloud.google.com](https://console.cloud.google.com))
- **GitHub account** - For template repositories
- **GitHub CLI** (optional) - For automated repository setup ([cli.github.com](https://cli.github.com))

## Generated Project Structure

```
my-datadao/
├── contracts/          # Smart contracts (cloned locally)
├── proof/             # Proof of contribution (your GitHub repo)
├── refiner/           # Data refinement (your GitHub repo)
├── ui/                # User interface (cloned locally)
├── scripts/           # Deployment automation
├── deployment.json    # Project state and addresses
└── package.json       # Project dependencies and scripts
```

**Repository Strategy:**
- **contracts/** & **ui/** - Cloned locally from templates, not connected to your GitHub
- **proof/** & **refiner/** - Fresh repositories created from templates in your GitHub account

## Setup Flow

The CLI guides you through each step:

### 1. **Project Creation**
- DataDAO name, token name/symbol
- Private key (address/public key auto-derived)
- Pinata API credentials
- Google OAuth setup
- GitHub username

### 2. **GitHub Repository Setup**
- **Automated** (with GitHub CLI): Creates 2 fresh repositories from templates
  - `my-datadao-proof` - Proof of Contribution validation
  - `my-datadao-refiner` - Data refinement and schema
- **Manual** (web interface): Guided instructions to create repositories using "Use this template"
- GitHub Actions automatically enabled for building artifacts

### 3. **Smart Contract Deployment**
- Automatic deployment to Moksha testnet
- Balance checking and funding guidance
- Contract address extraction and storage

### 4. **DataDAO Registration**
- Register on Vana network (requires 1 VANA fee)
- Automatic dlpId detection via blockchain query
- Manual registration via Vanascan with guided steps

### 5. **Component Configuration**
- **Proof**: Updates dlpId, pushes to your GitHub repo, builds artifacts
- **Refiner**: Retrieves encryption key, configures schema, uploads to IPFS
- **UI**: Configures with all contract addresses and API keys

### 6. **Testing & Validation**
- UI development server
- End-to-end contributor flow testing
- Credential updates as needed

## Project Scripts

Once created, projects have these npm scripts:

```bash
# Inside project directory
npm run status              # Check deployment progress
npm run deploy:contracts    # Deploy smart contracts
npm run register:datadao    # Register on network
npm run deploy:proof        # Configure and deploy proof component
npm run deploy:refiner      # Configure and deploy refiner component
npm run deploy:ui           # Configure UI component
npm run ui:dev             # Start UI server (http://localhost:3000)
npm run configure          # Update credentials
npm run setup              # Install dependencies
```

## Configuration Management

Update credentials anytime:

```bash
create-datadao status my-datadao
# → Choose "Update configuration"
# → Select: Pinata, Google OAuth, or view current config
```

## GitHub Integration

### Automated Setup (Recommended)
- **GitHub CLI** automatically creates repositories from templates
- Fresh repositories with single commit (no history conflicts)
- GitHub Actions enabled automatically
- Repository URLs: `https://github.com/username/datadao-name-proof`

### Manual Setup (Fallback)
- Guided instructions for "Use this template" workflow
- Manual GitHub Actions enablement
- Repository URL input and validation

### Repository Naming
- **Proof**: `{datadao-name}-proof` (e.g., `my-datadao-proof`)
- **Refiner**: `{datadao-name}-refiner` (e.g., `my-datadao-refiner`)

## Blockchain Integration

- **Automatic wallet derivation** from private key using viem
- **Balance checking** before deployment
- **dlpId auto-detection** after registration
- **Encryption key polling** with 30-minute timeout
- **Contract address extraction** from deployment logs
- **Network validation** (Moksha testnet)

## Error Handling & Recovery

Smart error recovery with clear next steps:

```bash
# If deployment fails
create-datadao deploy:contracts my-datadao
# → Shows funding instructions and retry commands

# If registration fails
create-datadao register my-datadao
# → Guides through manual Vanascan registration

# If GitHub setup fails
# → Falls back to manual repository creation with guided instructions

# Resume from any step
create-datadao status my-datadao
# → Shows current progress and next actions
```

## Development Workflow

```bash
# 1. Create project
create-datadao create my-datadao

# 2. Check status anytime
create-datadao status my-datadao

# 3. Deploy when ready
create-datadao deploy:contracts my-datadao

# 4. Register on network
create-datadao register my-datadao

# 5. Configure components
create-datadao deploy:proof my-datadao
create-datadao deploy:refiner my-datadao

# 6. Test UI
create-datadao ui my-datadao

# 7. Update config as needed
create-datadao status my-datadao
```

## Troubleshooting

### Common Issues

**"Insufficient balance"**
```bash
# Fund your wallet at https://faucet.vana.org
# Check balance: https://moksha.vanascan.io/address/YOUR_ADDRESS
create-datadao deploy:contracts my-datadao  # Retry
```

**"Execution reverted"**
```bash
# Usually network congestion or contract issues
# Wait a few minutes and retry
create-datadao deploy:contracts my-datadao
```

**"GitHub CLI not authenticated"**
```bash
# Install and authenticate GitHub CLI
gh auth login
# Or continue with manual repository setup
```

**"Encryption key not found"**
```bash
# Wait a few minutes after registration, then retry
# Or retrieve manually from Vanascan QueryEngine contract
```

**"No DataDAO project found"**
```bash
# Check available projects
create-datadao status
# Or specify full path
create-datadao status /path/to/my-datadao
```

### Getting Help

```bash
create-datadao --help                    # All commands
create-datadao status my-datadao         # Project-specific status
```

## Architecture

- **CLI Layer**: Global commands with smart project detection
- **Generator**: Template cloning and fresh repository creation
- **Blockchain**: viem integration for wallet and contract operations
- **GitHub**: CLI integration for automated repository setup
- **Automation**: Deployment scripts with error recovery
- **UI**: React development server with hot reload

## Contributing

```bash
git clone https://github.com/vana-com/create-datadao
cd create-datadao
npm install
npm link  # Test locally
```

---

**Built for the Vana network** • [Documentation](https://docs.vana.org) • [Discord](https://discord.gg/EpAKHGtE)

