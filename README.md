# create-datadao

[![semantic-release: conventionalcommits](https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

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
# Enhanced status with recovery options
create-datadao status my-datadao

# Deploy contracts with better error handling
create-datadao deploy:contracts my-datadao

# Register DataDAO with automatic dlpId detection
create-datadao register my-datadao

# Start UI with complete configuration
create-datadao ui my-datadao

# Get help
create-datadao --help
```

## Smart Error Recovery

The CLI now automatically detects and helps recover from common issues:

```bash
# If something goes wrong, the status command offers recovery
create-datadao status my-datadao
# → 🔧 Fix configuration issues
# → 🔄 Show recovery options
# → 📝 Update credentials
# → 📊 View detailed errors
```

**Common Recovery Scenarios:**
- **Insufficient balance** → Automatic funding guidance
- **Transaction failures** → Retry with exponential backoff
- **Missing credentials** → Interactive credential update
- **Configuration drift** → Automatic validation and fixes

## Enhanced User Experience

### Cleaner Output
- **👤 Clear user input markers** - Easy to spot where you provided input
- **📊 Progress indicators** - Visual progress bars for long operations
- **🎯 Focused messaging** - Less repetitive text, more actionable information

### Automatic Detection
- **dlpId extraction** - Automatic detection after registration
- **refinerId polling** - Smart transaction monitoring (with manual fallback)
- **Contract validation** - Automatic verification of deployment state

### Configuration Management
```bash
# Interactive credential updates
create-datadao status my-datadao
# → Choose "Update credentials"
# → Select: Pinata, Google OAuth, or view current config
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
├── deployment.json.backup  # Automatic backup
└── package.json       # Project dependencies and scripts
```

## Setup Flow with Error Recovery

The CLI now provides robust error handling at each step:

### 1. **Project Creation**
- Enhanced validation of inputs
- Automatic wallet derivation with verification
- Credential validation before proceeding

### 2. **Smart Contract Deployment**
- **Balance checking** with funding guidance
- **Network validation** and retry logic
- **Automatic address extraction** from deployment logs
- **State persistence** with backup

### 3. **DataDAO Registration**
- **Automatic dlpId detection** via blockchain query
- **Transaction monitoring** with status updates
- **Fallback to manual registration** with guided steps

### 4. **Component Configuration**
- **Proof**: Enhanced dlpId pattern matching, automatic git setup
- **Refiner**: Smart refinerId detection, IPFS upload automation
- **UI**: Complete environment setup including NEXTAUTH_SECRET

### 5. **Continuous Monitoring**
- **Health checks** for all components
- **Configuration drift detection**
- **Interactive recovery menus**

## Error Handling & Recovery

### Automatic Recovery
```bash
# The CLI detects issues and offers solutions
create-datadao status my-datadao
# → ⚠️ Issues detected in your setup
# → 🔧 Fix configuration issues
# → 🔄 Show recovery options
```

### Manual Recovery
```bash
# Update any credentials that changed
create-datadao status my-datadao
# → Choose "Update credentials"
# → Select credential type to update
```

### State Management
- **Automatic backups** before each operation
- **Rollback capability** for failed operations
- **Incremental progress** tracking
- **Resume from any point** in the deployment

## Development Workflow

```bash
# 1. Create project with enhanced validation
create-datadao create my-datadao

# 2. Monitor progress with rich status
create-datadao status my-datadao

# 3. Deploy with automatic error recovery
create-datadao deploy:contracts my-datadao

# 4. Register with automatic dlpId detection
create-datadao register my-datadao

# 5. Configure components with smart automation
create-datadao deploy:proof my-datadao
create-datadao deploy:refiner my-datadao

# 6. Test UI with complete configuration
create-datadao ui my-datadao

# 7. Recover from any issues
create-datadao status my-datadao
```

## Troubleshooting

### Enhanced Error Messages

**"Configuration issues detected"**
```bash
create-datadao status my-datadao
# → Automatic validation and guided fixes
# → Interactive credential updates
# → Configuration consistency checks
```

**"Transaction failed"**
```bash
# Automatic retry with exponential backoff
# Clear error messages with next steps
# Fallback to manual completion with guidance
```

**"Component setup failed"**
```bash
# Step-by-step recovery instructions
# Automatic state cleanup and retry
# Manual override options available
```

### Recovery Commands
```bash
# View detailed error information
create-datadao status my-datadao
# → Choose "View detailed errors"

# Retry failed operations
create-datadao status my-datadao
# → Choose "Show recovery options"
# → Choose "Retry failed steps automatically"

# Update configuration
create-datadao status my-datadao
# → Choose "Update credentials"
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

