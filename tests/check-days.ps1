$mExp = 151913232; $mAvg = 5063774
$qExp = 181866379; $qAvg = 6062213
$yExp = 256293403; $yAvg = 8543113
$cuExp = 288270891; $cuAvg = 9609030

$mDays = [System.Math]::Round($mExp / $mAvg, 1)
$qDays = [System.Math]::Round($qExp / $qAvg, 1)
$yDays = [System.Math]::Round($yExp / $yAvg, 1)
$cuDays = [System.Math]::Round($cuExp / $cuAvg, 1)

Write-Host "MONTH   implied days: $mDays  (expected 31 if fixed, 30 if not)"
Write-Host "QUARTER implied days: $qDays  (expected 91 if fixed, 30 if not)"
Write-Host "YEAR    implied days: $yDays  (expected 365 if fixed, 30 if not)"
Write-Host "CUSTOM  implied days: $cuDays (expected 365 if fixed, 30 if not)"

if ($mDays -eq 30 -and $qDays -eq 30 -and $yDays -eq 30) {
    Write-Host "`n[BUG] periodDays fix NOT applied - container not rebuilt!" -ForegroundColor Red
} else {
    Write-Host "`n[OK] periodDays fix is active" -ForegroundColor Green
}
