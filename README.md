
# m-fhe-g<img width="500" height="500" alt="image_2025-12-26_21-23-13" src="https://github.com/user-attachments/assets/57cedd32-6893-4627-b429-b5d9383ac222" />


═════════════════════════

✨🜂  M – F H E – G  🜂✨

═════════════════════════

## What is m-fhe-g

m-fhe-g is a decentralized card battle game built on Ethereum Sepolia testnet. Players collect character cards with encrypted stats (strength, intelligence, agility), build decks, and challenge other players. All character statistics are encrypted using Fully Homomorphic Encryption (FHE), meaning stats remain completely private and encrypted throughout the entire game, even during battle computations.

**Key Innovation**: Uses Zama FHEVM and FHE Relayer SDK to ensure that character stats are never exposed in plaintext. Stats are encrypted on the client side, stored as FHE handles on-chain, and can be used in computations without decryption.

⸻

## Core Features

### 🔐 FHE Encryption
- **Character Stats Encryption**: Strength, Intelligence, and Agility values are encrypted using FHE before being stored on-chain
- **Battle Stats Encryption**: Total deck statistics for battles are encrypted using FHE
- **Privacy by Design**: All sensitive game data remains encrypted throughout the entire lifecycle
- **Client-Side Encryption**: Stats are encrypted using Zama FHEVM Relayer SDK before sending to the blockchain

### 🎮 Game Mechanics
- **40 Unique Characters**: Each character has encrypted stats and a unique special ability
- **Deck Building**: Create decks with up to 10 characters
- **Battle System**: Challenge other players with encrypted deck stats
- **On-Chain Resolution**: Battle results are determined and stored on-chain

⸻

## How It Works

### For Players

1. **Connect Wallet**: Connect your Ethereum wallet (MetaMask, WalletConnect, etc.)
2. **Mint Characters**: Select and mint character cards - stats are encrypted with FHE before minting
3. **Build Decks**: Create decks by selecting up to 10 characters you own
4. **Create Battles**: Challenge other players by creating a battle with their address
5. **Accept Battles**: Accept incoming battle challenges from other players
6. **Battle Resolution**: Battles are resolved on-chain, winner is determined based on encrypted stats

### Technical Flow

1. **Character Minting**:
   - User selects a character with stats (e.g., Strength: 80, Intelligence: 60, Agility: 70)
   - FHE Relayer SDK encrypts each stat value individually
   - Each encrypted stat becomes an FHE handle (bytes32)
   - Contract stores the FHE handles on-chain
   - Original stat values remain encrypted and private

2. **Deck Creation**:
   - User selects characters they own
   - Deck information (character IDs, name) is stored on-chain
   - No encryption needed for deck structure (only character IDs are stored)

3. **Battle Creation**:
   - User selects opponent address and their deck
   - Total deck stats are calculated (sum of all character stats in deck)
   - Total stats are encrypted using FHE
   - Encrypted stats are stored as FHE handle in battle contract
   - Battle status is set to Pending

4. **Battle Acceptance**:
   - Opponent receives battle challenge
   - Opponent selects their deck
   - Opponent's deck stats are encrypted using FHE
   - Encrypted stats are stored in battle contract
   - Battle status changes to Active

5. **Battle Resolution**:
   - Battle can be resolved on-chain
   - Winner is determined based on encrypted stats comparison
   - Battle status changes to Completed
   - Winner address is stored on-chain

⸻

## FHE Architecture

### Fully Homomorphic Encryption (FHE)

m-fhe-g uses **Zama FHEVM** with **FHE Relayer SDK** to encrypt all character statistics. FHE allows computations to be performed on encrypted data without decrypting it first.

### How FHE Works in m-fhe-g

1. **Encryption Process**:
   - User's stat values (numbers) are encrypted client-side using FHE Relayer SDK
   - Encryption creates an FHE handle (bytes32) that represents the encrypted value
   - FHE handle is a reference to the encrypted data stored by the FHE relayer
   - Handle can be used in homomorphic operations without decryption

2. **Storage**:
   - Contract stores FHE handles (bytes32), not plaintext values
   - Handles are stored in Character struct (encryptedStrength, encryptedIntelligence, encryptedAgility)
   - Handles are stored in Battle struct (encryptedStats1, encryptedStats2)

3. **Operations**:
   - FHE handles can be used in homomorphic computations via the FHE relayer
   - Operations like addition, comparison can be performed on encrypted data
   - Results remain encrypted until explicitly decrypted by authorized parties

4. **Privacy**:
   - Original stat values are never exposed on-chain
   - Only FHE handles (encrypted references) are publicly visible
   - Decryption requires access to the FHE relayer and proper authorization
   - Stats remain private throughout the entire game lifecycle

### FHE Functions in Contract

The contract includes functions specifically for working with FHE-encrypted data:

- `mintCharacter()` - Accepts FHE handles for strength, intelligence, and agility
- `getCharacterEncryptedStats()` - Returns FHE handles for a character's stats (owner only)
- `createBattle()` - Accepts FHE handle for encrypted deck stats
- `acceptBattle()` - Accepts FHE handle for encrypted deck stats

⸻

## Technical Stack

### Blockchain & Privacy
- **Network**: Ethereum Sepolia Testnet
- **Privacy Layer**: Fully Homomorphic Encryption (FHE) via Zama FHEVM
- **Encryption SDK**: Zama FHEVM Relayer SDK (v0.3.0-6)
- **Storage**: On-chain storage of FHE handles (encrypted data references)

### Frontend
- **Framework**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: Wagmi + RainbowKit for wallet connections
- **Blockchain Interaction**: Ethers.js v6 for contract calls
- **FHE Integration**: @zama-fhe/relayer-sdk for client-side encryption

### Smart Contracts
- **Language**: Solidity ^0.8.20
- **Contract**: CardBattle.sol with FHE handle support
- **Functions**: Mint characters, create decks, create/accept battles, resolve battles
- **FHE Support**: All stat values stored as FHE handles (bytes32)

### Development Tools
- **Build Tool**: Hardhat for contract compilation
- **RPC Provider**: rpc.sepolia.org (official Sepolia RPC endpoint)
- **Deployment**: Manual deployment via Hardhat scripts

⸻

## Project Structure

```
27-wallet/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main page component
│   ├── providers.tsx      # Wagmi/RainbowKit providers
│   └── globals.css        # Global styles
├── components/
│   └── CardBattle.tsx     # Main game component with FHE integration
├── contracts/
│   └── CardBattle.sol     # Smart contract with FHE handle support
├── lib/
│   ├── characters.ts      # Character definitions and data
│   └── provider.ts        # Blockchain provider utilities
├── scripts/
│   └── deploy-game.js     # Contract deployment script
└── Configuration files (package.json, tsconfig.json, etc.)
```

⸻

## Setup and Deployment

### Prerequisites

- Node.js 18+ and npm
- Ethereum wallet with Sepolia testnet ETH
- Git (for version control)

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create `.env.local`:
   ```env
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
   NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x0c00b7865F7372Bc92B28BC320D61D4799DE68f3
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
   PRIVATE_KEY=your_private_key_for_deployment
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Compile contracts** (if needed):
   ```bash
   npm run compile
   ```

### Contract Deployment

1. **Deploy to Sepolia**:
   ```bash
   npm run deploy:game
   ```

2. **Update contract address** in `.env.local` and Vercel environment variables

### Production Deployment

Deployed on Vercel: **https://magic-fhe-gathering.vercel.app**

Environment variables are configured in Vercel dashboard for production builds.

⸻

## Contract Information

**Contract Address**: `0x0c00b7865F7372Bc92B28BC320D61D4799DE68f3`  
**Network**: Sepolia Testnet  
**Deployer**: `0xB52d6B91eCaB3E48Ef5d5237FB82E81B8C9cB360`

### Main Functions

- `mintCharacter()` - Mint a new character with FHE-encrypted stats (strength, intelligence, agility)
- `createDeck()` - Create a deck with selected character IDs
- `createBattle()` - Create a battle challenge with FHE-encrypted deck stats
- `acceptBattle()` - Accept a battle challenge with FHE-encrypted deck stats
- `resolveBattle()` - Resolve a battle and set the winner
- `getCharacter()` - Get character basic info (id, name, ability)
- `getCharacterEncryptedStats()` - Get FHE handles for character stats (owner only)
- `getDeck()` - Get deck information
- `getBattle()` - Get battle information
- `getUserCharacters()` - Get all character IDs owned by a user
- `getUserDecks()` - Get all deck IDs owned by a user
- `getUserBattles()` - Get all battle IDs for a user

⸻

## FHE Implementation Details

### Client-Side Encryption

The frontend uses Zama FHEVM Relayer SDK to encrypt stat values:

```typescript
// Encrypt number using FHE
const encryptNumber = async (value: number): Promise<string> => {
  const inputBuilder = relayerInstance.createEncryptedInput(
    CONTRACT_ADDRESS,
    address
  )
  inputBuilder.add32(value)
  const encryptedInput = await inputBuilder.encrypt()
  return encryptedInput.handles[0]  // Returns FHE handle (bytes32)
}
```

### Contract Storage

The contract stores FHE handles as bytes32 values:

```solidity
struct Character {
    uint256 id;
    string name;
    string ability;
    bytes32 encryptedStrength;      // FHE handle
    bytes32 encryptedIntelligence;  // FHE handle
    bytes32 encryptedAgility;       // FHE handle
}
```

### Privacy Guarantees

- **No Plaintext Storage**: Original stat values are never stored on-chain
- **Encrypted Handles**: Only FHE handles (encrypted references) are stored
- **Client-Side Decryption**: Original values can only be decrypted by authorized parties via FHE relayer
- **Homomorphic Operations**: Operations can be performed on encrypted data without decryption

⸻

## Current Status

**Live on**: https://magic-fhe-gathering.vercel.app  
**Network**: Sepolia Testnet  
**Status**: Experimental / Production-ready

### Features Implemented

✅ FHE encryption integration via Zama FHEVM Relayer SDK  
✅ Character minting with encrypted stats  
✅ Deck creation and management  
✅ Battle creation and acceptance with encrypted stats  
✅ On-chain battle resolution  
✅ Modern UI with Tailwind CSS  
✅ Wallet connection via RainbowKit  
✅ Smart contract with FHE handle support  
✅ Production deployment on Vercel

### Known Considerations

- Running on Sepolia testnet (test tokens only)
- FHE operations require relayer connection
- Gas costs may vary based on network conditions
- Experimental technology - use at your own risk
- Character stats are encrypted but stored handles are visible on-chain (cannot decrypt without relayer)

⸻

## License

MIT License - See LICENSE file for details

⸻

## Acknowledgments

Built with:
- [Zama FHEVM](https://www.zama.ai/) for Fully Homomorphic Encryption
- [Next.js](https://nextjs.org/) for the web framework
- [Wagmi](https://wagmi.sh/) and [RainbowKit](https://www.rainbowkit.com/) for wallet integration
- [Ethereum](https://ethereum.org/) for the blockchain infrastructure
