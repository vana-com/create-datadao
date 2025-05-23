# DataDAO Generator

CLI tool to generate and deploy DataDAOs on Vana network.

## Usage

```bash
npx create-datadao my-datadao
```

## Requirements

- Node.js 16+
- Wallet with VANA tokens (use [faucet](https://faucet.vana.org) for testnet)
- Pinata account for IPFS
- Google Cloud project for OAuth
- GitHub account for template forks

## Generated Structure

```
my-datadao/
├── contracts/          # vana-dlp-smart-contracts
├── proof/             # vana-satya-proof-template-py
├── refiner/           # vana-data-refinement-template
├── ui/                # dlp-ui-template
└── scripts/           # deployment automation
```

## Configuration

Generator prompts for:
- Private key (address/pubkey auto-derived via viem)
- Pinata API credentials
- Google OAuth credentials
- GitHub username

## Deployment Flow

1. Contracts deploy to Moksha testnet
2. Guided GitHub repository setup (required for registration)
3. DataDAO registration on-chain
4. UI testing

## Scripts

- `npm run status` - deployment progress
- `npm run ui:dev` - start UI server
- `npm run register:datadao` - register on network
- `npm run configure` - update credentials

## Dependencies

Registration requires GitHub Actions artifacts from forked proof template. Setup flow enforces correct dependency order.

## Changelog

**v1.0.3** - Fixed dependency flow (GitHub setup before registration), guided step-by-step completion
**v1.0.2** - Wallet derivation via viem (private key only input)
**v1.0.1** - Contract deployment fixes, regex improvements
**v1.0.0** - Initial release



