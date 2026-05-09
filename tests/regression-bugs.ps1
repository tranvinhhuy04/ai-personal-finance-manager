Set-Location "$PSScriptRoot\.."

function Req($method, $url, $body = $null, $headers = @{}) {
  try {
    if ($null -ne $body) {
      $r = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body -ErrorAction Stop
      return [pscustomobject]@{ code = 200; body = $r }
    }

    $r = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ErrorAction Stop
    return [pscustomobject]@{ code = 200; body = $r }
  } catch {
    $code = try { [int]$_.Exception.Response.StatusCode } catch { 0 }
    $raw = try { (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { '' }
    $json = try { $raw | ConvertFrom-Json } catch { $raw }
    return [pscustomobject]@{ code = $code; body = $json }
  }
}

$base = 'http://localhost:3000/api/v1'
$login = Req 'POST' "$base/auth/login" '{"email":"hihihi@gmail.com","password":"12345678"}'
$token = $login.body.accessToken
$h = @{ Authorization = "Bearer $token" }

$r5 = Req 'POST' "$base/auth/login" '{"email":"hihihigmail.com","password":"12345678"}'
$r13 = Req 'POST' "$base/auth/register" '{"email":"invalid-email-no-at","password":"12345678","fullName":"bad email"}'
$r55 = Req 'POST' "$base/transactions" '{"wallet_id":"000000000000000000000001","category_id":"69f0880eec2d16af414e2f15","amount":1000,"transaction_type":"EXPENSE"}' $h
$r67 = Req 'GET' "$base/transactions?limit=201" $null $h
$r71 = Req 'GET' "$base/transactions?wallet_id=000000000000000000000001" $null $h
$r127 = Req 'POST' "$base/savings/000000000000000000000001/settle" '{"settle_type":"FULL"}' $h
$r154 = Req 'GET' "$base/analytics/dashboard?month=abcdef" $null $h
$r159 = Req 'GET' "$base/analytics/dashboard?range=custom" $null $h
$r176 = Req 'POST' "$base/ai/extract-text" '{"input_text":"hi"}' $h
$long = 'x' * 5000
$r178 = Req 'POST' "$base/ai/extract-text" ('{"input_text":"' + $long + '"}') $h
$r199 = Req 'DELETE' "$base/auth/settings/api-keys/999" $null $h
$r230 = Req 'POST' "$base/wallets" '{"wallet_type":"CASH","wallet_name":"<script>alert(1)</script>","balance":0}' $h
$name230 = try { $r230.body.wallet_name } catch { '' }
$bigBody = '{"wallet_type":"CASH","wallet_name":"' + ('A' * 1100000) + '","balance":0}'
$r232 = Req 'POST' "$base/wallets" $bigBody $h

$codes = @()
1..11 | ForEach-Object {
  $rbf = Req 'POST' "$base/auth/login" '{"email":"hihihi@gmail.com","password":"wrongpassword"}'
  $codes += $rbf.code
}

Write-Output "TC5=$($r5.code)"
Write-Output "TC13=$($r13.code)"
Write-Output "TC55=$($r55.code)"
Write-Output "TC67=$($r67.code)"
Write-Output "TC71=$($r71.code)|count=$((@($r71.body)).Count)"
Write-Output "TC127=$($r127.code)"
Write-Output "TC154=$($r154.code)"
Write-Output "TC159=$($r159.code)"
Write-Output "TC176=$($r176.code)"
Write-Output "TC178=$($r178.code)"
Write-Output "TC199=$($r199.code)"
Write-Output "TC230=$($r230.code)|name=$name230"
Write-Output "TC232=$($r232.code)"
Write-Output "TC233=$($codes -join ',')"
