# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `create-datadao` CLI tool - a project generator and management tool for creating DataDAOs on the Vana blockchain network. It automates the entire DataDAO creation workflow including smart contracts, proof systems, data refinement, and UI deployment.

## Development Commands

Since this is a CLI tool, there are no build/test commands configured. The main executable is `bin/create-datadao.js`.

To test the CLI locally:
```bash
npm link  # Links the CLI globally for testing
```

## Architecture

### CLI Structure
- **Entry Point**: `bin/create-datadao.js` - Commander-based CLI with global commands
- **Core Libraries** in `lib/`:
  - `generator.js` - Orchestrates template generation and project setup
  - `blockchain.js` - Viem-based blockchain interactions with Vana network
  - `config.js` - Interactive user configuration collection
  - `wallet.js` - Derives wallets from private keys
  - `output.js` - Provides clean UI formatting with spinners and progress
  - `state-manager.js` - Manages deployment.json state with automatic backups

### Key Design Patterns

1. **Global Command Pattern**: The CLI works from any directory by searching for project paths
2. **State Persistence**: All deployment state is tracked in `deployment.json` with automatic backups
3. **Error Recovery**: Every operation includes retry logic and interactive recovery options
4. **Template System**: Uses `src/templates/` for generating deployment scripts in user projects

### Blockchain Integration

- **Network**: Vana Moksha testnet (chainId: 14800)
- **RPC**: https://rpc.moksha.vana.org
- **Contracts**: DataRegistry at 0xd0fD0cFA96a01bEc1F3c26d9D0Eb0F20fc2BB30C
- **Transaction Pattern**: Exponential backoff retry with balance checking

### Generated Project Structure

The CLI generates projects with this structure:
```
my-datadao/
├── contracts/       # Cloned from vana-com/datadao-contracts
├── proof/          # User's GitHub repo from vana-com/proof-template
├── refiner/        # User's GitHub repo from vana-com/refiner-template  
├── ui/             # Cloned from vana-com/datadao-ui
├── scripts/        # Generated deployment scripts
└── deployment.json # State tracking file
```

### Error Handling Strategy

1. **Balance Checking**: Always verify wallet has sufficient VANA before transactions
2. **State Recovery**: Use `deployment.json.backup` for rollback on failures
3. **Interactive Menus**: Provide recovery options through `inquirer` prompts
4. **Transaction Monitoring**: Poll for transaction receipts with timeout handling

## Important Implementation Details

- The CLI must handle cases where users run commands from different directories
- Always validate deployment.json exists and has valid structure before operations
- Transaction failures should offer both automatic retry and manual completion paths
- GitHub repository creation can be automated (with gh CLI) or manual
- IPFS uploads use Pinata with JWT authentication
- Google OAuth credentials are required for UI authentication setup