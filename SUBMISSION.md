# Submission checklist — Build Week Hackathon Vol.2 (ledgr)

Deadline: **Thursday, Sep 25, 2026, 11:59 PM (Asia/Bangkok / GMT+7)**. Miss any item = not judged. No late submissions.

## The 7 required items
- [ ] 1. **Contract address** on BOT Chain, with real on-chain activity (testnet done; mainnet pending)
- [ ] 2. **Live website link** on a live domain (judges connect a wallet and use it)
- [ ] 3. **GitHub repo** with the `.sol` file + README **Deployment** section filled in (both addresses)
- [ ] 4. **X post** on a dedicated project account, tagging **@BOTChain_ai**, link pasted in the form
- [ ] 5. **Active X presence** — at least **5 valid posts in the 30 days** before submission (start now!)
- [ ] 6. **Mainnet launch announcement** — a write-up on your own site/media clearly stating ledgr is officially launched on BOT Chain Mainnet
- [ ] 7. **BOT Chain branding on-site** — footer shows the BOT Chain name/logo, linking to botchain.ai + the explorer ✅ (done in `Footer.jsx`)

## Most time-sensitive (do these first)
- **Message the organizer for mainnet BOT** (Telegram) — allocation can take time, and items 1, 2, 6 all depend on the mainnet deploy.
- **Start posting on X today** — item 5 needs *volume over 30 days*, not one post at the end.

## Go-live steps (in order)

1. **Deploy to testnet first** — DONE
   - `ExpenseTracker.sol` deployed on BOT Chain Testnet (968). Address is in `src/lib/chain.js`.

2. **Deploy to mainnet**
   - Get real BOT from the organizer (send your wallet address early).
   - Switch MetaMask to BOT Chain **Mainnet (677)**, deploy the same contract in Remix.
   - Copy the mainnet address. Set `ACTIVE_NETWORK = 'mainnet'` and paste the mainnet address in `src/lib/chain.js`.
   - Put BOTH addresses in the README Deployment table.

3. **Publish the frontend**
   - `npm run build`, deploy the `dist/` folder to GitHub Pages (repo -> Settings -> Pages).
   - Get a domain (free via the GitHub Student Pack — .TECH / Name.com — or a $1-1.50 one). Point it at Pages (Settings -> Pages -> Custom domain + DNS records). Keep any receipt for reimbursement.
   - When serving from the domain root, change `base` in `vite.config.js` back to `'/'` and rebuild.

4. **X post (item 4)** — post a screenshot/clip of the working page, tag **@BOTChain_ai**, paste the link in the form. This is Post 5 in the series below.

5. **Mainnet launch announcement (item 6)** — publish the launch write-up (see `LAUNCH.md`) on X/Medium/your site; the title or body must state ledgr is officially launched on BOT Chain Mainnet.

6. **Submit** all 7 items in the form before the deadline.

## X post series (5 posts, ~1/day, each tagging @BOTChain_ai)

**Post 1 — intro (pin)**
```
Introducing ledgr 🧾
An on-chain expense tracker built on @BOTChain_ai.
Log an expense → saved forever on the blockchain. Permanent, public, impossible to fake or edit.
Building it this week for #BuildWeek Vol.2 👇
```

**Post 2 — why on-chain**
```
Why put expenses on-chain?
A normal tracker can be quietly edited or deleted. ledgr can't.
Every entry is permanent and anyone can verify it — built for shared funds & transparent budgets.
Running on @BOTChain_ai 🔗
```

**Post 3 — build update (+ screenshot)**
```
ledgr is coming together 🛠️
✅ Connect wallet
✅ Log expense — amount, note & date
✅ Reads straight from the blockchain
✅ Clean 3-page app
Live on @BOTChain_ai testnet. Mainnet next 👀
```

**Post 4 — AI scan (+ clip/screenshot)**
```
The best part of ledgr 📷
Snap a receipt → AI reads the amount, merchant & date → one tap saves it on-chain.
No typing. Just proof.
Powered by @BOTChain_ai ⚡
```

**Post 5 — launch / submission (+ live link + contract link)**
```
ledgr is live 🚀
A tamper-proof expense tracker, deployed on @BOTChain_ai Mainnet.
Try it 👉 [live link]
Contract 👉 [explorer link]
Made for #BuildWeek Vol.2. On-chain, verifiable, done. 🧾
```
