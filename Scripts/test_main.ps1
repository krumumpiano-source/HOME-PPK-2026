$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Main.gs — Router & Web App Entry Point'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Core Functions (5 required)
# ============================================================
Write-Host '[Test 1] Core Functions — 5 required'
$coreFuncs = @(
  'doGet',
  'doPost',
  'jsonResponse',
  'errorResponse',
  'validateSession'
)
$ok1 = 0
foreach ($fn in $coreFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($main.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $coreFuncs.Count + ' passed')

# ============================================================
# Test 2: Router Functions (2 required)
# ============================================================
Write-Host '[Test 2] Router Functions — 2 required'
$routerFuncs = @(
  'routeGetAction',
  'routePostAction'
)
$ok2 = 0
foreach ($fn in $routerFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($main.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $routerFuncs.Count + ' passed')

# ============================================================
# Test 3: GET Actions — 20 routes (17 base + 3 added)
# ============================================================
Write-Host '[Test 3] GET Actions — required routes'
$getActions = @(
  'getSettings',
  'getHousing',
  'getResidents',
  'getUserProfile',
  'getCoresidents',
  'getWaterBills',
  'getElectricBills',
  'getSlipSubmissions',
  'getPaymentHistory',
  'getOutstanding',
  'getRequests',
  'getQueue',
  'getIncome',
  'getExpense',
  'getAnnouncements',
  'getPendingRegistrations',
  'getNotificationHistory',
  'getHousingFormat',
  'getWaterRate',
  'getCurrentUser'
)
$ok3 = 0
foreach ($act in $getActions) {
  $total++
  if ($main.Contains("'$act'")) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: GET action "' + $act + '" NOT FOUND in route mapping') }
}
Write-Host ('  ' + $ok3 + ' / ' + $getActions.Count + ' passed')

# ============================================================
# Test 4: POST Actions — 35+ routes
# ============================================================
Write-Host '[Test 4] POST Actions — required routes'
$postActions = @(
  'login',
  'register',
  'resetPassword',
  'findEmail',
  'changePassword',
  'approveRegistration',
  'rejectRegistration',
  'updateProfile',
  'addCoresident',
  'updateCoresident',
  'removeCoresident',
  'addHousing',
  'updateHousing',
  'deleteHousing',
  'addResident',
  'updateResident',
  'removeResident',
  'submitWaterBill',
  'submitElectricBill',
  'submitSlip',
  'reviewSlip',
  'submitRequest',
  'reviewRequest',
  'updateQueue',
  'saveWithdraw',
  'saveAccounting',
  'updateSettings',
  'saveHousingFormat',
  'addAnnouncement',
  'deleteAnnouncement',
  'updatePermissions',
  'sendNotification',
  'saveNotificationSnapshot',
  'exportResidents',
  'importResidents',
  'uploadSlipImage'
)
$ok4 = 0
foreach ($act in $postActions) {
  $total++
  if ($main.Contains("'$act'")) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: POST action "' + $act + '" NOT FOUND in route mapping') }
}
Write-Host ('  ' + $ok4 + ' / ' + $postActions.Count + ' passed')

# ============================================================
# Test 5: PUBLIC_ACTIONS — 4 public routes
# ============================================================
Write-Host '[Test 5] PUBLIC_ACTIONS — 4 public routes'
$publicActions = @('login', 'register', 'resetPassword', 'findEmail')
$ok5 = 0
foreach ($act in $publicActions) {
  $total++
  $pattern = "PUBLIC_ACTIONS[\s\S]*?'$act'"
  if ($main -match $pattern) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: "' + $act + '" NOT in PUBLIC_ACTIONS') }
}
Write-Host ('  ' + $ok5 + ' / ' + $publicActions.Count + ' passed')

# ============================================================
# Test 6: ContentService usage — JSON response
# ============================================================
Write-Host '[Test 6] ContentService JSON response — 4 checks'
$ok6 = 0

$total++
if ($main.Contains('ContentService')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: ContentService NOT FOUND' }

$total++
if ($main.Contains('createTextOutput')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: createTextOutput NOT FOUND' }

$total++
if ($main.Contains('JSON.stringify')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: JSON.stringify NOT FOUND' }

$total++
if ($main.Contains('ContentService.MimeType.JSON')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: ContentService.MimeType.JSON NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 4 passed')

# ============================================================
# Test 7: Session validation pattern
# ============================================================
Write-Host '[Test 7] Session validation — 5 checks'
$ok7 = 0

$total++
if ($main.Contains('PropertiesService.getScriptProperties')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: PropertiesService.getScriptProperties NOT FOUND' }

$total++
if ($main.Contains("'session_'")) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: session_ prefix NOT FOUND' }

$total++
if ($main.Contains('SESSION_EXPIRED')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SESSION_EXPIRED response NOT FOUND' }

$total++
if ($main.Contains('AUTH_REQUIRED')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: AUTH_REQUIRED response NOT FOUND' }

$total++
if ($main.Contains('24 * 60 * 60 * 1000')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: 24-hour expiry NOT FOUND' }

Write-Host ('  ' + $ok7 + ' / 5 passed')

# ============================================================
# Test 8: Error handling patterns
# ============================================================
Write-Host '[Test 8] Error handling — 5 checks'
$ok8 = 0

$total++
if ($main.Contains('try {') -or $main.Contains('try{')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: try-catch NOT FOUND' }

$total++
if ($main.Contains('catch (err)') -or $main.Contains('catch(err)')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: catch clause NOT FOUND' }

$total++
if ($main.Contains('INTERNAL_ERROR')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: INTERNAL_ERROR code NOT FOUND' }

$total++
if ($main.Contains('INVALID_ACTION')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: INVALID_ACTION code NOT FOUND' }

$total++
if ($main.Contains('MISSING_ACTION')) { $pass++; $ok8++ }
else { $fail++; $errors += '  FAIL: MISSING_ACTION code NOT FOUND' }

Write-Host ('  ' + $ok8 + ' / 5 passed')

# ============================================================
# Test 9: doPost body parsing
# ============================================================
Write-Host '[Test 9] doPost body parsing — 3 checks'
$ok9 = 0

$total++
if ($main.Contains('e.postData.contents')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: e.postData.contents NOT FOUND' }

$total++
if ($main.Contains('JSON.parse')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: JSON.parse NOT FOUND' }

$total++
if ($main.Contains('_userId')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: _userId attachment NOT FOUND' }

Write-Host ('  ' + $ok9 + ' / 3 passed')

# ============================================================
# Test 10: Stub functions — all handlers have stubs
# ============================================================
Write-Host '[Test 10] Stub functions — handler stubs exist'
$stubFuncs = @(
  'handleLogin',
  'handleRegister',
  'handleResetPassword',
  'handleFindEmail',
  'handleChangePassword',
  'approveRegistration',
  'rejectRegistration',
  'getPendingRegistrations',
  'getCurrentUser',
  'getSettings',
  'getHousingList',
  'getResidentsList',
  'getAnnouncements',
  'getWaterBills',
  'getElectricBills',
  'saveWaterBill',
  'saveElectricBill',
  'getSlipSubmissions',
  'getPaymentHistory',
  'getOutstanding',
  'handleSubmitSlip',
  'handleReviewSlip',
  'getRequests',
  'getQueue',
  'handleSubmitRequest',
  'handleReviewRequest',
  'getIncome',
  'getExpense',
  'handleSaveWithdraw',
  'handleSaveAccounting',
  'handleSendNotification'
)
$ok10 = 0
foreach ($fn in $stubFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($main.Contains($search)) { $pass++; $ok10++ }
  else { $fail++; $errors += ('  FAIL: stub function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok10 + ' / ' + $stubFuncs.Count + ' passed')

# ============================================================
# Test 11: Stub return NOT_IMPLEMENTED
# ============================================================
Write-Host '[Test 11] Stubs return NOT_IMPLEMENTED'
$ok11 = 0

$total++
$notImplCount = ([regex]::Matches($main, 'NOT_IMPLEMENTED')).Count
if ($notImplCount -ge 20) { $pass++; $ok11++ }
else { $fail++; $errors += ('  FAIL: NOT_IMPLEMENTED count = ' + $notImplCount + ' (need >= 20)') }
Write-Host ('  NOT_IMPLEMENTED stubs: ' + $notImplCount + ' (need >= 20)')

$total++
# Step references in stubs
$stepRefs = ([regex]::Matches($main, 'Step \d+')).Count
if ($stepRefs -ge 15) { $pass++; $ok11++ }
else { $fail++; $errors += ('  FAIL: Step references = ' + $stepRefs + ' (need >= 15)') }
Write-Host ('  Step references: ' + $stepRefs + ' (need >= 15)')

Write-Host ('  ' + $ok11 + ' / 2 passed')

# ============================================================
# Test 12: safeExecute usage in routers
# ============================================================
Write-Host '[Test 12] safeExecute usage — 2 checks'
$ok12 = 0

$total++
$routeGetBody = ''
if ($main -match 'function routeGetAction[\s\S]*?safeExecute') {
  $pass++; $ok12++
} else { $fail++; $errors += '  FAIL: routeGetAction does not use safeExecute' }

$total++
if ($main -match 'function routePostAction[\s\S]*?safeExecute') {
  $pass++; $ok12++
} else { $fail++; $errors += '  FAIL: routePostAction does not use safeExecute' }

Write-Host ('  ' + $ok12 + ' / 2 passed')

# ============================================================
# Test 13: writeLog usage for errors
# ============================================================
Write-Host '[Test 13] writeLog for error logging — 2 checks'
$ok13 = 0

$total++
if ($main.Contains("writeLog('ERROR'")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog ERROR call NOT FOUND in doGet/doPost' }

$total++
if ($main.Contains("'Main'")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: Module name Main NOT FOUND in writeLog calls' }

Write-Host ('  ' + $ok13 + ' / 2 passed')

# ============================================================
# Test 14: No duplicate with Config.gs / Database.gs
# ============================================================
Write-Host '[Test 14] No duplicate functions — 5 checks'
$ok14 = 0

$total++
if (-not $main.Contains('function readSheetData(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: Main.gs contains readSheetData() — should be in Database.gs' }

$total++
if (-not $main.Contains('function appendRowToSheet(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: Main.gs contains appendRowToSheet() — should be in Database.gs' }

$total++
if (-not $main.Contains('const FOLDER_IDS')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: Main.gs contains FOLDER_IDS — should be in Config.gs' }

$total++
if (-not $main.Contains('const SPREADSHEET_IDS')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: Main.gs contains SPREADSHEET_IDS — should be in Config.gs' }

$total++
if (-not $main.Contains('function withLock(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: Main.gs contains withLock() — should be in Database.gs' }

Write-Host ('  ' + $ok14 + ' / 5 passed')

# ============================================================
# Test 15: testMain function exists
# ============================================================
Write-Host '[Test 15] testMain function — 3 checks'
$ok15 = 0

$total++
if ($main.Contains('function testMain()')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: function testMain() NOT FOUND' }

$total++
if ($main.Contains('MAIN TEST PASSED')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: MAIN TEST PASSED message NOT FOUND' }

$total++
if ($main.Contains('TEST MAIN.gs')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: TEST MAIN.gs header NOT FOUND' }

Write-Host ('  ' + $ok15 + ' / 3 passed')

# ============================================================
# Test 16: GET_ACTIONS and POST_ACTIONS route maps
# ============================================================
Write-Host '[Test 16] Route map constants — 2 checks'
$ok16 = 0

$total++
if ($main.Contains('const GET_ACTIONS')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: GET_ACTIONS constant NOT FOUND' }

$total++
if ($main.Contains('const POST_ACTIONS')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: POST_ACTIONS constant NOT FOUND' }

Write-Host ('  ' + $ok16 + ' / 2 passed')

# ============================================================
# Test 17: doGet status page info
# ============================================================
Write-Host '[Test 17] Status page info — 3 checks'
$ok17 = 0

$total++
if ($main.Contains('HOME PPK 2026')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: App name HOME PPK 2026 NOT FOUND' }

$total++
if ($main.Contains("version:") -or $main.Contains("'1.0'")) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Version info NOT FOUND' }

$total++
if ($main.Contains('toISOString')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Timestamp NOT FOUND in status' }

Write-Host ('  ' + $ok17 + ' / 3 passed')

# ============================================================
# Test 18: switch cases in routeGetAction and routePostAction
# ============================================================
Write-Host '[Test 18] Switch cases in routers'
$ok18 = 0

$total++
$getCaseCount = ([regex]::Matches($main, "case 'get\w+':")).Count
if ($getCaseCount -ge 15) { $pass++; $ok18++ }
else { $fail++; $errors += ('  FAIL: GET switch cases = ' + $getCaseCount + ' (need >= 15)') }
Write-Host ('  GET switch cases: ' + $getCaseCount + ' (need >= 15)')

$total++
$postCaseCount = ([regex]::Matches($main, "case '\w+':")).Count - $getCaseCount
if ($postCaseCount -ge 20) { $pass++; $ok18++ }
else { $fail++; $errors += ('  FAIL: POST switch cases ~= ' + $postCaseCount + ' (need >= 20)') }
Write-Host ('  POST switch cases (approx): ' + $postCaseCount + ' (need >= 20)')

Write-Host ('  ' + $ok18 + ' / 2 passed')

# ============================================================
# Test 19: Function count
# ============================================================
Write-Host '[Test 19] Function count check'
$funcMatches = [regex]::Matches($main, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 40) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 40 with stubs)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 40 with stubs)')

# ============================================================
# Test 20: CORS-related notes/comments
# ============================================================
Write-Host '[Test 20] Documentation — 3 checks'
$ok20 = 0

$total++
if ($main.Contains('CORS') -or $main.Contains('redirect')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: CORS/redirect note NOT FOUND' }

$total++
if ($main.Contains('Step: 18') -or $main.Contains('Step 18')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Step 18 NOT FOUND in header' }

$total++
if ($main.Contains('Dependencies:') -or $main.Contains('Config.gs')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

Write-Host ('  ' + $ok20 + ' / 3 passed')

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
  Write-Host '  Main.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
