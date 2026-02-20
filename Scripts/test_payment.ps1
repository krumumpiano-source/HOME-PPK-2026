$payment = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Payment.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Payment.gs — Slip, Review, Manual, Outstanding'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Slip Submission Functions (4 required)
# ============================================================
Write-Host '[Test 1] Slip Submission Functions — 4 required'
$slipFuncs = @(
  'handleSubmitSlip',
  'getSlipSubmissions',
  'getSlipDetail',
  'handleReviewSlip'
)
$ok1 = 0
foreach ($fn in $slipFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($payment.Contains($search)) { $pass++; $ok1++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok1 + ' / ' + $slipFuncs.Count + ' passed')

# ============================================================
# Test 2: Manual Payment (1 required)
# ============================================================
Write-Host '[Test 2] Manual Payment — 1 required'
$ok2 = 0
$total++
if ($payment.Contains('function recordManualPayment(')) { $pass++; $ok2++ }
else { $fail++; $errors += '  FAIL: function recordManualPayment() NOT FOUND' }
Write-Host ('  ' + $ok2 + ' / 1 passed')

# ============================================================
# Test 3: History & Outstanding Functions (3 required)
# ============================================================
Write-Host '[Test 3] History & Outstanding — 3 required'
$histFuncs = @(
  'getPaymentHistory',
  'getOutstanding',
  'updateOutstanding'
)
$ok3 = 0
foreach ($fn in $histFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($payment.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $histFuncs.Count + ' passed')

# ============================================================
# Test 4: Image / Drive Functions (3 required)
# ============================================================
Write-Host '[Test 4] Image / Drive Functions — 3 required'
$imgFuncs = @(
  'uploadSlipImage',
  'saveSlipImage',
  'getSlipImageUrl'
)
$ok4 = 0
foreach ($fn in $imgFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($payment.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $imgFuncs.Count + ' passed')

# ============================================================
# Test 5: Year Sheet Functions (2 required)
# ============================================================
Write-Host '[Test 5] Year Sheet Functions — 2 required'
$yearFuncs = @(
  'createSlipYearSheet',
  'createPaymentHistoryYearSheet'
)
$ok5 = 0
foreach ($fn in $yearFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($payment.Contains($search)) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $yearFuncs.Count + ' passed')

# ============================================================
# Test 6: Private Helper Functions (7 required)
# ============================================================
Write-Host '[Test 6] Private Helpers — 7 required'
$privateFuncs = @(
  '_findSlipById',
  '_getSlipYear',
  '_createPaymentHistoryFromSlip',
  '_updateOutstandingFromSlip',
  '_updateOutstandingAfterPayment',
  '_sanitizeFileName',
  'testPayment'
)
$ok6 = 0
foreach ($fn in $privateFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($payment.Contains($search)) { $pass++; $ok6++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok6 + ' / ' + $privateFuncs.Count + ' passed')

# ============================================================
# Test 7: Schema Headers — 3 header arrays
# ============================================================
Write-Host '[Test 7] Schema Headers — 3 arrays'
$ok7 = 0

$total++
if ($payment.Contains('SLIP_SUBMISSIONS_HEADERS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: SLIP_SUBMISSIONS_HEADERS NOT FOUND' }

$total++
if ($payment.Contains('PAYMENT_HISTORY_HEADERS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: PAYMENT_HISTORY_HEADERS NOT FOUND' }

$total++
if ($payment.Contains('OUTSTANDING_HEADERS')) { $pass++; $ok7++ }
else { $fail++; $errors += '  FAIL: OUTSTANDING_HEADERS NOT FOUND' }

Write-Host ('  ' + $ok7 + ' / 3 passed')

# ============================================================
# Test 8: Slip Submission Headers — key columns
# ============================================================
Write-Host '[Test 8] Slip Headers — key columns'
$slipHeaders = @('slip_file_ids', 'payment_method', 'is_manual', 'reviewed_by', 'reviewed_at', 'review_note', 'submitted_at')
$ok8 = 0
foreach ($h in $slipHeaders) {
  $total++
  if ($payment.Contains("'$h'")) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: Slip header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $slipHeaders.Count + ' passed')

# ============================================================
# Test 9: Outstanding Headers — key columns
# ============================================================
Write-Host '[Test 9] Outstanding Headers — key columns'
$outHeaders = @('total_due', 'paid_amount', 'balance', 'last_updated')
$ok9 = 0
foreach ($h in $outHeaders) {
  $total++
  if ($payment.Contains("'$h'")) { $pass++; $ok9++ }
  else { $fail++; $errors += ('  FAIL: Outstanding header "' + $h + '" NOT FOUND') }
}
Write-Host ('  ' + $ok9 + ' / ' + $outHeaders.Count + ' passed')

# ============================================================
# Test 10: Config.gs references
# ============================================================
Write-Host '[Test 10] Config references — 5 checks'
$ok10 = 0

$total++
if ($payment.Contains('SPREADSHEET_IDS.PAYMENTS')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.PAYMENTS NOT USED' }

$total++
if ($payment.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($payment.Contains('CURRENT_YEAR')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: CURRENT_YEAR NOT USED' }

$total++
if ($payment.Contains('ID_PREFIXES.SLP')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.SLP NOT USED (slip)' }

$total++
if ($payment.Contains('ID_PREFIXES.PAY')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: ID_PREFIXES.PAY NOT USED (payment)' }

Write-Host ('  ' + $ok10 + ' / 5 passed')

# ============================================================
# Test 11: Slip status flow — pending → approved/rejected
# ============================================================
Write-Host '[Test 11] Slip status flow — 6 checks'
$ok11 = 0

$total++
if ($payment.Contains("'pending'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status pending NOT FOUND' }

$total++
if ($payment.Contains("'approved'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status approved NOT FOUND' }

$total++
if ($payment.Contains("'rejected'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status rejected NOT FOUND' }

$total++
if ($payment.Contains("'match'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status match NOT FOUND' }

$total++
if ($payment.Contains("'mismatch'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status mismatch NOT FOUND' }

$total++
if ($payment.Contains("'paid'")) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: status paid NOT FOUND (PaymentHistory)' }

Write-Host ('  ' + $ok11 + ' / 6 passed')

# ============================================================
# Test 12: Duplicate slip check
# ============================================================
Write-Host '[Test 12] Duplicate slip check — 2 checks'
$ok12 = 0

$total++
$dupPattern = 'duplicate|ส่งสลิป.*แล้ว|เดือนนี้แล้ว'
if ($payment -match $dupPattern) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Duplicate slip check NOT FOUND' }

$total++
# Check that duplicate filter uses both pending and approved
$dupStatusPattern = "pending.*approved|approved.*pending"
if ($payment -match $dupStatusPattern) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: Duplicate check should block pending+approved' }

Write-Host ('  ' + $ok12 + ' / 2 passed')

# ============================================================
# Test 13: Drive integration — slip images
# ============================================================
Write-Host '[Test 13] Drive integration — 4 checks'
$ok13 = 0

$total++
if ($payment.Contains('DriveApp.getFolderById(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: DriveApp.getFolderById NOT FOUND' }

$total++
if ($payment.Contains('getSlipFolderId(') -or $payment.Contains('SLIP_FOLDERS')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: getSlipFolderId / SLIP_FOLDERS NOT USED' }

$total++
if ($payment.Contains('base64Decode') -or $payment.Contains('Utilities.base64Decode')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: base64Decode NOT FOUND (needed for slip images)' }

$total++
if ($payment.Contains('createFile(')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: createFile NOT FOUND (needed for Drive upload)' }

Write-Host ('  ' + $ok13 + ' / 4 passed')

# ============================================================
# Test 14: Database.gs function usage
# ============================================================
Write-Host '[Test 14] Database.gs function usage — 6 checks'
$ok14 = 0

$total++
if ($payment.Contains('readSheetData(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($payment.Contains('appendRowToSheet(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: appendRowToSheet NOT USED' }

$total++
if ($payment.Contains('updateRowInSheet(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: updateRowInSheet NOT USED' }

$total++
if ($payment.Contains('deleteRowFromSheet(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: deleteRowFromSheet NOT USED' }

$total++
if ($payment.Contains('findRowByValue(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: findRowByValue NOT USED' }

$total++
if ($payment.Contains('getNextId(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: getNextId NOT USED' }

Write-Host ('  ' + $ok14 + ' / 6 passed')

# ============================================================
# Test 15: Logging — writeLog usage
# ============================================================
Write-Host '[Test 15] writeLog usage — 4 checks'
$ok15 = 0

$total++
$logSubmit = "writeLog\('SUBMIT_SLIP'"
if ($payment -match $logSubmit) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: writeLog SUBMIT_SLIP NOT FOUND' }

$total++
$logReview = "writeLog\('REVIEW_SLIP'"
if ($payment -match $logReview) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: writeLog REVIEW_SLIP NOT FOUND' }

$total++
$logManual = "writeLog\('MANUAL_PAYMENT'"
if ($payment -match $logManual) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: writeLog MANUAL_PAYMENT NOT FOUND' }

$total++
if ($payment.Contains("'Payment'")) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: Module name Payment NOT FOUND in writeLog' }

Write-Host ('  ' + $ok15 + ' / 4 passed')

# ============================================================
# Test 16: Manual payment flow — creates both Slip + PaymentHistory
# ============================================================
Write-Host '[Test 16] Manual payment flow — 4 checks'
$ok16 = 0

$total++
# Manual payment sets is_manual = TRUE
if ($payment.Contains("is_manual: 'TRUE'") -or $payment.Contains('is_manual: "TRUE"')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: is_manual TRUE NOT FOUND in recordManualPayment' }

$total++
# Manual payment calls getBillSummary
if ($payment.Contains('getBillSummary(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: getBillSummary NOT CALLED in manual payment' }

$total++
# Manual payment auto-approves (status = approved)
$manualApprovePattern = "function recordManualPayment[\s\S]*?status.*'approved'"
if ($payment -match $manualApprovePattern) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: Manual payment auto-approve NOT FOUND' }

$total++
# Manual payment updates outstanding
if ($payment.Contains('_updateOutstandingAfterPayment(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: _updateOutstandingAfterPayment NOT CALLED' }

Write-Host ('  ' + $ok16 + ' / 4 passed')

# ============================================================
# Test 17: Review slip — creates PaymentHistory on approve
# ============================================================
Write-Host '[Test 17] Review slip flow — 3 checks'
$ok17 = 0

$total++
if ($payment.Contains('_createPaymentHistoryFromSlip(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: _createPaymentHistoryFromSlip NOT CALLED' }

$total++
if ($payment.Contains('_updateOutstandingFromSlip(')) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: _updateOutstandingFromSlip NOT CALLED' }

$total++
$approveFlowPattern = "(?s)approved.*?_createPaymentHistory|(?s)match.*?_createPaymentHistory"
if ($payment -match $approveFlowPattern) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: PaymentHistory creation only on approve/match NOT FOUND' }

Write-Host ('  ' + $ok17 + ' / 3 passed')

# ============================================================
# Test 18: Outstanding — balance calculation
# ============================================================
Write-Host '[Test 18] Outstanding balance — 3 checks'
$ok18 = 0

$total++
if ($payment.Contains('balance')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: balance field NOT FOUND' }

$total++
# Outstanding filtering balance > 0
$balanceFilter = 'balance.*> 0|balance.*>0'
if ($payment -match $balanceFilter) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: balance > 0 filter NOT FOUND in getOutstanding' }

$total++
if ($payment.Contains('SHEET_NAMES.OUTSTANDING') -or $payment.Contains("SHEET_NAMES.Outstanding")) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.OUTSTANDING NOT USED' }

Write-Host ('  ' + $ok18 + ' / 3 passed')

# ============================================================
# Test 19: Error handling
# ============================================================
Write-Host '[Test 19] Error handling — 3 checks'
$ok19 = 0

$total++
if ($payment.Contains('success: false')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: success: false NOT FOUND' }

$total++
if ($payment.Contains('success: true')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: success: true NOT FOUND' }

$total++
$validations = ([regex]::Matches($payment, 'success: false')).Count
if ($validations -ge 5) { $pass++; $ok19++ }
else { $fail++; $errors += ('  FAIL: Only ' + $validations + ' error returns (need >= 5)') }

Write-Host ('  ' + $ok19 + ' / 3 passed')

# ============================================================
# Test 20: No duplicate functions
# ============================================================
Write-Host '[Test 20] No duplicate functions — 4 checks'
$ok20 = 0

$total++
if (-not $payment.Contains('function doGet(')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Payment.gs contains doGet()' }

$total++
if (-not $payment.Contains('function doPost(')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Payment.gs contains doPost()' }

$total++
if (-not $payment.Contains('const FOLDER_IDS')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Payment.gs contains FOLDER_IDS' }

$total++
if (-not $payment.Contains('const SPREADSHEET_IDS')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: Payment.gs contains SPREADSHEET_IDS' }

Write-Host ('  ' + $ok20 + ' / 4 passed')

# ============================================================
# Test 21: Documentation
# ============================================================
Write-Host '[Test 21] Documentation — 4 checks'
$ok21 = 0

$total++
if ($payment.Contains('Step: 22') -or $payment.Contains('Step 22')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Step 22 NOT FOUND in header' }

$total++
if ($payment.Contains('Dependencies:') -or $payment.Contains('Config.gs, Database.gs')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($payment.Contains('Version: 1.0')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

$total++
if ($payment.Contains('Request.gs') -or $payment.Contains('Step 23')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: Next step reference NOT FOUND' }

Write-Host ('  ' + $ok21 + ' / 4 passed')

# ============================================================
# Test 22: Function count
# ============================================================
Write-Host '[Test 22] Function count check'
$funcMatches = [regex]::Matches($payment, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 20) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 20)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 20)')

# ============================================================
# Test 23: _sanitizeFileName — safe filenames
# ============================================================
Write-Host '[Test 23] _sanitizeFileName — 2 checks'
$ok23 = 0

$total++
if ($payment.Contains('replace(')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: replace NOT FOUND in _sanitizeFileName' }

$total++
if ($payment.Contains('function _sanitizeFileName(')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: _sanitizeFileName NOT FOUND' }

Write-Host ('  ' + $ok23 + ' / 2 passed')

# ============================================================
# Test 24: Housing.gs integration
# ============================================================
Write-Host '[Test 24] Housing.gs integration — 2 checks'
$ok24 = 0

$total++
if ($payment.Contains('getResidentsList(')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: getResidentsList NOT CALLED' }

$total++
if ($payment.Contains('getYearSheetName(')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: getYearSheetName NOT USED' }

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
  Write-Host '  Payment.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
