# Learnings & Mistakes to Avoid

## From Audit (2026-02-07)

### Contract
- Never leave test/debug functions (like `testDraw()`) in production contracts
- Always add access control to Chainlink Automation's `performUpkeep()`
- VRF callback gas limits must account for worst-case entry counts
- Unbounded arrays are a DoS vector in smart contracts
- Always add Pausable to contracts handling user funds
- Comments must match code (0.01% vs 0.07% cap mismatch found)
- Don't store data you never read (Entry.blockNumber wastes 20k gas per entry)

### Frontend
- Never hardcode chain IDs - always derive from connected chain
- Consolidate duplicate utility functions into a single canonical source
- useEffect hooks MUST have proper dependency arrays
- Approval → action flows should auto-chain, not require separate clicks
- Event ABIs should be imported from one source, not defined inline in each component
- WalletConnect project IDs must be real for production

### Process
- Run full audit before any mainnet deployment
- Create spec files before implementing features
- Keep docs/notes/ updated after every major change session
- Development scripts (let-me-win.js, test-draw.js) should never be committed to main branch
- Files added to .gitignore after being committed need `git rm --cached`
