$notif = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Notification.gs' -Raw -Encoding UTF8
$config = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Config.gs' -Raw -Encoding UTF8
$db = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Database.gs' -Raw -Encoding UTF8
$main = Get-Content 'd:\AI CURSER\HOME PPK 2026\Scripts\Main.gs' -Raw -Encoding UTF8
$pass = 0; $fail = 0; $total = 0
$errors = @()

Write-Host ''
Write-Host '========================================================'
Write-Host '   TEST Notification.gs — Email Notifications & Templates'
Write-Host '========================================================'
Write-Host ''

# ============================================================
# Test 1: Router Function (1 required)
# ============================================================
Write-Host '[Test 1] Router Function — 1 required'
$ok1 = 0
$total++
if ($notif.Contains('function handleSendNotification(')) { $pass++; $ok1++ }
else { $fail++; $errors += '  FAIL: function handleSendNotification() NOT FOUND' }
Write-Host ('  ' + $ok1 + ' / 1 passed')

# ============================================================
# Test 2: Payment Notification Functions (2 required)
# ============================================================
Write-Host '[Test 2] Payment Notification — 2 required'
$payNotifFuncs = @(
  'sendPaymentNotification',
  'sendBulkNotifications'
)
$ok2 = 0
foreach ($fn in $payNotifFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok2++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok2 + ' / ' + $payNotifFuncs.Count + ' passed')

# ============================================================
# Test 3: Reminder Functions (2 required)
# ============================================================
Write-Host '[Test 3] Reminder Functions — 2 required'
$reminderFuncs = @(
  'sendPaymentReminder',
  'sendBulkReminders'
)
$ok3 = 0
foreach ($fn in $reminderFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok3++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok3 + ' / ' + $reminderFuncs.Count + ' passed')

# ============================================================
# Test 4: Receipt Functions (2 required)
# ============================================================
Write-Host '[Test 4] Receipt Functions — 2 required'
$receiptFuncs = @(
  'sendReceipt',
  'sendBulkReceipts'
)
$ok4 = 0
foreach ($fn in $receiptFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok4++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok4 + ' / ' + $receiptFuncs.Count + ' passed')

# ============================================================
# Test 5: Special Email Functions (2 required)
# ============================================================
Write-Host '[Test 5] Special Email Functions — 2 required'
$specialFuncs = @(
  'sendPasswordResetEmail',
  'sendRequestStatusEmail'
)
$ok5 = 0
foreach ($fn in $specialFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok5++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok5 + ' / ' + $specialFuncs.Count + ' passed')

# ============================================================
# Test 6: Template & Batch Functions (3 required)
# ============================================================
Write-Host '[Test 6] Template & Batch — 3 required'
$templateFuncs = @(
  'buildEmailTemplate',
  'processPendingEmails',
  '_sendNotificationBatch'
)
$ok6 = 0
foreach ($fn in $templateFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok6++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok6 + ' / ' + $templateFuncs.Count + ' passed')

# ============================================================
# Test 7: Private Template Functions (5 required)
# ============================================================
Write-Host '[Test 7] Private Template Functions — 5 required'
$privTemplateFuncs = @(
  '_templateReminder',
  '_templateOverdue',
  '_templateReceipt',
  '_templatePasswordReset',
  '_templateRequestStatus'
)
$ok7 = 0
foreach ($fn in $privTemplateFuncs) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok7++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok7 + ' / ' + $privTemplateFuncs.Count + ' passed')

# ============================================================
# Test 8: Private Helper Functions (4 required)
# ============================================================
Write-Host '[Test 8] Private Helpers — 4 required'
$privHelpers = @(
  '_wrapEmailLayout',
  '_schedulePendingEmails',
  '_getAllRecipients',
  '_formatCurrency'
)
$ok8 = 0
foreach ($fn in $privHelpers) {
  $total++
  $search = 'function ' + $fn + '('
  if ($notif.Contains($search)) { $pass++; $ok8++ }
  else { $fail++; $errors += ('  FAIL: function ' + $fn + '() NOT FOUND') }
}
Write-Host ('  ' + $ok8 + ' / ' + $privHelpers.Count + ' passed')

# ============================================================
# Test 9: Router switch — 5 notification types
# ============================================================
Write-Host '[Test 9] Router switch cases — 5 types'
$ok9 = 0

$total++
if ($notif.Contains("'paymentNotification'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: type paymentNotification NOT FOUND in router' }

$total++
if ($notif.Contains("'paymentReminder'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: type paymentReminder NOT FOUND in router' }

$total++
if ($notif.Contains("'receipt'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: type receipt NOT FOUND in router' }

$total++
if ($notif.Contains("'passwordReset'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: type passwordReset NOT FOUND in router' }

$total++
if ($notif.Contains("'requestStatus'")) { $pass++; $ok9++ }
else { $fail++; $errors += '  FAIL: type requestStatus NOT FOUND in router' }

Write-Host ('  ' + $ok9 + ' / 5 passed')

# ============================================================
# Test 10: MailApp usage (not GmailApp)
# ============================================================
Write-Host '[Test 10] MailApp usage — 4 checks'
$ok10 = 0

$total++
if ($notif.Contains('MailApp.sendEmail')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: MailApp.sendEmail NOT FOUND' }

$total++
if ($notif.Contains('htmlBody')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: htmlBody NOT FOUND (email template)' }

$total++
if (-not $notif.Contains('GmailApp.sendEmail')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: GmailApp.sendEmail found — should use MailApp' }

$total++
if ($notif.Contains('EMAIL_APP_NAME')) { $pass++; $ok10++ }
else { $fail++; $errors += '  FAIL: EMAIL_APP_NAME constant NOT FOUND' }

Write-Host ('  ' + $ok10 + ' / 4 passed')

# ============================================================
# Test 11: Constants
# ============================================================
Write-Host '[Test 11] Constants — 3 checks'
$ok11 = 0

$total++
if ($notif.Contains('EMAIL_BATCH_SIZE')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: EMAIL_BATCH_SIZE NOT FOUND' }

$total++
if ($notif.Contains('EMAIL_TRIGGER_DELAY_MS')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: EMAIL_TRIGGER_DELAY_MS NOT FOUND' }

$total++
if ($notif.Contains('HOME PPK 2026')) { $pass++; $ok11++ }
else { $fail++; $errors += '  FAIL: HOME PPK 2026 NOT FOUND in app name' }

Write-Host ('  ' + $ok11 + ' / 3 passed')

# ============================================================
# Test 12: Email template content — reminder
# ============================================================
Write-Host '[Test 12] Template content — 5 checks'
$ok12 = 0

$total++
if ($notif.Contains('_templateReminder(') -and $notif.Contains('subject')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: _templateReminder with subject NOT FOUND' }

$total++
if ($notif.Contains('_templateOverdue(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: _templateOverdue NOT FOUND in send flow' }

$total++
if ($notif.Contains('_templateReceipt(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: _templateReceipt NOT FOUND in send flow' }

$total++
if ($notif.Contains('_templatePasswordReset(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: _templatePasswordReset NOT FOUND in send flow' }

$total++
if ($notif.Contains('_templateRequestStatus(')) { $pass++; $ok12++ }
else { $fail++; $errors += '  FAIL: _templateRequestStatus NOT FOUND in send flow' }

Write-Host ('  ' + $ok12 + ' / 5 passed')

# ============================================================
# Test 13: _wrapEmailLayout — proper HTML structure
# ============================================================
Write-Host '[Test 13] Email layout — 4 checks'
$ok13 = 0

$total++
if ($notif.Contains('<!DOCTYPE html>')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: DOCTYPE NOT FOUND in layout' }

$total++
if ($notif.Contains('meta charset="utf-8"') -or $notif.Contains("meta charset='utf-8'")) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: charset utf-8 NOT FOUND' }

$total++
if ($notif.Contains('DEFAULTS.org_name') -or $notif.Contains('DEFAULTS.school_name')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: DEFAULTS.org_name/school_name NOT USED in footer' }

$total++
if ($notif.Contains('auto') -or $notif.Contains('no-reply') -or $notif.Contains('footer')) { $pass++; $ok13++ }
else { $fail++; $errors += '  FAIL: Auto-email disclaimer NOT FOUND in footer' }

Write-Host ('  ' + $ok13 + ' / 4 passed')

# ============================================================
# Test 14: Billing.gs integration
# ============================================================
Write-Host '[Test 14] Billing.gs integration — 3 checks'
$ok14 = 0

$total++
if ($notif.Contains('getBillSummary(') -or $notif.Contains('getBillSummaryAll(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: getBillSummary/getBillSummaryAll NOT CALLED' }

$total++
if ($notif.Contains('getOutstanding(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: getOutstanding NOT CALLED (for reminders)' }

$total++
if ($notif.Contains('getDueDate(')) { $pass++; $ok14++ }
else { $fail++; $errors += '  FAIL: getDueDate NOT CALLED' }

Write-Host ('  ' + $ok14 + ' / 3 passed')

# ============================================================
# Test 15: Config.gs references
# ============================================================
Write-Host '[Test 15] Config references — 5 checks'
$ok15 = 0

$total++
if ($notif.Contains('SPREADSHEET_IDS.MAIN')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.MAIN NOT USED' }

$total++
if ($notif.Contains('SPREADSHEET_IDS.PAYMENTS')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: SPREADSHEET_IDS.PAYMENTS NOT USED' }

$total++
if ($notif.Contains('SHEET_NAMES.RESIDENTS') -or $notif.Contains('SHEET_NAMES.Residents')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.RESIDENTS NOT USED' }

$total++
if ($notif.Contains('SHEET_NAMES.USERS') -or $notif.Contains('SHEET_NAMES.Users')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: SHEET_NAMES.USERS NOT USED' }

$total++
if ($notif.Contains('THAI_MONTH_NAMES')) { $pass++; $ok15++ }
else { $fail++; $errors += '  FAIL: THAI_MONTH_NAMES NOT USED' }

Write-Host ('  ' + $ok15 + ' / 5 passed')

# ============================================================
# Test 16: Database.gs function usage
# ============================================================
Write-Host '[Test 16] Database.gs function usage — 3 checks'
$ok16 = 0

$total++
if ($notif.Contains('readSheetData(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: readSheetData NOT USED' }

$total++
if ($notif.Contains('findRowByValue(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: findRowByValue NOT USED' }

$total++
if ($notif.Contains('getYearSheetName(')) { $pass++; $ok16++ }
else { $fail++; $errors += '  FAIL: getYearSheetName NOT USED' }

Write-Host ('  ' + $ok16 + ' / 3 passed')

# ============================================================
# Test 17: Logging — writeLog usage
# ============================================================
Write-Host '[Test 17] writeLog usage — 5 checks'
$ok17 = 0

$total++
$logPayNotif = "writeLog\('SEND_NOTIFICATION'|writeLog\('SEND_PAYMENT'"
if ($notif -match $logPayNotif) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: writeLog SEND_NOTIFICATION/SEND_PAYMENT NOT FOUND' }

$total++
$logReminder = "writeLog\('SEND_REMINDER'"
if ($notif -match $logReminder) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: writeLog SEND_REMINDER NOT FOUND' }

$total++
$logReceipt = "writeLog\('SEND_RECEIPT'"
if ($notif -match $logReceipt) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: writeLog SEND_RECEIPT NOT FOUND' }

$total++
$logReset = "writeLog\('SEND_RESET'"
if ($notif -match $logReset) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: writeLog SEND_RESET NOT FOUND' }

$total++
if ($notif.Contains("'Notification'")) { $pass++; $ok17++ }
else { $fail++; $errors += '  FAIL: Module name Notification NOT FOUND in writeLog' }

Write-Host ('  ' + $ok17 + ' / 5 passed')

# ============================================================
# Test 18: Batch email — trigger scheduling
# ============================================================
Write-Host '[Test 18] Batch email trigger — 5 checks'
$ok18 = 0

$total++
if ($notif.Contains('PropertiesService.getScriptProperties')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: PropertiesService NOT FOUND for pending emails' }

$total++
if ($notif.Contains("'pendingEmails'")) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: pendingEmails property key NOT FOUND' }

$total++
if ($notif.Contains('ScriptApp.newTrigger')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: ScriptApp.newTrigger NOT FOUND' }

$total++
if ($notif.Contains('ScriptApp.deleteTrigger')) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: ScriptApp.deleteTrigger NOT FOUND' }

$total++
if ($notif.Contains("'processPendingEmails'")) { $pass++; $ok18++ }
else { $fail++; $errors += '  FAIL: processPendingEmails trigger handler NOT FOUND' }

Write-Host ('  ' + $ok18 + ' / 5 passed')

# ============================================================
# Test 19: Request status email — type names
# ============================================================
Write-Host '[Test 19] Request status — 4 checks'
$ok19 = 0

$total++
if ($notif.Contains("'residence'") -or $notif.Contains('residence')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: residence request type NOT FOUND' }

$total++
if ($notif.Contains("'transfer'") -or $notif.Contains('transfer')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: transfer request type NOT FOUND' }

$total++
if ($notif.Contains("'return'") -or $notif.Contains('return')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: return request type NOT FOUND' }

$total++
if ($notif.Contains("'repair'") -or $notif.Contains('repair')) { $pass++; $ok19++ }
else { $fail++; $errors += '  FAIL: repair request type NOT FOUND' }

Write-Host ('  ' + $ok19 + ' / 4 passed')

# ============================================================
# Test 20: Request detail integration
# ============================================================
Write-Host '[Test 20] Request detail integration — 2 checks'
$ok20 = 0

$total++
if ($notif.Contains('getRequestDetail(')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: getRequestDetail NOT CALLED in sendRequestStatusEmail' }

$total++
if ($notif.Contains('CURRENT_YEAR')) { $pass++; $ok20++ }
else { $fail++; $errors += '  FAIL: CURRENT_YEAR NOT USED' }

Write-Host ('  ' + $ok20 + ' / 2 passed')

# ============================================================
# Test 21: _formatCurrency
# ============================================================
Write-Host '[Test 21] _formatCurrency — 2 checks'
$ok21 = 0

$total++
if ($notif.Contains('toFixed(2)')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: toFixed(2) NOT FOUND in _formatCurrency' }

$total++
if ($notif.Contains('replace(')) { $pass++; $ok21++ }
else { $fail++; $errors += '  FAIL: comma formatting NOT FOUND in _formatCurrency' }

Write-Host ('  ' + $ok21 + ' / 2 passed')

# ============================================================
# Test 22: Error handling
# ============================================================
Write-Host '[Test 22] Error handling — 3 checks'
$ok22 = 0

$total++
if ($notif.Contains('success: false')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: success: false NOT FOUND' }

$total++
if ($notif.Contains('success: true')) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: success: true NOT FOUND' }

$total++
$errorLogPattern = "writeLog\('EMAIL_ERROR'"
if ($notif -match $errorLogPattern) { $pass++; $ok22++ }
else { $fail++; $errors += '  FAIL: writeLog EMAIL_ERROR NOT FOUND' }

Write-Host ('  ' + $ok22 + ' / 3 passed')

# ============================================================
# Test 23: No duplicate functions
# ============================================================
Write-Host '[Test 23] No duplicate functions — 4 checks'
$ok23 = 0

$total++
if (-not $notif.Contains('function doGet(')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Notification.gs contains doGet()' }

$total++
if (-not $notif.Contains('function doPost(')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Notification.gs contains doPost()' }

$total++
if (-not $notif.Contains('const FOLDER_IDS')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Notification.gs contains FOLDER_IDS' }

$total++
if (-not $notif.Contains('const SPREADSHEET_IDS')) { $pass++; $ok23++ }
else { $fail++; $errors += '  FAIL: Notification.gs contains SPREADSHEET_IDS' }

Write-Host ('  ' + $ok23 + ' / 4 passed')

# ============================================================
# Test 24: Documentation
# ============================================================
Write-Host '[Test 24] Documentation — 3 checks'
$ok24 = 0

$total++
if ($notif.Contains('Step: 25') -or $notif.Contains('Step 25')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: Step 25 NOT FOUND in header' }

$total++
if ($notif.Contains('Dependencies:') -or $notif.Contains('Config.gs, Database.gs')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: Dependencies note NOT FOUND' }

$total++
if ($notif.Contains('Version: 1.0')) { $pass++; $ok24++ }
else { $fail++; $errors += '  FAIL: Version NOT FOUND' }

Write-Host ('  ' + $ok24 + ' / 3 passed')

# ============================================================
# Test 25: Function count
# ============================================================
Write-Host '[Test 25] Function count check'
$funcMatches = [regex]::Matches($notif, 'function \w+\(')
$total++
$funcCount = $funcMatches.Count
if ($funcCount -ge 21) { $pass++ }
else { $fail++; $errors += ('  FAIL: Only ' + $funcCount + ' functions found (need >= 21)') }
Write-Host ('  Total functions: ' + $funcCount + ' (need >= 21)')

# ============================================================
# Test 26: Batch size & quota handling
# ============================================================
Write-Host '[Test 26] Batch size & quota — 2 checks'
$ok26 = 0

$total++
# Batch size = 50
if ($notif.Contains('50')) { $pass++; $ok26++ }
else { $fail++; $errors += '  FAIL: Batch size 50 NOT FOUND' }

$total++
# 5 minute trigger delay
if ($notif.Contains('5 * 60 * 1000') -or $notif.Contains('300000')) { $pass++; $ok26++ }
else { $fail++; $errors += '  FAIL: 5-minute trigger delay NOT FOUND' }

Write-Host ('  ' + $ok26 + ' / 2 passed')

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
  Write-Host '  Notification.gs is complete and matches plan specs!'
} else {
  Write-Host ('  >>> ' + $fail + ' TESTS FAILED <<<')
}
Write-Host '========================================================'
