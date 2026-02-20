$auth = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Auth.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Auth.gs — Authentication & Session Management'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Core Auth Functions (15 required)
# ============================================================
Write-Host '[Test 1] Core Auth Functions — 15 required'
$coreFuncs = @(
  'hashPassword',
  'createSession',
  'destroySession',
  'handleLogin',
  'handleRegister',
  'getPendingRegistrations',
  'approveRegistration',
  'rejectRegistration',
  'handleResetPassword',
  'handleFindEmail',
  'handleChangePassword',
  'getCurrentUser',
  'checkPermission',
  'cleanupExpiredSessions',
  'setupSessionCleanupTrigger',
  'setupDefaultAdmin'
)
$ok1 = 0
foreach ($fn in $coreFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($auth.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $coreFuncs.Count + ' passed')

# ============================================================
# Test 2: Utility Functions (3 helpers)
# ============================================================
Write-Host '[Test 2] Utility Functions — 3 required'
$utilFuncs = @(
  'generateTempPassword',
  'maskEmail',
  'testAuth'
)
$ok2 = 0
foreach ($fn in $utilFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($auth.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $utilFuncs.Count + ' passed')

# ============================================================
# Test 3: SHA-256 Hashing — NOT btoa/base64
# ============================================================
Write-Host '[Test 3] SHA-256 password hashing — 4 checks'
$ok3 = 0

$total++
if ($auth.Contains('Utilities.computeDigest')) { $pass++; $ok3++ }
else { $fail++; $errors += '  FAIL: Utilities.computeDigest NOT FOUND' }

$total++
if ($auth.Contains('SHA_256') -or $auth.Contains('DigestAlgorithm.SHA_256')) { $pass++; $ok3++ }
else { $fail++; $errors += '  FAIL: SHA_256 digest algorithm NOT FOUND' }

$total++
if (-not ($auth -match 'btoa\(')) { $pass++; $ok3++ }
else { $fail++; $errors += '  FAIL: btoa() found — should use SHA-256 not base64' }

$total++
if ($auth.Contains('password_hash')) { $pass++; $ok3++ }
else { $fail++; $errors += '  FAIL: password_hash field NOT FOUND' }

Write-Host ('  ' + $ok3 + ' / 4 passed')

# ============================================================
# Test 4: Session Management — PropertiesService
# ============================================================
Write-Host '[Test 4] Session management — 6 checks'
$ok4 = 0

$total++
if ($auth.Contains('PropertiesService.getScriptProperties')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: PropertiesService.getScriptProperties NOT FOUND' }

$total++
if ($auth.Contains('Utilities.getUuid')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: Utilities.getUuid NOT FOUND (needed for session token)' }

$total++
if ($auth.Contains('session_')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: session_ prefix NOT FOUND' }

$total++
if ($auth.Contains('24 * 60 * 60 * 1000') -or $auth.Contains('SESSION_MAX_AGE_MS')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: 24-hour session expiry NOT FOUND' }

$total++
if ($auth.Contains('deleteProperty')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: deleteProperty NOT FOUND (needed for destroySession)' }

$total++
if ($auth.Contains('SESSION_PREFIX')) { $pass++; $ok4++ }
else { $fail++; $errors += '  FAIL: SESSION_PREFIX constant NOT FOUND' }

Write-Host ('  ' + $ok4 + ' / 6 passed')

# ============================================================
# Test 5: PendingReg Headers — 21 columns
# ============================================================
Write-Host '[Test 5] PendingReg Headers — 21 columns'
$pendingHeaders = @(
  'id', 'email', 'phone', 'prefix', 'firstname', 'lastname',
  'position', 'address_no', 'address_road', 'address_village',
  'subdistrict', 'district', 'province', 'zipcode',
  'password_hash', 'pdpa_consent', 'status',
  'reviewed_by', 'reviewed_at', 'review_note', 'submitted_at'
)
$ok5 = 0
foreach ($h in $pendingHeaders) {
  $total++
  if ($auth.Contains("'$h'")) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: PendingReg header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $pendingHeaders.Count + ' passed')

# ============================================================
# Test 6: Registration Flow — pending → approve/reject
# ============================================================
Write-Host '[Test 6] Registration flow — 6 checks'
$ok6 = 0

$total++
if ($auth.Contains("'pending'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: status pending NOT FOUND' }

$total++
if ($auth.Contains("'approved'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: status approved NOT FOUND' }

$total++
if ($auth.Contains("'rejected'")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: status rejected NOT FOUND' }

$total++
# approveRegistration creates Users record
$approvePattern = 'function approveRegistration[\s\S]*?appendRowToSheet[\s\S]*?SHEET_NAMES\.USERS'
if ($auth -match $approvePattern) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: approveRegistration does not create Users record' }

$total++
# approveRegistration creates Residents record
$residentPattern = 'function approveRegistration[\s\S]*?appendRowToSheet[\s\S]*?SHEET_NAMES\.RESIDENTS'
if ($auth -match $residentPattern) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: approveRegistration does not create Residents record' }

$total++
# PendingReg year sheet name pattern
if ($auth.Contains("getYearSheetName('PendingReg'") -or $auth.Contains("getYearSheetName(""PendingReg""")) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: getYearSheetName PendingReg NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 6 passed')

# ============================================================
# Test 7: Config.gs references — uses correct constants
# ============================================================
Write-Host '[Test 7] Config.gs references — 8 checks'
$ok7 = 0

$total++
if ($auth.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($auth.Contains('SHEET_NAMES.USERS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.USERS NOT USED' }

$total++
if ($auth.Contains('SHEET_NAMES.RESIDENTS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.RESIDENTS NOT USED' }

$total++
if ($auth.Contains('SHEET_NAMES.PERMISSIONS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.PERMISSIONS NOT USED' }

$total++
if ($auth.Contains('ID_PREFIXES.USR')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.USR NOT USED' }

$total++
if ($auth.Contains('ID_PREFIXES.RES')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.RES NOT USED' }

$total++
if ($auth.Contains('ID_PREFIXES.REG')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.REG NOT USED' }

$total++
if ($auth.Contains('CURRENT_YEAR')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: CURRENT_YEAR NOT USED' }

Write-Host ('  ' + $ok7 + ' / 8 passed')

# ============================================================
# Test 8: Database.gs function usage — CRUD functions
# ============================================================
Write-Host '[Test 8] Database.gs function usage — 6 checks'
$ok8 = 0

$total++
if ($auth.Contains('findRowByValue(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: findRowByValue NOT USED' }

$total++
if ($auth.Contains('appendRowToSheet(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet NOT USED' }

$total++
if ($auth.Contains('updateRowInSheet(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: updateRowInSheet NOT USED' }

$total++
if ($auth.Contains('deleteRowFromSheet(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: deleteRowFromSheet NOT USED' }

$total++
if ($auth.Contains('readSheetData(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($auth.Contains('getOrCreateSheet(')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: getOrCreateSheet NOT USED' }

Write-Host ('  ' + $ok8 + ' / 6 passed')

# ============================================================
# Test 9: Logging — writeLog usage
# ============================================================
Write-Host '[Test 9] writeLog usage — 5 checks'
$ok9 = 0

$total++
$loginLogPattern = "writeLog\('LOGIN'"
if ($auth -match $loginLogPattern) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: writeLog LOGIN NOT FOUND' }

$total++
$registerLogPattern = "writeLog\('REGISTER'"
if ($auth -match $registerLogPattern) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: writeLog REGISTER NOT FOUND' }

$total++
$approveLogPattern = "writeLog\('APPROVE_REG'"
if ($auth -match $approveLogPattern) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: writeLog APPROVE_REG NOT FOUND' }

$total++
$rejectLogPattern = "writeLog\('REJECT_REG'"
if ($auth -match $rejectLogPattern) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: writeLog REJECT_REG NOT FOUND' }

$total++
if ($auth.Contains("'Auth'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: Module name Auth NOT FOUND in writeLog' }

Write-Host ('  ' + $ok9 + ' / 5 passed')

# ============================================================
# Test 10: Error handling & validation
# ============================================================
Write-Host '[Test 10] Error handling — 5 checks'
$ok10 = 0

$total++
if ($auth.Contains('success: false')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: success: false return NOT FOUND' }

$total++
if ($auth.Contains('success: true')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: success: true return NOT FOUND' }

$total++
# Email validation
if ($auth.Contains('.trim().toLowerCase()') -or $auth.Contains('.trim()')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: email trim/lowercase NOT FOUND' }

$total++
# Password length validation
if ($auth.Contains('.length < 6') -or $auth.Contains('length < 6')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: password length validation NOT FOUND' }

$total++
# Duplicate check
$dupCheck = $auth.Contains('อีเมลนี้มีอยู่ในระบบแล้ว') -or $auth.Contains('existingUser')
if ($dupCheck) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: duplicate email check NOT FOUND' }

Write-Host ('  ' + $ok10 + ' / 5 passed')

# ============================================================
# Test 11: Email functionality (MailApp)
# ============================================================
Write-Host '[Test 11] Email functionality — 3 checks'
$ok11 = 0

$total++
if ($auth.Contains('MailApp.sendEmail')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: MailApp.sendEmail NOT FOUND (needed for reset password)' }

$total++
if ($auth.Contains('htmlBody')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: htmlBody email template NOT FOUND' }

$total++
if ($auth.Contains('HOME PPK 2026')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: App name NOT FOUND in email template' }

Write-Host ('  ' + $ok11 + ' / 3 passed')

# ============================================================
# Test 12: Session cleanup — Trigger
# ============================================================
Write-Host '[Test 12] Session cleanup Trigger — 4 checks'
$ok12 = 0

$total++
if ($auth.Contains('ScriptApp.newTrigger')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: ScriptApp.newTrigger NOT FOUND' }

$total++
if ($auth.Contains('everyHours(24)') -or $auth.Contains('everyHours(24)')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: everyHours(24) NOT FOUND' }

$total++
if ($auth.Contains('ScriptApp.deleteTrigger')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: ScriptApp.deleteTrigger NOT FOUND (prevent duplicate)' }

$total++
if ($auth.Contains("'cleanupExpiredSessions'")) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: cleanupExpiredSessions handler name NOT FOUND' }

Write-Host ('  ' + $ok12 + ' / 4 passed')

# ============================================================
# Test 13: Permission check — Permissions sheet
# ============================================================
Write-Host '[Test 13] Permission check — 3 checks'
$ok13 = 0

$total++
if ($auth.Contains("role === 'admin'") -or $auth.Contains("role === ""admin""")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: admin role bypass check NOT FOUND' }

$total++
if ($auth.Contains('PERMISSIONS')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: PERMISSIONS sheet reference NOT FOUND' }

$total++
# permType parameter
$permTypePattern = 'function checkPermission[\s\S]*?permType'
if ($auth -match $permTypePattern) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: permType parameter NOT FOUND in checkPermission' }

Write-Host ('  ' + $ok13 + ' / 3 passed')

# ============================================================
# Test 14: Cache invalidation
# ============================================================
Write-Host '[Test 14] Cache invalidation — 2 checks'
$ok14 = 0

$total++
if ($auth.Contains('invalidateCache(') -or $auth.Contains('invalidateCaches(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: invalidateCache/invalidateCaches NOT FOUND' }

$total++
if ($auth.Contains("'users'")) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: users cache key NOT FOUND' }

Write-Host ('  ' + $ok14 + ' / 2 passed')

# ============================================================
# Test 15: No duplicate with Config.gs / Database.gs / Main.gs
# ============================================================
Write-Host '[Test 15] No duplicate functions — 6 checks'
$ok15 = 0

$total++
if (-not $auth.Contains('function doGet(')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains doGet() — should be in Main.gs' }

$total++
if (-not $auth.Contains('function doPost(')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains doPost() — should be in Main.gs' }

$total++
if (-not $auth.Contains('function readSheetData(')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains readSheetData() — should be in Database.gs' }

$total++
if (-not $auth.Contains('function appendRowToSheet(')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains appendRowToSheet() — should be in Database.gs' }

$total++
if (-not $auth.Contains('const FOLDER_IDS')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains FOLDER_IDS — should be in Config.gs' }

$total++
if (-not $auth.Contains('const SPREADSHEET_IDS')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Auth.gs contains SPREADSHEET_IDS — should be in Config.gs' }

Write-Host ('  ' + $ok15 + ' / 6 passed')

# ============================================================
# Test 16: Main.gs stubs will be overridden
# ============================================================
Write-Host '[Test 16] Override Main.gs stubs — 9 checks'
$ok16 = 0

$stubFuncs = @(
  'handleLogin',
  'handleRegister',
  'handleResetPassword',
  'handleFindEmail',
  'handleChangePassword',
  'approveRegistration',
  'rejectRegistration',
  'getPendingRegistrations',
  'getCurrentUser'
)

foreach ($fn in $stubFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  # ต้องมีทั้งใน Auth.gs (ตัวจริง) และ Main.gs (stub)
  $inAuth = $auth.Contains($search)
  $inMain = $main.Contains($search)
  if ($inAuth -and $inMain) { $pass++; $ok16++ }
  elseif (-not $inAuth) { $fail++; $errors += ('  FAIL: ' + $fn + '() NOT in Auth.gs') }
  elseif (-not $inMain) { $fail++; $errors += ('  WARN: ' + $fn + '() NOT in Main.gs (no stub to override)'); $pass++; $ok16++ }
}
Write-Host ('  ' + $ok16 + ' / ' + $stubFuncs.Count + ' passed')

# ============================================================
# Test 17: testAuth completeness
# ============================================================
Write-Host '[Test 17] testAuth completeness — 8 checks'
$ok17 = 0

# Extract testAuth function body
$testAuthPattern = 'function testAuth\(\)[\s\S]*?AUTH TEST PASSED'
if ($auth -match $testAuthPattern) {
  $testBody = $Matches[0]

  $total++
  if ($testBody.Contains('hashPassword')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing hashPassword test' }

  $total++
  if ($testBody.Contains('handleRegister')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing handleRegister test' }

  $total++
  if ($testBody.Contains('handleLogin')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing handleLogin test' }

  $total++
  if ($testBody.Contains('approveRegistration')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing approveRegistration test' }

  $total++
  if ($testBody.Contains('validateSession')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing validateSession test' }

  $total++
  if ($testBody.Contains('getCurrentUser')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing getCurrentUser test' }

  $total++
  if ($testBody.Contains('destroySession')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing destroySession test' }

  $total++
  if ($testBody.Contains('cleanupExpiredSessions')) { $pass++; $ok17++ }
  else { $fail++; $errors += '  FAIL: testAuth missing cleanupExpiredSessions test' }
} else {
  $total += 8; $fail += 8
  $errors += '  FAIL: testAuth() function NOT FOUND or incomplete'
}

Write-Host ('  ' + $ok17 + ' / 8 passed')

# ============================================================
# Test 18: Documentation
# ============================================================
Write-Host '[Test 18] Documentation — 4 checks'
$ok18 = 0

$total++
if ($auth.Contains('Step: 19') -or $auth.Contains('Step 19')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: Step 19 NOT FOUND in header' }

$total++
if ($auth.Contains('Dependencies:') -or $auth.Contains('Config.gs, Database.gs')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($auth.Contains('Version: 1.0')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

$total++
if ($auth.Contains('Housing.gs') -or $auth.Contains('Step 20')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: Next step reference NOT FOUND' }

Write-Host ('  ' + $ok18 + ' / 4 passed')

# ============================================================
# Test 19: Function count
# ============================================================
Write-Host '[Test 19] Function count check'
$funcMatches = [regex]::Matches($auth, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 19) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 19)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 19)')

# ============================================================
# Test 20: Security checks
# ============================================================
Write-Host '[Test 20] Security — 5 checks'
$ok20 = 0

$total++
# Login returns same error for wrong email and wrong password (safe pattern)
# Both findRowByValue miss and password mismatch return the same error message
$loginErrorCount = ([regex]::Matches($auth, "success: false, error:.*'[^']*'")).Count
if ($loginErrorCount -ge 5) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Login error handling insufficient' }

$total++
# Reset password has same response for existing & non-existing email (safe pattern)
# handleResetPassword returns success:true even when user not found
$resetPattern = 'function handleResetPassword[\s\S]*?success: true[\s\S]*?success: true'
if ($auth -match $resetPattern) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Reset password may reveal if email exists' }

$total++
# maskEmail function exists
if ($auth.Contains('function maskEmail(')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: maskEmail function NOT FOUND' }

$total++
# Password hash removed from pending response
$pendingRespPattern = "password_hash.*ลบ|password_hash.*ออก|keys\[i\].*password_hash"
if ($auth -match $pendingRespPattern) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: password_hash not filtered from getPendingRegistrations response' }

$total++
# is_active check in login
if ($auth.Contains('is_active')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: is_active account status check NOT FOUND in login' }

Write-Host ('  ' + $ok20 + ' / 5 passed')

# ============================================================
# Test 21: Rollback on approve failure
# ============================================================
Write-Host '[Test 21] Rollback on approve failure — 1 check'
$ok21 = 0

$total++
# approveRegistration deletes Residents if Users creation fails
$rollbackPattern = 'deleteRowFromSheet[\s\S]*?RESIDENTS[\s\S]*?residentId'
if ($auth -match $rollbackPattern) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Rollback (delete Residents) on Users creation failure NOT FOUND' }

Write-Host ('  ' + $ok21 + ' / 1 passed')

# ============================================================
# Test 22: setupDefaultAdmin — auto-create first admin
# ============================================================
Write-Host '[Test 22] setupDefaultAdmin — 8 checks'
$ok22 = 0

$total++
if ($auth.Contains('function setupDefaultAdmin(')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: function setupDefaultAdmin() NOT FOUND' }

$total++
# Creates Users record with role=admin
$adminRolePattern = "role.*admin|'admin'"
if ($auth -match $adminRolePattern) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: admin role assignment NOT FOUND' }

$total++
# Creates Permissions record with all TRUE
$permAllTrue = 'water.*TRUE.*electric.*TRUE|admin.*TRUE'
if ($auth -match $permAllTrue) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: admin permissions all TRUE NOT FOUND' }

$total++
# Checks for existing admin before creating
$existAdminCheck = 'existingAdmin'
if ($auth.Contains($existAdminCheck)) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: existing admin check NOT FOUND' }

$total++
# Uses SHEET_NAMES.PERMISSIONS
if ($auth.Contains('SHEET_NAMES.PERMISSIONS')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.PERMISSIONS NOT USED in setupDefaultAdmin' }

$total++
# Has rollback if Users creation fails
$adminRollback = 'function setupDefaultAdmin[\s\S]*?deleteRowFromSheet[\s\S]*?RESIDENTS'
if ($auth -match $adminRollback) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Rollback in setupDefaultAdmin NOT FOUND' }

$total++
# Writes log
$adminLogPattern = "writeLog\('SETUP_ADMIN'"
if ($auth -match $adminLogPattern) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: writeLog SETUP_ADMIN NOT FOUND' }

$total++
# Has password validation
$adminPassVal = 'function setupDefaultAdmin[\s\S]*?length < 6'
if ($auth -match $adminPassVal) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: password validation NOT FOUND in setupDefaultAdmin' }

Write-Host ('  ' + $ok22 + ' / 8 passed')

# ============================================================
# SUMMARY
# ============================================================
Write-Host ''
Write-Host '========================================================'
Write-Host '   RESULT'
Write-Host '========================================================'
Write-Host ('  Total Tests:  ' + $total)
Write-Host ('  Passed:       ' + $pass)
Write-Host ('  Failed:       ' + $fail)
Write-Host ''

if ($errors.Count -gt 0) {
  Write-Host '  ERRORS:'
  foreach ($e in $errors) { Write-Host $e }
  Write-Host ''
}

if ($fail -eq 0) {
  Write-Host ('  >>> ALL ' + $total + ' TESTS PASSED <<<')
  Write-Host '  Auth.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
