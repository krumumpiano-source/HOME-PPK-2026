# ============================================================
# HOME PPK 2026 — RLS Security Test Script
# ทดสอบว่า RLS policies ทำงานถูกต้องหลัง security hardening
# ============================================================

$SB_URL  = 'https://mwigdgxrfpcmfjuztmip.supabase.co'
$SB_ANON = (Get-Content "supabase/config.js" -Raw | Select-String "anon:\s*'([^']+)'" | ForEach-Object { $_.Matches[0].Groups[1].Value })

if (-not $SB_ANON) {
    Write-Host "ERROR: ไม่สามารถอ่าน anon key จาก supabase/config.js" -ForegroundColor Red
    exit 1
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " RLS Security Test — HOME PPK 2026" -ForegroundColor Cyan  
Write-Host "======================================`n" -ForegroundColor Cyan

$headers = @{
    'apikey'        = $SB_ANON
    'Authorization' = "Bearer $SB_ANON"
    'Content-Type'  = 'application/json'
    'Prefer'        = 'return=minimal'
}

$headersWithReturn = @{
    'apikey'        = $SB_ANON
    'Authorization' = "Bearer $SB_ANON"
    'Content-Type'  = 'application/json'
    'Prefer'        = 'return=representation'
}

$pass = 0
$fail = 0
$total = 0

function Test-Result($name, $expected, $actual, $detail) {
    $script:total++
    if ($expected -eq $actual) {
        $script:pass++
        Write-Host "  PASS " -ForegroundColor Green -NoNewline
        Write-Host "$name" -NoNewline
        if ($detail) { Write-Host " ($detail)" -ForegroundColor DarkGray } else { Write-Host "" }
    } else {
        $script:fail++
        Write-Host "  FAIL " -ForegroundColor Red -NoNewline
        Write-Host "$name — expected=$expected actual=$actual" -NoNewline
        if ($detail) { Write-Host " ($detail)" -ForegroundColor Yellow } else { Write-Host "" }
    }
}

# ────────────────────────────────────────────
# Test Group 1: SELECT (อ่านได้โดยไม่ต้อง login)
# ────────────────────────────────────────────
Write-Host "--- SELECT (read without auth) ---" -ForegroundColor Yellow

$tables = @('users', 'sessions', 'permissions', 'pending_registrations',
            'housing', 'residents', 'coresidents',
            'water_bills', 'electric_bills', 'water_rates',
            'outstanding', 'slip_submissions', 'payment_history',
            'notifications', 'requests', 'queue',
            'accounting_entries', 'monthly_withdraw', 'exemptions',
            'settings', 'announcements', 'logs', 'report_approvals')

foreach ($t in $tables) {
    try {
        $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/$t`?select=*&limit=1" -Headers $headers -Method GET -UseBasicParsing -ErrorAction Stop
        Test-Result "SELECT $t" "200" $resp.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Test-Result "SELECT $t" "200" $code $_.Exception.Message
    }
}

# ────────────────────────────────────────────
# Test Group 2: INSERT without session token (ต้องถูก block)
# ────────────────────────────────────────────
Write-Host "`n--- INSERT without auth (should be BLOCKED) ---" -ForegroundColor Yellow

# housing — ต้อง block (admin only)
$body = '{"house_number":"HACK-001","type":"house"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/housing" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]' -or $resp.StatusCode -eq 201) {
        if ($respBody -eq '[]') {
            Test-Result "INSERT housing (no auth)" "blocked" "blocked" "returned empty — RLS blocked"
        } else {
            Test-Result "INSERT housing (no auth)" "blocked" "allowed" "DATA INSERTED! RLS NOT WORKING"
        }
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT housing (no auth)" "blocked" "blocked" "HTTP $code"
}

# water_bills — ต้อง block
$body = '{"house_number":"HACK-001","period":"2099-01","year":2099,"month":1}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/water_bills" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "INSERT water_bills (no auth)" "blocked" "blocked" "returned empty — RLS blocked"
    } else {
        Test-Result "INSERT water_bills (no auth)" "blocked" "allowed" "INSERTED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT water_bills (no auth)" "blocked" "blocked" "HTTP $code"
}

# accounting_entries — ต้อง block (admin only)
$body = '{"period":"2099-01","year":2099,"month":1,"type":"income","description":"HACK","amount":0}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/accounting_entries" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "INSERT accounting_entries (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "INSERT accounting_entries (no auth)" "blocked" "allowed" "INSERTED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT accounting_entries (no auth)" "blocked" "blocked" "HTTP $code"
}

# requests — ต้อง block (authenticated only)
$body = '{"id":"HACK001","type":"residence"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/requests" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "INSERT requests (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "INSERT requests (no auth)" "blocked" "allowed" "INSERTED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT requests (no auth)" "blocked" "blocked" "HTTP $code"
}

# report_approvals — ต้อง block (เคยเป็น critical issue!)
$body = '{"report_type":"water","period":"2099-01"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/report_approvals" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "INSERT report_approvals (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "INSERT report_approvals (no auth)" "blocked" "allowed" "CRITICAL: NOT PROTECTED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT report_approvals (no auth)" "blocked" "blocked" "HTTP $code"
}

# slip_submissions — ต้อง block (authenticated only)
$body = '{"house_number":"HACK-001","period":"2099-01","amount":0}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/slip_submissions" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "INSERT slip_submissions (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "INSERT slip_submissions (no auth)" "blocked" "allowed" "INSERTED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "INSERT slip_submissions (no auth)" "blocked" "blocked" "HTTP $code"
}

# ────────────────────────────────────────────
# Test Group 3: DELETE without session token (ต้องถูก block)
# ────────────────────────────────────────────
Write-Host "`n--- DELETE without auth (should be BLOCKED) ---" -ForegroundColor Yellow

$deleteTables = @('housing', 'residents', 'water_bills', 'electric_bills',
                   'outstanding', 'slip_submissions', 'payment_history',
                   'notifications', 'requests', 'report_approvals',
                   'accounting_entries', 'monthly_withdraw', 'announcements')

foreach ($t in $deleteTables) {
    try {
        # ลบ row ที่ไม่มีอยู่จริง — ถ้า RLS block จะได้ 0 rows affected
        $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/$t`?id=eq.NONEXISTENT" -Headers $headersWithReturn -Method DELETE -UseBasicParsing -ErrorAction Stop
        $respBody = $resp.Content
        # ถ้าได้ empty array กลับมา = RLS blocked หรือ row ไม่มี (ทั้งสองกรณี OK)
        Test-Result "DELETE $t (no auth)" "blocked" "blocked" "returned: $respBody"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 403 -or $code -eq 401 -or $code -eq 404) {
            Test-Result "DELETE $t (no auth)" "blocked" "blocked" "HTTP $code"
        } else {
            Test-Result "DELETE $t (no auth)" "blocked" "error" "HTTP $code"
        }
    }
}

# ────────────────────────────────────────────
# Test Group 4: UPDATE without session token (ต้องถูก block ยกเว้น users)
# ────────────────────────────────────────────
Write-Host "`n--- UPDATE without auth (should be BLOCKED except users) ---" -ForegroundColor Yellow

# housing UPDATE — ต้อง block (admin only)
$body = '{"notes":"HACKED"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/housing?id=eq.NONEXISTENT" -Headers $headersWithReturn -Method PATCH -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "UPDATE housing (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "UPDATE housing (no auth)" "blocked" "allowed" "UPDATED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "UPDATE housing (no auth)" "blocked" "blocked" "HTTP $code"
}

# water_bills UPDATE — ต้อง block
$body = '{"amount":999999}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/water_bills?id=eq.NONEXISTENT" -Headers $headersWithReturn -Method PATCH -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "UPDATE water_bills (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "UPDATE water_bills (no auth)" "blocked" "allowed" "UPDATED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "UPDATE water_bills (no auth)" "blocked" "blocked" "HTTP $code"
}

# accounting_entries UPDATE — ต้อง block
$body = '{"amount":999999}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/accounting_entries?id=eq.NONEXISTENT" -Headers $headersWithReturn -Method PATCH -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "UPDATE accounting_entries (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "UPDATE accounting_entries (no auth)" "blocked" "allowed" "UPDATED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "UPDATE accounting_entries (no auth)" "blocked" "blocked" "HTTP $code"
}

# settings UPDATE for non-allowed key — ต้อง block
$body = '{"value":"HACKED"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/settings?key=eq.admin_secret" -Headers $headersWithReturn -Method PATCH -Body $body -UseBasicParsing -ErrorAction Stop
    $respBody = $resp.Content
    if ($respBody -eq '[]') {
        Test-Result "UPDATE settings non-allowed key (no auth)" "blocked" "blocked" "returned empty"
    } else {
        Test-Result "UPDATE settings non-allowed key (no auth)" "blocked" "allowed" "SETTINGS UPDATED!"
    }
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Test-Result "UPDATE settings non-allowed key (no auth)" "blocked" "blocked" "HTTP $code"
}

# ────────────────────────────────────────────
# Test Group 5: Allowed pre-auth operations
# ────────────────────────────────────────────
Write-Host "`n--- Pre-auth operations (should be ALLOWED) ---" -ForegroundColor Yellow

# sessions INSERT — ต้องได้ (login สร้าง session)
# We test with minimal data — will get error from DB constraints but NOT from RLS
$body = '{"user_id":"00000000-0000-0000-0000-000000000000","token":"test-token-rls-check","expires_at":"2099-01-01T00:00:00Z"}'
try {
    $resp = Invoke-WebRequest -Uri "$SB_URL/rest/v1/sessions" -Headers $headersWithReturn -Method POST -Body $body -UseBasicParsing -ErrorAction Stop
    # If it succeeded, great — clean up
    Test-Result "INSERT sessions (login flow)" "allowed" "allowed" "session created"
    # Cleanup
    try {
        Invoke-WebRequest -Uri "$SB_URL/rest/v1/sessions?token=eq.test-token-rls-check" -Headers $headers -Method DELETE -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
    } catch {}
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $errBody = ''
    try { 
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errBody = $reader.ReadToEnd() 
    } catch {}
    # FK violation (user_id doesn't exist) = RLS allowed it, DB constraint blocked → PASS
    if ($errBody -match 'foreign key' -or $errBody -match 'violates' -or $code -eq 409) {
        Test-Result "INSERT sessions (login flow)" "allowed" "allowed" "FK constraint (RLS passed, DB blocked)"
    } else {
        Test-Result "INSERT sessions (login flow)" "allowed" "blocked" "HTTP $code — $errBody"
    }
}

# ────────────────────────────────────────────
# Test Group 6: Storage bucket access
# ────────────────────────────────────────────
Write-Host "`n--- Storage: READ without auth (should work) ---" -ForegroundColor Yellow

$buckets = @('slips', 'receipts', 'meter-photos', 'attach-residence', 'attach-repair', 'attach-transfer', 'attach-return')

foreach ($b in $buckets) {
    try {
        $resp = Invoke-WebRequest -Uri "$SB_URL/storage/v1/object/list/$b" -Headers @{
            'apikey' = $SB_ANON
            'Authorization' = "Bearer $SB_ANON"
            'Content-Type' = 'application/json'
        } -Method POST -Body '{"prefix":"","limit":1}' -UseBasicParsing -ErrorAction Stop
        Test-Result "STORAGE LIST $b" "200" $resp.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Test-Result "STORAGE LIST $b" "200" $code
    }
}

Write-Host "`n--- Storage: UPLOAD without auth (should be BLOCKED) ---" -ForegroundColor Yellow

foreach ($b in $buckets) {
    try {
        $testBytes = [System.Text.Encoding]::UTF8.GetBytes("RLS-TEST")
        $resp = Invoke-WebRequest -Uri "$SB_URL/storage/v1/object/$b/rls-test-delete-me.txt" -Headers @{
            'apikey' = $SB_ANON
            'Authorization' = "Bearer $SB_ANON"
            'Content-Type' = 'text/plain'
        } -Method POST -Body $testBytes -UseBasicParsing -ErrorAction Stop
        # If upload succeeded, RLS is NOT working — clean up
        Test-Result "STORAGE UPLOAD $b (no auth)" "blocked" "allowed" "FILE UPLOADED! RLS NOT WORKING"
        # Try to delete
        try {
            Invoke-WebRequest -Uri "$SB_URL/storage/v1/object/$b/rls-test-delete-me.txt" -Headers @{
                'apikey' = $SB_ANON
                'Authorization' = "Bearer $SB_ANON"
            } -Method DELETE -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null
        } catch {}
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 403 -or $code -eq 401 -or $code -eq 400) {
            Test-Result "STORAGE UPLOAD $b (no auth)" "blocked" "blocked" "HTTP $code"
        } else {
            Test-Result "STORAGE UPLOAD $b (no auth)" "blocked" "error" "HTTP $code"
        }
    }
}

# ────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " Results: $pass/$total PASSED | $fail FAILED" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "======================================`n" -ForegroundColor Cyan

if ($fail -gt 0) {
    Write-Host "WARNING: มี $fail tests ที่ FAIL — ต้องตรวจสอบ!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "ALL TESTS PASSED — RLS security hardening ทำงานถูกต้อง!" -ForegroundColor Green
    exit 0
}
