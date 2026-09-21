// Blog posts, defined as data (no CMS, no backend — deploy-safe on static hosting).
// Add a post by adding an entry, newest first. `body` is an array of blocks;
// each block is { type: 'p' | 'h2' | 'ul', text?, items? } so the post page
// renders structured content without a markdown parser dependency.
//
// The launch-announcement post is the hackathon's required item #6.
// Fill in the mainnet address + live URL in that post after you deploy.

export const posts = [
  {
    slug: 'ledgr-launches-on-bot-chain-mainnet',
    title: 'ledgr is officially launched on BOT Chain Mainnet',
    date: '2026-09-22',
    excerpt:
      'ledgr — a tamper-proof, on-chain expense tracker with shared group ledgers — is now officially live on BOT Chain Mainnet.',
    body: [
      {
        type: 'p',
        text: 'Today we\u2019re announcing that ledgr is officially launched on BOT Chain Mainnet. What started as a Build Week project is now live on mainnet, with every expense written permanently and publicly to the chain.',
      },
      { type: 'h2', text: 'What ledgr does' },
      {
        type: 'p',
        text: 'ledgr is an expense tracker where records live on-chain instead of in a private database. Once an entry is saved, nobody \u2014 not even us \u2014 can quietly edit or delete it. That guarantee is the whole point.',
      },
      { type: 'ul', items: [
        'Log a personal expense (amount, description, date) permanently on-chain.',
        'Create a shared group ledger anyone can contribute to and independently verify.',
        'View any shared ledger from its link with no wallet required \u2014 just to look.',
        'Scan a receipt and let AI pre-fill the amount, date, and category.',
      ] },
      { type: 'h2', text: 'Now on Mainnet' },
      {
        type: 'p',
        text: 'ledgr is officially deployed on BOT Chain Mainnet (Chain ID 677). The contract and all activity are publicly verifiable on the BOT Chain explorer.',
      },
      { type: 'ul', items: [
        'Mainnet contract: 0x… (paste your mainnet address here after deploy)',
        'Live app: https://… (paste your live domain here)',
        'Network: BOT Chain Mainnet, Chain ID 677',
      ] },
      { type: 'h2', text: 'Why on-chain' },
      {
        type: 'p',
        text: 'A normal expense app can be edited or deleted without a trace. ledgr delegates record-keeping to an EVM smart contract, producing an immutable audit trail tied to cryptographic signatures \u2014 built for shared funds, team budgets, and any spending that has to stay trustworthy after the fact.',
      },
      {
        type: 'p',
        text: 'Built for Girl Meets Tech Build Week Vol.2, on BOT Chain.',
      },
    ],
  },

  {
    slug: 'why-put-expenses-on-chain',
    title: 'Why put expenses on a blockchain at all?',
    date: '2026-09-20',
    excerpt:
      'A spreadsheet is free and instant. So why does an expense tracker need a blockchain? The answer is about trust, not storage.',
    body: [
      {
        type: 'p',
        text: 'It\u2019s a fair question, and one we asked ourselves: a normal expense app is free, fast, and private. Putting expenses on-chain costs a small gas fee per entry. So why do it?',
      },
      { type: 'h2', text: 'Because a spreadsheet can be quietly changed' },
      {
        type: 'p',
        text: 'The moment more than one person shares a record \u2014 roommates splitting rent, a club treasurer, a trip fund \u2014 the question stops being \u201cwhere is it stored\u201d and becomes \u201ccan I trust that nobody edited it.\u201d A private spreadsheet has no answer to that. An on-chain ledger does: every entry is permanent, timestamped, and signed by the wallet that made it.',
      },
      { type: 'h2', text: 'Where ledger fits' },
      {
        type: 'p',
        text: 'ledgr isn\u2019t trying to replace your budgeting app for logging coffee. It\u2019s for the cases where the record has to be verifiable by people who don\u2019t fully trust each other \u2014 and where \u201canyone can check it themselves\u201d is worth a few cents of gas.',
      },
    ],
  },

  {
    slug: 'build-notes-shared-ledgers-and-ai-receipts',
    title: 'Build notes: shared ledgers, AI receipts, and no backend',
    date: '2026-09-19',
    excerpt:
      'A look under the hood at how ledgr works with zero backend — group ledgers, receipt scanning, and reconstructing everything from on-chain events.',
    body: [
      {
        type: 'p',
        text: 'ledgr has no server and no database. The smart contract is the backend. Here\u2019s how the main features work within that constraint.',
      },
      { type: 'h2', text: 'Shared group ledgers' },
      {
        type: 'p',
        text: 'Anyone can create a shared ledger with a unique id, and any wallet can contribute expenses to it. Because each entry records which wallet logged it, the \u201cwho contributed what\u201d breakdown is computed client-side and independently verifiable \u2014 no trusted middleman.',
      },
      { type: 'h2', text: 'Finding your ledgers without a database' },
      {
        type: 'p',
        text: 'Since there\u2019s no server to remember which ledgers you created, ledgr reconstructs that list from the contract\u2019s own GroupCreated events. Open the app on a fresh device and your ledgers are still there \u2014 read straight from the chain.',
      },
      { type: 'h2', text: 'AI receipt scanning' },
      {
        type: 'p',
        text: 'Snap a receipt and a vision model extracts the amount, date, and category to pre-fill the form. You review it before signing \u2014 the AI only speeds up entry, it never writes to the chain on its own.',
      },
    ],
  },
]

export function getPost(slug) {
  return posts.find((p) => p.slug === slug) || null
}
