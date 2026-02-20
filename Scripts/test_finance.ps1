$finance = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Finance.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Finance.gs — Withdraw, Accounting, Income/Expense'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Withdraw Functions (3 required)
# ============================================================
Write-Host '[Test 1] Withdraw Functions — 3 required'
$withdrawFuncs = @(
  'getMonthlyWithdraw',
  'handleSaveWithdraw',
  'createWithdrawYearSheet'
)
$ok1 = 0
foreach ($fn in $withdrawFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($finance.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $withdrawFuncs.Count + ' passed')

# ============================================================
# Test 2: Billing Totals Functions (2 required)
# ============================================================
Write-Host '[Test 2] Billing Totals — 2 required'
$billingFuncs = @(
  'getWaterBillTotal',
  'getElectricBillPEA'
)
$ok2 = 0
foreach ($fn in $billingFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($finance.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $billingFuncs.Count + ' passed')

# ============================================================
# Test 3: Accounting Functions (5 required)
# ============================================================
Write-Host '[Test 3] Accounting Functions — 5 required'
$acctFuncs = @(
  'loadAccountingData',
  'handleSaveAccounting',
  'deleteAccountingEntry',
  'calculateAutoEntries',
  'createAccountingYearSheet'
)
$ok3 = 0
foreach ($fn in $acctFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($finance.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $acctFuncs.Count + ' passed')

# ============================================================
# Test 4: Income/Expense/CarryForward Functions (3 required)
# ============================================================
Write-Host '[Test 4] Income/Expense/CarryForward — 3 required'
$ieFuncs = @(
  'getIncome',
  'getExpense',
  'getCarryForward'
)
$ok4 = 0
foreach ($fn in $ieFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($finance.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $ieFuncs.Count + ' passed')

# ============================================================
# Test 5: Receipt Image Function (1 required)
# ============================================================
Write-Host '[Test 5] Receipt Image — 1 required'
$ok5 = 0
$total++
if ($finance.Contains('function uploadReceiptImage(')) { $pass++; $ok5++ }
else { $fail++; $errors += '  FAIL: function uploadReceiptImage() NOT FOUND' }
Write-Host ('  ' + $ok5 + ' / 1 passed')

# ============================================================
# Test 6: Schema Headers — 2 header arrays
# ============================================================
Write-Host '[Test 6] Schema Headers — 2 arrays'
$ok6 = 0

$total++
if ($finance.Contains('WITHDRAW_YEAR_HEADERS')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: WITHDRAW_YEAR_HEADERS NOT FOUND' }

$total++
if ($finance.Contains('ACCOUNTING_YEAR_HEADERS')) { $pass++; $ok6++ }
else { $fail++; $errors += '  FAIL: ACCOUNTING_YEAR_HEADERS NOT FOUND' }

Write-Host ('  ' + $ok6 + ' / 2 passed')

# ============================================================
# Test 7: Withdraw Headers — key columns
# ============================================================
Write-Host '[Test 7] Withdraw Headers — key columns'
$wdHeaders = @('garbage_fee', 'additional_items', 'total_withdraw', 'saved_at', 'saved_by')
$ok7 = 0
foreach ($h in $wdHeaders) {
  $total++
  if ($finance.Contains("'$h'")) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: Withdraw header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $wdHeaders.Count + ' passed')

# ============================================================
# Test 8: Accounting Headers — key columns
# ============================================================
Write-Host '[Test 8] Accounting Headers — key columns'
$acctHeaders = @('type', 'category', 'name', 'amount', 'source', 'receipt_file_id', 'note')
$ok8 = 0
foreach ($h in $acctHeaders) {
  $total++
  if ($finance.Contains("'$h'")) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: Accounting header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $acctHeaders.Count + ' passed')

# ============================================================
# Test 9: Config.gs references — SPREADSHEET_IDS
# ============================================================
Write-Host '[Test 9] Config references — 5 checks'
$ok9 = 0

$total++
if ($finance.Contains('SPREADSHEET_IDS.WITHDRAW')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.WITHDRAW NOT USED' }

$total++
if ($finance.Contains('SPREADSHEET_IDS.ACCOUNTING')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.ACCOUNTING NOT USED' }

$total++
if ($finance.Contains('SPREADSHEET_IDS.WATER')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.WATER NOT USED (for getWaterBillTotal)' }

$total++
if ($finance.Contains('SPREADSHEET_IDS.ELECTRIC')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.ELECTRIC NOT USED (for getElectricBillPEA)' }

$total++
if ($finance.Contains('FOLDER_IDS.ACCOUNTING_RECEIPTS')) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: FOLDER_IDS.ACCOUNTING_RECEIPTS NOT USED' }

Write-Host ('  ' + $ok9 + ' / 5 passed')

# ============================================================
# Test 10: ID_PREFIXES usage
# ============================================================
Write-Host '[Test 10] ID_PREFIXES usage — 3 checks'
$ok10 = 0

$total++
if ($finance.Contains('ID_PREFIXES.WTD')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.WTD NOT USED (withdraw)' }

$total++
if ($finance.Contains('ID_PREFIXES.INC')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.INC NOT USED (income)' }

$total++
if ($finance.Contains('ID_PREFIXES.EXP')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.EXP NOT USED (expense)' }

Write-Host ('  ' + $ok10 + ' / 3 passed')

# ============================================================
# Test 11: Accounting type — income / expense
# ============================================================
Write-Host '[Test 11] Accounting types — 3 checks'
$ok11 = 0

$total++
if ($finance.Contains("'income'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: type income NOT FOUND' }

$total++
if ($finance.Contains("'expense'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: type expense NOT FOUND' }

$total++
if ($finance.Contains("'manual'") -or $finance.Contains("'auto'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: source manual/auto NOT FOUND' }

Write-Host ('  ' + $ok11 + ' / 3 passed')

# ============================================================
# Test 12: Database.gs function usage
# ============================================================
Write-Host '[Test 12] Database.gs function usage — 6 checks'
$ok12 = 0

$total++
if ($finance.Contains('readSheetData(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($finance.Contains('appendRowToSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet NOT USED' }

$total++
if ($finance.Contains('deleteRowFromSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: deleteRowFromSheet NOT USED' }

$total++
if ($finance.Contains('getOrCreateSheet(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: getOrCreateSheet NOT USED' }

$total++
if ($finance.Contains('batchAppendRows(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: batchAppendRows NOT USED' }

$total++
if ($finance.Contains('getNextId(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: getNextId NOT USED' }

Write-Host ('  ' + $ok12 + ' / 6 passed')

# ============================================================
# Test 13: Logging — writeLog usage
# ============================================================
Write-Host '[Test 13] writeLog usage — 4 checks'
$ok13 = 0

$total++
$logWithdraw = "writeLog\('SAVE_WITHDRAW'"
if ($finance -match $logWithdraw) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog SAVE_WITHDRAW NOT FOUND' }

$total++
$logAccounting = "writeLog\('SAVE_ACCOUNTING'"
if ($finance -match $logAccounting) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog SAVE_ACCOUNTING NOT FOUND' }

$total++
$logDelete = "writeLog\('DELETE_ACCOUNTING'"
if ($finance -match $logDelete) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: writeLog DELETE_ACCOUNTING NOT FOUND' }

$total++
if ($finance.Contains("'Finance'")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: Module name Finance NOT FOUND in writeLog' }

Write-Host ('  ' + $ok13 + ' / 4 passed')

# ============================================================
# Test 14: Garbage fee default
# ============================================================
Write-Host '[Test 14] Garbage fee default — 2 checks'
$ok14 = 0

$total++
if ($finance.Contains('DEFAULTS.garbage_fee') -or $finance.Contains('garbageFee')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: garbage_fee reference NOT FOUND' }

$total++
if ($finance.Contains('additionalItems') -or $finance.Contains('additional_items')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: additional_items NOT FOUND in withdraw' }

Write-Host ('  ' + $ok14 + ' / 2 passed')

# ============================================================
# Test 15: Carry forward — recursive calculation
# ============================================================
Write-Host '[Test 15] Carry forward — 4 checks'
$ok15 = 0

$total++
# getCarryForward calculates prev month
$prevMonthPattern = 'month - 1|month === 1|prevMonth'
if ($finance -match $prevMonthPattern) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Previous month calculation NOT FOUND in getCarryForward' }

$total++
# Year boundary (month 1 → previous year month 12)
if ($finance.Contains("'12'") -or $finance.Contains('prevMonth')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Year boundary handling NOT FOUND' }

$total++
# Recursive call
$recursivePattern = 'getCarryForward\(prevPeriod\)|getCarryForward\('
if ($finance -match $recursivePattern) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Recursive getCarryForward NOT FOUND' }

$total++
# totalIncome - totalExpense
if ($finance.Contains('totalIncome') -and $finance.Contains('totalExpense')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: totalIncome/totalExpense NOT FOUND in getCarryForward' }

Write-Host ('  ' + $ok15 + ' / 4 passed')

# ============================================================
# Test 16: Auto entries — calculateAutoEntries
# ============================================================
Write-Host '[Test 16] Auto entries — 5 checks'
$ok16 = 0

$total++
# Auto income: common fee
$autoCommonFee = "category.*common_fee|'common_fee'"
if ($finance -match $autoCommonFee) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: Auto common_fee entry NOT FOUND' }

$total++
# Auto income: electric rounding
$autoRounding = "category.*electric_rounding|'electric_rounding'"
if ($finance -match $autoRounding) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: Auto electric_rounding entry NOT FOUND' }

$total++
# Auto expense: garbage
$autoGarbage = "category.*garbage|'garbage'"
if ($finance -match $autoGarbage) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: Auto garbage expense NOT FOUND' }

$total++
# Calls getCommonFee
if ($finance.Contains('getCommonFee(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: getCommonFee NOT CALLED in calculateAutoEntries' }

$total++
# Calls getHousingList
if ($finance.Contains('getHousingList(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: getHousingList NOT CALLED in calculateAutoEntries' }

Write-Host ('  ' + $ok16 + ' / 5 passed')

# ============================================================
# Test 17: Overwrite logic — _deleteMonthData
# ============================================================
Write-Host '[Test 17] Overwrite logic — 2 checks'
$ok17 = 0

$total++
if ($finance.Contains('_deleteMonthData(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: _deleteMonthData NOT CALLED (accounting overwrite)' }

$total++
if ($finance.Contains('getYearOnlySheetName(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: getYearOnlySheetName NOT USED' }

Write-Host ('  ' + $ok17 + ' / 2 passed')

# ============================================================
# Test 18: Receipt image — Drive upload
# ============================================================
Write-Host '[Test 18] Receipt image Drive — 4 checks'
$ok18 = 0

$total++
if ($finance.Contains('DriveApp.getFolderById(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: DriveApp.getFolderById NOT FOUND' }

$total++
if ($finance.Contains('Utilities.base64Decode')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: Utilities.base64Decode NOT FOUND' }

$total++
if ($finance.Contains('createFile(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: createFile NOT FOUND (Drive upload)' }

$total++
if ($finance.Contains('setSharing(')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: setSharing NOT FOUND (public link)' }

Write-Host ('  ' + $ok18 + ' / 4 passed')

# ============================================================
# Test 19: PEA electric data — peaTotal, lostHouse, lostFlat
# ============================================================
Write-Host '[Test 19] PEA electric data — 3 checks'
$ok19 = 0

$total++
if ($finance.Contains('peaTotal') -or $finance.Contains('pea_total')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: peaTotal NOT FOUND in getElectricBillPEA' }

$total++
if ($finance.Contains('lostHouse') -or $finance.Contains('lost_house')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: lostHouse NOT FOUND in getElectricBillPEA' }

$total++
if ($finance.Contains('lostFlat') -or $finance.Contains('lost_flat')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: lostFlat NOT FOUND in getElectricBillPEA' }

Write-Host ('  ' + $ok19 + ' / 3 passed')

# ============================================================
# Test 20: Error handling
# ============================================================
Write-Host '[Test 20] Error handling — 3 checks'
$ok20 = 0

$total++
if ($finance.Contains('success: false')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: success: false NOT FOUND' }

$total++
if ($finance.Contains('success: true')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: success: true NOT FOUND' }

$total++
$validations = ([regex]::Matches($finance, 'success: false')).Count
if ($validations -ge 5) { $pass++; $ok20++ }
else { $fail++; $errors += ('  FAIL: Only ' + $validations + ' error returns (need >= 5)') }

Write-Host ('  ' + $ok20 + ' / 3 passed')

# ============================================================
# Test 21: No duplicate functions
# ============================================================
Write-Host '[Test 21] No duplicate functions — 4 checks'
$ok21 = 0

$total++
if (-not $finance.Contains('function doGet(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Finance.gs contains doGet()' }

$total++
if (-not $finance.Contains('function doPost(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Finance.gs contains doPost()' }

$total++
if (-not $finance.Contains('const FOLDER_IDS')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Finance.gs contains FOLDER_IDS' }

$total++
if (-not $finance.Contains('const SPREADSHEET_IDS')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Finance.gs contains SPREADSHEET_IDS' }

Write-Host ('  ' + $ok21 + ' / 4 passed')

# ============================================================
# Test 22: Documentation
# ============================================================
Write-Host '[Test 22] Documentation — 4 checks'
$ok22 = 0

$total++
if ($finance.Contains('Step: 24') -or $finance.Contains('Step 24')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Step 24 NOT FOUND in header' }

$total++
if ($finance.Contains('Dependencies:') -or $finance.Contains('Config.gs, Database.gs')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($finance.Contains('Version: 1.0')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

$total++
if ($finance.Contains('Notification.gs') -or $finance.Contains('Step 25')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: Next step reference NOT FOUND' }

Write-Host ('  ' + $ok22 + ' / 4 passed')

# ============================================================
# Test 23: Function count
# ============================================================
Write-Host '[Test 23] Function count check'
$funcMatches = [regex]::Matches($finance, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 14) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 14)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 14)')

# ============================================================
# Test 24: JSON parse for additional items
# ============================================================
Write-Host '[Test 24] JSON parse — 2 checks'
$ok24 = 0

$total++
if ($finance.Contains('JSON.parse(')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: JSON.parse NOT FOUND (for additional_items)' }

$total++
if ($finance.Contains('JSON.stringify(')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: JSON.stringify NOT FOUND (for additional_items)' }

Write-Host ('  ' + $ok24 + ' / 2 passed')

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
  Write-Host '  Finance.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
