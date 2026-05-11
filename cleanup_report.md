# Cleanup Report — Code Dead Code & Orphan Scan

**Date:** 2025-01-01  
**Scope:** Full workspace (`fe/`, `fe-mobile/`, `be/`, `tests/`)  
**Criteria:**  
1. Boilerplate / scaffolded but unused  
2. Orphaned files (not imported/registered anywhere)  
3. Draft / versioned files (`_Phase3`, `_v2`, `_old`, `_backup`)  
4. Unused assets  
5. Dev-only scripts that don't belong in production source  
6. Empty directories  

---

## 1. Orphaned Source Files

Files that exist but are never imported or registered in any route, navigator, or other module.

| # | File | Reason |
|---|------|--------|
| 1 | `fe/src/lib/mockData.ts` | Zero imports across all of `fe/src/**`. Contains hardcoded 2023 mock arrays (`mockSubscriptions`, `mockWallets`, etc.). Pure dead weight. |
| 2 | `fe/src/pages/Subscriptions.tsx` | Not registered in `fe/src/routes/AppRoutes.tsx`. No `import … from '…Subscriptions'` anywhere in the project. Page is unreachable. |
| 3 | `fe/src/components/dashboard/AddWalletModal.tsx` | Only self-defines `AddWalletModal`. Zero external imports. A `CreateWalletModal.tsx` in the same folder provides this feature. |
| 4 | `fe-mobile/src/screens/AIAssistantScreen_Phase3.tsx` | Not registered in `RootNavigator.tsx`. Not imported anywhere. Superseded by `AIAssistantScreen.tsx`. |
| 5 | `fe-mobile/src/screens/PlaceholderScreen.tsx` | Not registered in `RootNavigator.tsx`. Not imported anywhere. |

---

## 2. Draft / Versioned Files

Files whose names explicitly signal an intermediate version.

| # | File | Reason |
|---|------|--------|
| 6 | `fe-mobile/src/screens/AIAssistantScreen_Phase3.tsx` | `_Phase3` suffix = development snapshot. Already listed above as orphaned. |

---

## 3. Dev-Only / Seeding Scripts in Source Tree

Files that serve only development setup and must not be bundled or deployed with production code.

| # | File | Reason |
|---|------|--------|
| 7 | `be/service-transaction/test.ts` | Ad-hoc seed/test script at service root. Seeds default categories via mongoose. Not part of any compiled service or test runner. |
| 8 | `be/seeds/seed.js` | Dev seed script. Not referenced by any `package.json` `scripts` in production services. |
| 9 | `be/seeds/seed-1year-data.ts` | Dev seed script for 1-year demo data. |
| 10 | `be/seeds/seed-5year-hihihi.js` | Dev seed script; informal name confirms dev-only status. |
| 11 | `be/seeds/seed-phase3.js` | Dev seed script for phase-3 data. |

> **Note:** `be/seeds/` as a directory is legitimate for dev purposes and should be kept, but excluded from Docker production builds (already handled by `.dockerignore` in each service). The seeds are listed here to flag them as non-production artifacts.

---

## 4. Empty Directories

| # | Path | Reason |
|---|------|--------|
| 12 | `fe/src/components/savings/` | Completely empty — no files. Likely a placeholder folder that was never populated. |

---

## 5. Unused Assets

All images in `fe/public/image/` (`cash-logo.png`, `momo-logo.png`, `zalopay-png.png`) are actively referenced in `fe/src/pages/Wallets.tsx` and `fe/src/components/dashboard/MyWallet.tsx`. **No orphaned assets found.**

---

## Summary Table

| ID | Path | Category | Safe to Delete |
|----|------|----------|---------------|
| 1 | `fe/src/lib/mockData.ts` | Orphaned file | YES |
| 2 | `fe/src/pages/Subscriptions.tsx` | Orphaned page | YES |
| 3 | `fe/src/components/dashboard/AddWalletModal.tsx` | Orphaned component | YES |
| 4 | `fe-mobile/src/screens/AIAssistantScreen_Phase3.tsx` | Draft + orphaned | YES |
| 5 | `fe-mobile/src/screens/PlaceholderScreen.tsx` | Orphaned screen | YES |
| 6 | `be/service-transaction/test.ts` | Dev-only script | YES (from production) |
| 7–11 | `be/seeds/*.{js,ts}` | Dev-only scripts | YES (from production) |
| 12 | `fe/src/components/savings/` (dir) | Empty directory | YES |

---

## Delete Script

```bash
#!/usr/bin/env bash
# cleanup-dead-code.sh
# Run from workspace root: bash cleanup-dead-code.sh
# Review each deletion carefully before executing.

set -e

echo "[1/8] Removing orphaned mockData..."
rm -f fe/src/lib/mockData.ts

echo "[2/8] Removing orphaned Subscriptions page..."
rm -f fe/src/pages/Subscriptions.tsx

echo "[3/8] Removing orphaned AddWalletModal..."
rm -f fe/src/components/dashboard/AddWalletModal.tsx

echo "[4/8] Removing draft AIAssistantScreen_Phase3..."
rm -f fe-mobile/src/screens/AIAssistantScreen_Phase3.tsx

echo "[5/8] Removing orphaned PlaceholderScreen..."
rm -f fe-mobile/src/screens/PlaceholderScreen.tsx

echo "[6/8] Removing dev-only service-transaction/test.ts..."
rm -f be/service-transaction/test.ts

echo "[7/8] Removing dev-only seed scripts..."
rm -f be/seeds/seed.js
rm -f be/seeds/seed-1year-data.ts
rm -f be/seeds/seed-5year-hihihi.js
rm -f be/seeds/seed-phase3.js
# Note: keep be/seeds/package.json and the seeds/ folder itself if you still run seeds locally

echo "[8/8] Removing empty savings component folder..."
rmdir fe/src/components/savings

echo "Done. All confirmed dead files removed."
```

### PowerShell equivalent (Windows)

```powershell
# cleanup-dead-code.ps1
# Run from workspace root: .\cleanup-dead-code.ps1

Remove-Item -Force fe\src\lib\mockData.ts
Remove-Item -Force fe\src\pages\Subscriptions.tsx
Remove-Item -Force fe\src\components\dashboard\AddWalletModal.tsx
Remove-Item -Force fe-mobile\src\screens\AIAssistantScreen_Phase3.tsx
Remove-Item -Force fe-mobile\src\screens\PlaceholderScreen.tsx
Remove-Item -Force be\service-transaction\test.ts
Remove-Item -Force be\seeds\seed.js
Remove-Item -Force be\seeds\seed-1year-data.ts
Remove-Item -Force be\seeds\seed-5year-hihihi.js
Remove-Item -Force be\seeds\seed-phase3.js
Remove-Item -Recurse -Force fe\src\components\savings

Write-Host "Done."
```

---

## Not Dead (verified)

The following were investigated and confirmed still in use:

| File | Evidence |
|------|----------|
| `fe/src/lib/utils.ts` | 20+ imports across the FE codebase |
| `fe/src/contexts/theme-context.tsx` | Imported by 7 files |
| `fe/src/store/useFinanceStore.ts` | Re-export shim used by `CreateWalletModal`, `CreateTransactionModal`, `CategoryManagerModal` |
| `fe/src/utils/formatters.js` | 1 active import in `CreateTransactionModal.tsx` (flag as tech debt: `.js` in TS project) |
| `fe-mobile/src/utils/demoData.ts` | `AI_SUGGESTED_QUESTIONS` still imported by `AIAssistantScreen.tsx` |
| `fe/public/image/*.png` | Referenced in `Wallets.tsx` and `MyWallet.tsx` |
| `be/ai-service/test/` | Contains test assets (`hoadon_bt.png`, `test-case-ai.md`) for OCR testing — dev-only but scoped to ai-service |
