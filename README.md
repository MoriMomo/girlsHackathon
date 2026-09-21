# ledgr — On-Chain Money Tracker

A money tracker where **anyone** can connect their wallet and log an expense
(amount, description, category, and date) as a **permanent, public record on BOT
Chain**. Records can never be edited or deleted, and anyone can verify them on the
block explorer. Beyond personal tracking, ledgr also supports **shared group
ledgers** that multiple wallets contribute to and anyone can independently verify.

Built for the Girl Meets Tech **Build Week Hackathon Vol.2** (BOT Chain, EVM-compatible).

## Features

- **Personal expense tracker** — log amount, description, category, and date; each entry is written on-chain, permanent and public.
- **Shared group ledgers** — create a group anyone can contribute to; every entry records which wallet paid, so the "who contributed" breakdown is independently verifiable. Viewable from a link with **no wallet required** just to look.
- **On-chain ledger browser** — your ledgers (and all public ledgers) are reconstructed live from on-chain `GroupCreated` events, so they appear on any device with no database.
- **AI receipt scan** — snap a receipt and a vision model (Google Gemini) pre-fills the amount, date, and category; you review before signing. Falls back to a local parser when no AI key is set.
- **Spending-by-category chart** and **CSV export** of any ledger.
- **Blog** — project news and the mainnet launch announcement, served from the app.

## How it works

1. **Connect Wallet** — the app connects to MetaMask and auto-adds/switches to BOT Chain.
2. **Add an expense** — enter amount, description, category, and date (or scan a receipt), then confirm in MetaMask. The expense is written on-chain.
3. **See your records** — read straight from the blockchain, newest first, with a running total and per-entry explorer links.
4. **Share a ledger** — create a group ledger and share its link; anyone can view it and verify who contributed what.

The main action (logging on-chain) works end to end for **any** wallet, not just the deployer.

You'll need a little BOT for gas: testnet BOT from [the faucet](https://faucet.botchain.ai/basic), or mainnet BOT from the hackathon organizer.

## Stack

- **Contract:** `contracts/ExpenseTracker.sol`, Solidity `^0.8.20`, deployed via Remix.
- **Frontend:** React + Vite + Tailwind, `react-router-dom`, `ethers.js` for wallet + contract calls, `recharts` (category chart), `framer-motion` (UI motion).
- **Storage:** 100% on-chain — no database, no backend. Ledger lists are reconstructed from on-chain events; localStorage is only an optional cache.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173/girlsHackathon/).

Optional — enable the real AI receipt scan: copy `.env.example` to `.env` and set `VITE_GEMINI_API_KEY` (free key from Google AI Studio). Without it, the scan runs in local-parser mode.

## Deployment

| Network | Chain ID | Contract Address | Explorer |
|---|---|---|---|
| BOT Chain **Testnet** | 968 | [`0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0`](https://scan.bohr.life/address/0x30A2A3AcD2E5118F50E34A0Ee2e464C5EF8614B0) | https://scan.bohr.life/ |
| BOT Chain **Mainnet** | 677 | `0x... (paste mainnet address after deploy)` | https://scan.botchain.ai |

**Live website:** `https://... (paste your live domain here)`

## Contract interface

**Personal ledger**

| Function | What it does |
|---|---|
| `addExpense(uint256 amount, string description)` | Log an expense for the caller's wallet (amount in minor units / cents). |
| `getExpenses(address wallet)` | Return all of a wallet's expenses. |
| `getExpense(address wallet, uint256 index)` | Return one expense. |
| `expenseCount(address wallet)` | How many a wallet has logged. |
| `totalSpent(address wallet)` | Running total (in cents) for a wallet. |
| `event ExpenseAdded(address indexed owner, uint256 indexed index, uint256 amount, string description, uint256 timestamp)` | Emitted on every new personal expense. |

**Shared group ledgers**

| Function | What it does |
|---|---|
| `createGroup(bytes32 groupId, string name)` | Create a new shared ledger (id generated client-side). |
| `addGroupExpense(bytes32 groupId, uint256 amount, string description)` | Log an expense to a shared ledger; any wallet may contribute. |
| `getGroupExpenses(bytes32 groupId)` | Return every entry in a group (each includes the payer). |
| `groupExpenseCount(bytes32 groupId)` | How many entries a group has. |
| `groupExists(bytes32 groupId)` / `groupName(bytes32)` / `groupCreator(bytes32)` / `groupTotalSpent(bytes32)` | Group metadata + running total. |
| `event GroupCreated(bytes32 indexed groupId, string name, address indexed creator)` | Emitted when a ledger is created (used to reconstruct ledger lists). |
| `event GroupExpenseAdded(bytes32 indexed groupId, address indexed payer, uint256 indexed index, uint256 amount, string description, uint256 timestamp)` | Emitted on every group entry. |

> Note: date and category are packed into the on-chain `description` string (`YYYY-MM-DD|Category|text`) so both are stored on-chain without extra contract fields; the frontend encodes/decodes them.

## Network reference

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC URL | https://rpc.bohr.life | https://rpc.botchain.ai |
| Native token | BOT | BOT |
| Explorer | https://scan.bohr.life/ | https://scan.botchain.ai |

## Community & Social

- **X (Twitter):** [@LedgrAppBOT](https://x.com/LedgrAppBOT)

Built on [BOT Chain](https://botchain.ai) · [BOT Chain Explorer](https://scan.botchain.ai)
