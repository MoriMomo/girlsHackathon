# girlsHackathon

Financial Tracker — log a single expense (typed or scanned via AI) with its amount, description, and date as a permanent, append-only record.

Built as a base to later connect to an EVM-compatible blockchain (see `contracts/MyCertificate.sol`).

## Stack

- Vite + React 18
- Tailwind CSS (via CDN)
- localStorage for persistence (isolated storage layer, swappable for blockchain later)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173/.

## Project structure

```
├── index.html                    Tailwind CDN + React root
├── src/
│   ├── main.jsx                  React entry
│   ├── App.jsx                   State + running total
│   ├── components/
│   │   ├── ExpenseForm.jsx       Manual entry + AI scan trigger + validation
│   │   └── ExpenseList.jsx       Append-only record display
│   └── lib/
│       ├── expenseStore.js       Storage layer (localStorage)
│       └── receiptScanner.js     AI receipt scan (stub)
└── contracts/
    └── MyCertificate.sol         Sample smart contract for future integration
```

## Roadmap

- Wire `src/lib/receiptScanner.js` to a real OCR / vision model
- Swap `src/lib/expenseStore.js` localStorage calls for smart-contract calls
