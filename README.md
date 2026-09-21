# ledgr â€â€ On-Chain Money Tracker

A simple money tracker where **anyone** can connect their wallet and log an expense
(amount, description, and date) as a **permanent, public record on BOT Chain**. Each wallet
keeps its own append-only list: records can never be edited or deleted, and anyone
can verify them on the block explorer.

Built for the Girl Meets Tech **Build Week Hackathon Vol.2** (BOT Chain, EVM-compatible).

## What it does

1. **Connect Wallet**: the app connects to MetaMask and auto-adds/switches to BOT Chain.
2. **Add an expense**: type an amount (USD) and a short description, then confirm the
   transaction in MetaMask. The expense is written on-chain.
3. **See your records**: the page reads your expenses straight from the blockchain and
   shows them with a running total, newest first, each linkable on the explorer.

The main action (logging an expense on-chain) works end to end for any wallet, not
just the deployer.

## How to use it

- Open the live site (see below).
- Click **Connect Wallet** and approve the BOT Chain network prompt in MetaMask.
- Enter an amount and description, click **Save to blockchain**, and confirm in MetaMask.
- Your record appears in the list and on the block explorer.

You'll need a little BOT for gas: testnet BOT from [the faucet](https://faucet.botchain.ai/basic),
or mainnet BOT allocated by the hackathon organizer.

## Stack

- **Contract:** `contracts/ExpenseTracker.sol`, Solidity `^0.8.20`, deployed via Remix.
- **Frontend:** one-page React + Vite + Tailwind, `ethers.js` for wallet + contract calls.
- **Storage:** 100% on-chain (no database, no localStorage).

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173/girlsHackathon/).

## Configure the contract

After deploying `contracts/ExpenseTracker.sol` in Remix, open `src/lib/chain.js` and set:

```js
export const CONTRACT_ADDRESS = '0xYourDeployedAddress'
export const ACTIVE_NETWORK   = 'testnet' // or 'mainnet' for the final submission
```

## Shared Ledgers

Beyond personal expense tracking, ledgr lets you create a **shared group
ledger** â€â€ for roommates, trip funds, club dues, or any situation where
multiple people need to log shared expenses without trusting one person''s
private spreadsheet. Anyone with the link can view the full ledger and see
exactly who contributed what, verified independently on-chain â€â€ no login,
no wallet required just to look. Connect a wallet to add your own expense
to the group.

**How it works:** click "Create shared ledger" on the tracker page, name
your group, and confirm the transaction. You''ll be taken straight to the
new ledger''s page â€â€ copy the link and share it with anyone who needs to
contribute. Each entry records which wallet logged it, so the "who
contributed" breakdown is always independently verifiable, by anyone,
without needing to trust the group creator.

## Deployment

> Fill these in after you deploy the contract in Remix. Judges check these on the explorer.

| Network | Chain ID | Contract Address | Explorer |
|---|---|---|---|
| BOT Chain **Testnet** | 968 | [`0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0`](https://scan.bohr.life/address/0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0) | https://scan.bohr.life/ |
| BOT Chain **Mainnet** | 677 | `0x... (paste mainnet address)` | https://scan.botchain.ai |

**Live website:** `https://... (paste your live domain here)`

## Contract interface

| Function | What it does |
|---|---|
| `addExpense(uint256 amount, string description)` | Log an expense for the caller's wallet (amount in cents). |
| `getExpenses(address wallet)` | Return all of a wallet's expenses. |
| `getExpense(address wallet, uint256 index)` | Return one expense. |
| `expenseCount(address wallet)` | How many a wallet has logged. |
| `totalSpent(address wallet)` | Running total (in cents) for a wallet. |
| `event ExpenseAdded(...)` | Emitted on every new expense. |

## Network reference

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC URL | https://rpc.bohr.life | https://rpc.botchain.ai |
| Native token | BOT | BOT |
| Explorer | https://scan.bohr.life/ | https://scan.botchain.ai |

## Community & Social

- **X (Twitter):** [@LedgrAppBOT](https://x.com/LedgrAppBOT)

