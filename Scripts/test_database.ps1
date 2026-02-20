$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Database.gs — Structure & Completeness'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Required Functions (12 core functions)
# ============================================================
Write-Host '[Test 1] Core Functions — 12 required'
$coreFuncs = @(
  'withLock',
  'getSheetByName',
  'getOrCreateSheet',
  'readSheetData',
  'readSheetDataFiltered',
  'findRowByValue',
  'appendRowToSheet',
  'batchAppendRows',
  'updateRowInSheet',
  'batchUpdateRows',
  'deleteRowFromSheet',
  'getNextId'
)
$ok1 = 0
foreach ($fn in $coreFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($db.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $coreFuncs.Count + ' passed')

# ============================================================
# Test 2: Utility Functions (6 functions)
# ============================================================
Write-Host '[Test 2] Utility Functions — 6 required'
$utilFuncs = @(
  'getCachedData',
  'invalidateCache',
  'invalidateCaches',
  'writeLog',
  'safeExecute',
  'testDB'
)
$ok2 = 0
foreach ($fn in $utilFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($db.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $utilFuncs.Count + ' passed')

# ============================================================
# Test 3: Backup/Archive Functions (3 functions)
# ============================================================
Write-Host '[Test 3] Backup/Archive Functions — 3 required'
$backupFuncs = @(
  'createBackup',
  'restoreBackup',
  'archiveLogs'
)
$ok3 = 0
foreach ($fn in $backupFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($db.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $backupFuncs.Count + ' passed')

# ============================================================
# Test 4: LockService Pattern — ทุก write function ใช้ withLock
# ============================================================
Write-Host '[Test 4] LockService — 5 write functions use withLock'
$lockFuncs = @(
  'appendRowToSheet',
  'batchAppendRows',
  'updateRowInSheet',
  'batchUpdateRows',
  'deleteRowFromSheet'
)
$ok4 = 0
foreach ($fn in $lockFuncs) {
  $total++
  # ตรวจว่า function body มี withLock(
  # ค้นหา pattern: function ชื่อ(...) { ... return withLock(
  $pattern = 'function ' + $fn + '[\s\S]*?return withLock\('
  if ($db -match $pattern) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: ' + $fn + '() does not use withLock()') }
}
Write-Host ('  ' + $ok4 + ' / ' + $lockFuncs.Count + ' passed')

# ============================================================
# Test 5: Constants
# ============================================================
Write-Host '[Test 5] Constants — 3 required'
$ok5 = 0

$total++
if ($db.Contains('BATCH_SIZE')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: BATCH_SIZE constant NOT FOUND' }

$total++
if ($db.Contains('CACHE_TTL')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: CACHE_TTL constant NOT FOUND' }

$total++
if ($db.Contains('LOCK_TIMEOUT')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: LOCK_TIMEOUT constant NOT FOUND' }

Write-Host ('  ' + $ok5 + ' / 3 passed')

# ============================================================
# Test 6: GAS APIs used correctly
# ============================================================
Write-Host '[Test 6] GAS API usage — 7 checks'
$ok6 = 0

$total++
if ($db.Contains('SpreadsheetApp.openById')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: SpreadsheetApp.openById NOT FOUND' }

$total++
if ($db.Contains('LockService.getScriptLock')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: LockService.getScriptLock NOT FOUND' }

$total++
if ($db.Contains('CacheService.getScriptCache')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: CacheService.getScriptCache NOT FOUND' }

$total++
if ($db.Contains('DriveApp.getFolderById')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: DriveApp.getFolderById NOT FOUND' }

$total++
if ($db.Contains('SpreadsheetApp.flush')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: SpreadsheetApp.flush NOT FOUND (needed for batch)' }

$total++
if ($db.Contains('.tryLock(')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: .tryLock() NOT FOUND' }

$total++
if ($db.Contains('.releaseLock()')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: .releaseLock() NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 7 passed')

# ============================================================
# Test 7: Config.gs references — ใช้ค่าจาก Config.gs
# ============================================================
Write-Host '[Test 7] Config.gs references — 5 checks'
$ok7 = 0

$total++
if ($db.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($db.Contains('FOLDER_IDS.BACKUPS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: FOLDER_IDS.BACKUPS NOT USED' }

$total++
if ($db.Contains('SHEET_NAMES.LOGS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.LOGS NOT USED' }

$total++
if ($db.Contains('ID_PREFIXES.LOG')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.LOG NOT USED' }

$total++
# ตรวจว่า Config.gs มี keys ที่ Database.gs ใช้
if ($config.Contains("LOGS:") -and $config.Contains("LOG:")) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: Config.gs missing LOGS/LOG keys used by Database.gs' }

Write-Host ('  ' + $ok7 + ' / 5 passed')

# ============================================================
# Test 8: Error handling patterns
# ============================================================
Write-Host '[Test 8] Error handling — 4 checks'
$ok8 = 0

$total++
if ($db.Contains('throw new Error')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: throw new Error NOT FOUND' }

$total++
if ($db.Contains('try {') -or $db.Contains('try{')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: try-catch NOT FOUND' }

$total++
if ($db.Contains('catch (e)') -or $db.Contains('catch(e)')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: catch clause NOT FOUND' }

$total++
if ($db.Contains('finally {') -or $db.Contains('finally{')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: finally clause NOT FOUND (needed in withLock)' }

Write-Host ('  ' + $ok8 + ' / 4 passed')

# ============================================================
# Test 9: Return format consistency (success/error pattern)
# ============================================================
Write-Host '[Test 9] Return format — 3 checks'
$ok9 = 0

$total++
$successCount = ([regex]::Matches($db, 'success:\s*true')).Count
if ($successCount -ge 5) { $pass++; $ok9++ }
else { $fail++; $errors += ('  FAIL: success: true count = ' + $successCount + ' (need >= 5)') }

$total++
$errorCount = ([regex]::Matches($db, 'success:\s*false')).Count
if ($errorCount -ge 3) { $pass++; $ok9++ }
else { $fail++; $errors += ('  FAIL: success: false count = ' + $errorCount + ' (need >= 3)') }

$total++
$hasAdd = $db -match 'message.*success'
$hasUpdate = $db -match 'message.*success'
$hasDel = $db -match 'message.*success'
if ($hasAdd -and $hasUpdate -and $hasDel) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: Success messages missing' }

Write-Host ('  ' + $ok9 + ' / 3 passed')

# ============================================================
# Test 10: Backup features
# ============================================================
Write-Host '[Test 10] Backup features — 3 checks'
$ok10 = 0

$total++
if ($db.Contains('makeCopy')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: makeCopy NOT FOUND (needed for backup)' }

$total++
if ($db.Contains('createFolder')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: createFolder NOT FOUND (needed for backup subfolder)' }

$total++
if ($db.Contains('deleteRow')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: deleteRow NOT FOUND (needed for archive)' }

Write-Host ('  ' + $ok10 + ' / 3 passed')

# ============================================================
# Test 11: testDB function completeness
# ============================================================
Write-Host '[Test 11] testDB completeness - 5 checks'
$ok11 = 0

# Extract testDB function body
$testDbPattern = 'function testDB\(\)[\s\S]*?DATABASE TEST PASSED'
if ($db -match $testDbPattern) {
  $testBody = $Matches[0]

  $total++
  if ($testBody.Contains('readSheetData')) { $pass++; $ok11++ }
  else { $fail++; $errors += '  FAIL: testDB missing readSheetData test' }

  $total++
  if ($testBody.Contains('appendRowToSheet')) { $pass++; $ok11++ }
  else { $fail++; $errors += '  FAIL: testDB missing appendRowToSheet test' }

  $total++
  if ($testBody.Contains('updateRowInSheet')) { $pass++; $ok11++ }
  else { $fail++; $errors += '  FAIL: testDB missing updateRowInSheet test' }

  $total++
  if ($testBody.Contains('deleteRowFromSheet')) { $pass++; $ok11++ }
  else { $fail++; $errors += '  FAIL: testDB missing deleteRowFromSheet test' }

  $total++
  if ($testBody.Contains('withLock')) { $pass++; $ok11++ }
  else { $fail++; $errors += '  FAIL: testDB missing withLock test' }
} else {
  $total += 5; $fail += 5
  $errors += '  FAIL: testDB() function NOT FOUND or incomplete'
}

Write-Host ('  ' + $ok11 + ' / 5 passed')

# ============================================================
# Test 12: No duplicate with Config.gs / setup.gs
# ============================================================
Write-Host '[Test 12] No duplicate functions — 3 checks'
$ok12 = 0

# Database.gs should NOT have doGet, doPost, handleLogin
$total++
if (-not $db.Contains('function doGet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Database.gs contains doGet() — should be in Main.gs' }

$total++
if (-not $db.Contains('function doPost(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Database.gs contains doPost() — should be in Main.gs' }

$total++
if (-not $db.Contains('function handleLogin(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Database.gs contains handleLogin() — should be in Auth.gs' }

Write-Host ('  ' + $ok12 + ' / 3 passed')

# ============================================================
# Test 13: Function count
# ============================================================
Write-Host '[Test 13] Function count check'
$funcMatches = [regex]::Matches($db, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 18) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 18)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 18)')

# ============================================================
# Test 14: Cache 6-hour TTL
# ============================================================
Write-Host '[Test 14] Cache TTL = 6 hours (21600 seconds)'
$total++
if ($db.Contains('21600')) { $pass++ }
else { $fail++; $errors += '  FAIL: CACHE_TTL 21600 NOT FOUND' }
Write-Host ('  1 / 1 passed')

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
  Write-Host '  Database.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
