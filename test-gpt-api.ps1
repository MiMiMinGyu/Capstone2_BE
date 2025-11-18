# GPT API 테스트 스크립트

Write-Host "=== Step 1: Login ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"test@mju.ac.kr","password":"test123"}'

$token = $loginResponse.accessToken
Write-Host "Token received: $($token.Substring(0, 50))..." -ForegroundColor Yellow

Write-Host "`n=== Step 2: Call GPT Generate ===" -ForegroundColor Green
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    userId = "5ffc7298-98c5-44d0-a62e-7a2ac180a64d"
    partnerId = "716d0ed5-c04e-4315-aa8c-05c5ade05b7e"
    message = "오늘 뭐해?"
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Cyan
Write-Host $body

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/gpt/generate" `
        -Method Post `
        -Headers $headers `
        -Body $body

    Write-Host "`n=== Success! ===" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "`n=== Error! ===" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error: $_"
}
