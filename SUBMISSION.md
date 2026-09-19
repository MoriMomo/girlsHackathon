# Submission checklist — Build Week Hackathon Vol.2

Deadline: **Tue Sep 23, 2026, 11:59 PM (Asia/Bangkok / GMT+7)**. Miss one item = not judged.

## The 4 required items
- [ ] **Contract address** on BOT Chain (with real on-chain activity)
- [ ] **Live website link** (a live domain — judges connect a wallet and use it)
- [ ] **GitHub repo** with the `.sol` file + this README's **Deployment** section filled in
- [ ] **X post** on a dedicated project account, tagging **@BOTChain_ai**, link pasted in the form

## Go-live steps (in order)

1. **Deploy to testnet first**
   - Open [Remix](https://remix.ethereum.org), create `ExpenseTracker.sol`, paste the contract.
   - Compile with 0.8.20. Deploy with Environment = "Injected Provider - MetaMask", wallet on BOT Chain **Testnet (968)**.
   - Copy the deployed address → paste into `src/lib/chain.js` (`CONTRACT_ADDRESS`, keep `ACTIVE_NETWORK = 'testnet'`).
   - `npm run dev`, connect wallet, add a test expense, confirm it reads back. This is your live demo rehearsal.

2. **Deploy to mainnet**
   - Get real BOT from the organizer (send them your wallet address early!).
   - Switch MetaMask to BOT Chain **Mainnet (677)**, deploy the same contract in Remix.
   - Copy the mainnet address. Set `ACTIVE_NETWORK = 'mainnet'` and paste the mainnet address in `src/lib/chain.js`.
   - Put BOTH addresses in the README Deployment table.

3. **Publish the frontend**
   - `npm run build` → deploy the `dist/` folder to GitHub Pages (repo → Settings → Pages).
   - Buy a cheap domain ($1–1.50), point it at Pages (Settings → Pages → Custom domain + DNS records). Keep the receipt for reimbursement.
   - When the site serves from the domain root, change `base` in `vite.config.js` back to `'/'` and rebuild.

4. **Post on X**
   - New account for the project. Post a screenshot/clip of the working page. Tag **@BOTChain_ai**. Paste the link in the form.

5. **Submit** all 4 items in the form before the deadline.

## X post draft

```
Just built an On-Chain Money Tracker for @BOTChain_ai Build Week Vol.2 💸

Connect your wallet → log any expense → it's saved forever on BOT Chain.
Public, permanent, verifiable. No database, 100% on-chain.

Try it: [your live link]
#BOTChain #BuildWeek
```
