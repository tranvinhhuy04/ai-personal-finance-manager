# API Live Test - hihihi@gmail.com
$BASE = "http://localhost:3000/api/v1"
$AI_BASE = "http://localhost:8000/api/v1"

# Step 1: Login
Write-Host "`n=== LOGIN ===" -ForegroundColor Yellow
$resp = Invoke-RestMethod -Method POST -Uri "$BASE/auth/login" -ContentType "application/json; charset=utf-8" -Body '{"email":"hihihi@gmail.com","password":"12345678"}'
$h = @{ Authorization = "Bearer $($resp.accessToken)" }
Write-Host "OK - userId=$($resp.user.userId) name=$($resp.user.fullName)"

# Step 2: Wallets
Write-Host "`n=== WALLETS ===" -ForegroundColor Yellow
$wallets = Invoke-RestMethod -Uri "$BASE/wallets" -Headers $h
foreach ($w in $wallets) {
    Write-Host "  [$($w.wallet_type)] $($w.wallet_name) => balance=$($w.balance) id=$($w.id)"
}
$mainWalletId = $wallets[0].id

# Step 3: Analytics - MONTH
Write-Host "`n=== ANALYTICS: MONTH ===" -ForegroundColor Yellow
$m = Invoke-RestMethod -Uri "$BASE/analytics/dashboard?range=month" -Headers $h
Write-Host "Period: $($m.period.label) | $($m.period.startDate) -> $($m.period.endDate)"
Write-Host "Income: $($m.summary.totalIncome) | Expense: $($m.summary.totalExpense) | Net: $($m.summary.net)"
Write-Host "KPIs: dailyAvg=$($m.kpis.dailyAverageExpense) recurring=$($m.kpis.recurringSpend) savings=$($m.kpis.savingsRate) txCount=$($m.kpis.transactionCount)"
Write-Host "Insights: [$($m.insights.severity)] $($m.insights.headline)"
Write-Host "Breakdown count: $($m.breakdown.Count) | Subscriptions: $($m.subscriptions.Count)"
Write-Host "  Subscriptions:"
foreach ($s in $m.subscriptions) { Write-Host "    $($s.name) - $($s.amount) [$($s.status)]" }

# Step 4: Analytics - QUARTER
Write-Host "`n=== ANALYTICS: QUARTER ===" -ForegroundColor Yellow
$q = Invoke-RestMethod -Uri "$BASE/analytics/dashboard?range=quarter" -Headers $h
Write-Host "Period: $($q.period.label) | $($q.period.startDate) -> $($q.period.endDate)"
Write-Host "Income: $($q.summary.totalIncome) | Expense: $($q.summary.totalExpense) | Net: $($q.summary.net)"
Write-Host "KPIs: dailyAvg=$($q.kpis.dailyAverageExpense) recurring=$($q.kpis.recurringSpend)"
Write-Host "Insights: [$($q.insights.severity)] $($q.insights.headline)"

# Step 5: Analytics - YEAR
Write-Host "`n=== ANALYTICS: YEAR ===" -ForegroundColor Yellow
$y = Invoke-RestMethod -Uri "$BASE/analytics/dashboard?range=year" -Headers $h
Write-Host "Period: $($y.period.label) | $($y.period.startDate) -> $($y.period.endDate)"
Write-Host "Income: $($y.summary.totalIncome) | Expense: $($y.summary.totalExpense) | Net: $($y.summary.net)"
Write-Host "KPIs: dailyAvg=$($y.kpis.dailyAverageExpense) recurring=$($y.kpis.recurringSpend)"
Write-Host "Insights: [$($y.insights.severity)] $($y.insights.headline)"

# Step 6: Analytics - CUSTOM
Write-Host "`n=== ANALYTICS: CUSTOM (2025-01-01 to 2025-12-31) ===" -ForegroundColor Yellow
$cu = Invoke-RestMethod -Uri "$BASE/analytics/dashboard?range=custom&from=2025-01-01&to=2025-12-31" -Headers $h
Write-Host "Period: $($cu.period.label) | $($cu.period.startDate) -> $($cu.period.endDate)"
Write-Host "Income: $($cu.summary.totalIncome) | Expense: $($cu.summary.totalExpense) | Net: $($cu.summary.net)"
Write-Host "KPIs: dailyAvg=$($cu.kpis.dailyAverageExpense)"
Write-Host "Trend months: $($cu.trend.Count)"

# Step 7: Transactions (last 10)
Write-Host "`n=== TRANSACTIONS (last 10) ===" -ForegroundColor Yellow
$tx = Invoke-RestMethod -Uri "$BASE/transactions?limit=10&page=1" -Headers $h
if ($tx.data) {
    Write-Host "Total: $($tx.total) | Page: $($tx.page)"
    foreach ($t in $tx.data | Select-Object -First 5) {
        $dt = if ($t.created_at) { $t.created_at } elseif ($t.date) { $t.date } else { $t.createdAt }
        $desc = if ($t.merchant_name) { $t.merchant_name } else { $t.description }
        Write-Host "  $dt | $($t.transaction_type) $($t.amount) - $desc"
    }
} elseif ($tx.transactions) {
    foreach ($t in $tx.transactions | Select-Object -First 5) {
        $dt = if ($t.created_at) { $t.created_at } elseif ($t.date) { $t.date } else { $t.createdAt }
        $desc = if ($t.merchant_name) { $t.merchant_name } else { $t.description }
        Write-Host "  $dt | $($t.transaction_type) $($t.amount) - $desc"
    }
} else {
    $tx | ConvertTo-Json -Depth 3 | Select-Object -First 30
}

# Step 8: AI Chat
Write-Host "`n=== AI CHAT ===" -ForegroundColor Yellow
try {
    $aiBody = '{"message":"Tháng này tôi tiêu bao nhiêu tiền? Tổng chi tiêu của tôi là bao nhiêu?","use_llm":true}'
    $aiResp = Invoke-RestMethod -Method POST -Uri "$AI_BASE/ai/chat" -ContentType "application/json; charset=utf-8" -Body $aiBody -Headers $h
    $aiAnswer = if ($aiResp.answer) { $aiResp.answer } elseif ($aiResp.response) { $aiResp.response } else { $aiResp | ConvertTo-Json -Depth 2 }
    Write-Host "AI answer: $aiAnswer"
} catch {
    Write-Host "AI Chat error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Analytics with specific wallet
Write-Host "`n=== ANALYTICS: by walletId=$mainWalletId ===" -ForegroundColor Yellow
$wdash = Invoke-RestMethod -Uri "$BASE/analytics/dashboard?range=month&wallet_id=$mainWalletId" -Headers $h
Write-Host "Wallet filter: Income=$($wdash.summary.totalIncome) Expense=$($wdash.summary.totalExpense)"

Write-Host "`n=== ALL TESTS DONE ===" -ForegroundColor Green
