[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$BASE = "http://localhost:3000/api/v1"
$AI_BASE = "http://localhost:8000/api/v1"

$resp = Invoke-RestMethod -Method POST -Uri "$BASE/auth/login" -ContentType "application/json; charset=utf-8" -Body '{"email":"hihihi@gmail.com","password":"12345678"}'
$h = @{ Authorization = "Bearer $($resp.accessToken)" }

# Transactions - inspect raw structure
Write-Host "=== TRANSACTIONS RAW ===" -ForegroundColor Cyan
$tx = Invoke-RestMethod -Uri "$BASE/transactions?limit=5&page=1" -Headers $h
$txJson = $tx | ConvertTo-Json -Depth 4
Write-Host $txJson

# AI Chat with UTF-8
Write-Host "`n=== AI CHAT (UTF-8) ===" -ForegroundColor Cyan
$aiBody = [System.Text.Encoding]::UTF8.GetBytes('{"message":"Tháng này tôi tiêu bao nhiêu tiền?","use_llm":false}')
$aiResp = Invoke-WebRequest -Method POST -Uri "$AI_BASE/ai/chat" -ContentType "application/json; charset=utf-8" -Body $aiBody -Headers $h
$aiText = [System.Text.Encoding]::UTF8.GetString($aiResp.Content)
Write-Host "Status: $($aiResp.StatusCode)"
Write-Host "Answer: $aiText"
