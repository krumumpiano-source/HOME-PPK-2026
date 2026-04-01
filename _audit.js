var fs = require('fs');
var c = fs.readFileSync('ppk-api.js', 'utf8');
var lines = c.split('\n');

// 1. Bracket balance
var ob=0,cb=0,op=0,cp=0,oq=0,cq=0;
for(var i=0;i<c.length;i++){
  if(c[i]==='{')ob++;
  if(c[i]==='}')cb++;
  if(c[i]==='(')op++;
  if(c[i]===')')cp++;
  if(c[i]==='[')oq++;
  if(c[i]===']')cq++;
}
console.log('=== SYNTAX BALANCE ===');
console.log('Lines:', lines.length);
console.log('Braces { =', ob, '} =', cb, 'diff =', ob-cb);
console.log('Parens ( =', op, ') =', cp, 'diff =', op-cp);
console.log('Brackets [ =', oq, '] =', cq, 'diff =', oq-cq);

// 2. Find all case statements and check for break
console.log('\n=== CASE STATEMENTS ===');
var caseLines = [];
for(var i=0;i<lines.length;i++){
  var m = lines[i].match(/^\s*case\s+'([^']+)'/);
  if(m) caseLines.push({line: i+1, label: m[1]});
}
console.log('Total case labels:', caseLines.length);

// Check for breaks after each case
for(var ci=0;ci<caseLines.length;ci++){
  var start = caseLines[ci].line;
  var end = ci < caseLines.length-1 ? caseLines[ci+1].line : lines.length;
  var hasBreak = false;
  var hasReturn = false;
  for(var j=start;j<end && j<lines.length;j++){
    if(/\breturn\b/.test(lines[j])) hasReturn = true;
    if(/\bbreak\s*;/.test(lines[j])) hasBreak = true;
  }
  if(!hasBreak && !hasReturn){
    console.log('  WARN: case', caseLines[ci].label, '(L'+caseLines[ci].line+') - NO break/return before next case');
  }
}

// 3. Check for duplicate case labels
console.log('\n=== DUPLICATE CASE LABELS ===');
var labelMap = {};
caseLines.forEach(function(cl){
  if(!labelMap[cl.label]) labelMap[cl.label] = [];
  labelMap[cl.label].push(cl.line);
});
var hasDups = false;
Object.keys(labelMap).forEach(function(k){
  if(labelMap[k].length > 1){
    console.log('  DUPLICATE:', k, 'at lines', labelMap[k].join(', '));
    hasDups = true;
  }
});
if(!hasDups) console.log('  No duplicates found');

// 4. List all case labels
console.log('\n=== ALL CASE LABELS ===');
caseLines.forEach(function(cl){
  console.log('  L' + cl.line + ': ' + cl.label);
});

// 5. Check _STRICT_ADMIN_ACTIONS
console.log('\n=== _STRICT_ADMIN_ACTIONS ===');
var strictMatch = c.match(/var _STRICT_ADMIN_ACTIONS\s*=\s*\[([^\]]+)\]/);
if(strictMatch){
  var actions = strictMatch[1].match(/'([^']+)'/g).map(function(s){return s.replace(/'/g,'');});
  console.log('Contains:', actions.join(', '));
  var required = ['approveReturn','approveTransfer','approveSwap','adminInitiatedReturn','forceDeactivate'];
  required.forEach(function(r){
    console.log('  ' + r + ':', actions.indexOf(r)>=0 ? 'PASS' : 'MISSING');
  });
}

// 6. Check file start/end
console.log('\n=== FILE STRUCTURE ===');
console.log('First non-empty line:', lines.find(function(l){return l.trim().length>0;}).trim().substring(0,80));
var lastLines = lines.slice(-5).map(function(l,i){return 'L'+(lines.length-4+i)+': '+l;});
console.log('Last 5 lines:');
lastLines.forEach(function(l){console.log('  '+l);});

// 7. Check for stray }); or })
console.log('\n=== STRAY CLOSINGS ===');
var strayCount = 0;
for(var i=0;i<lines.length;i++){
  var trimmed = lines[i].trim();
  // Look for lines that are just }); or }) outside of proper context
  if(trimmed === '});' || trimmed === '})'){
    // Check if previous non-empty line ends with a function/callback pattern
    strayCount++;
  }
}
console.log('Lines with only }); or }):', strayCount, '(expected for callbacks/promises - review manually if high)');

// 8. Check new functions for error handling
console.log('\n=== ERROR HANDLING IN NEW FUNCTIONS ===');
var funcsToCheck = ['_logAction','_autoBackup','_autoSyncAccounting','_callEdge'];
funcsToCheck.forEach(function(fn){
  var fnRegex = new RegExp('(async\\s+)?function\\s+'+fn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\(');
  var found = false;
  for(var i=0;i<lines.length;i++){
    if(fnRegex.test(lines[i])){
      found = true;
      // Search for try-catch within the function (next 50 lines)
      var hasTry = false;
      for(var j=i;j<Math.min(i+80,lines.length);j++){
        if(/\btry\s*\{/.test(lines[j])) hasTry = true;
      }
      console.log('  '+fn+' (L'+(i+1)+'): try-catch =', hasTry ? 'YES' : 'NO');
      break;
    }
  }
  if(!found) console.log('  '+fn+': NOT FOUND as standalone function');
});

// Check case-based functions
var caseFuncsToCheck = ['approveReturn','approveTransfer','approveSwap','adminInitiatedReturn','forceDeactivate'];
caseFuncsToCheck.forEach(function(fn){
  var caseObj = caseLines.find(function(cl){return cl.label === fn;});
  if(!caseObj){
    console.log('  case '+fn+': NOT FOUND');
    return;
  }
  var start = caseObj.line;
  var nextCase = caseLines.find(function(cl){return cl.line > start;});
  var end = nextCase ? nextCase.line : lines.length;
  var hasTry = false;
  for(var j=start;j<end;j++){
    if(/\btry\s*\{/.test(lines[j])) hasTry = true;
  }
  console.log('  case '+fn+' (L'+start+'): try-catch =', hasTry ? 'YES' : 'NO');
});

// 9. Backward compat checks
console.log('\n=== BACKWARD COMPATIBILITY ===');

// Login: handle users.status being null
var loginCase = caseLines.find(function(cl){return cl.label === 'login';});
if(loginCase){
  var lStart = loginCase.line;
  var lEnd = lStart + 100;
  var hasStatusFallback = false;
  for(var j=lStart;j<Math.min(lEnd,lines.length);j++){
    if(/status\s*\|\|\s*'active'/.test(lines[j]) || /u\.status\s*\|\|/.test(lines[j])){
      hasStatusFallback = true;
      console.log('  Login status fallback: PASS (L'+(j+1)+')');
      break;
    }
  }
  if(!hasStatusFallback) console.log('  Login status fallback: CHECK MANUALLY');
}

// checkSession: handle null status
var found_cs_status = false;
for(var i=0;i<lines.length;i++){
  if(lines[i].indexOf('_csStatus') >= 0 && /\|\|\s*'active'/.test(lines[i])){
    found_cs_status = true;
    console.log('  checkSession status fallback: PASS (L'+(i+1)+')');
    break;
  }
}
if(!found_cs_status) console.log('  checkSession status fallback: CHECK MANUALLY');

// getBillSummaryAll: snapshot_name fallback
var bsaCase = caseLines.find(function(cl){return cl.label === 'getBillSummaryAll';});
if(bsaCase){
  var bsStart = bsaCase.line;
  var nextC = caseLines.find(function(cl){return cl.line > bsStart;});
  var bsEnd = nextC ? nextC.line : lines.length;
  var hasSnapshotFallback = false;
  for(var j=bsStart;j<bsEnd;j++){
    if(/snapshot_name\s*\|\|/.test(lines[j])){
      hasSnapshotFallback = true;
      console.log('  getBillSummaryAll snapshot_name fallback: PASS (L'+(j+1)+')');
      break;
    }
  }
  if(!hasSnapshotFallback) console.log('  getBillSummaryAll snapshot_name fallback: MISSING');
}

// submitWaterBill/submitElectricBill: try-catch for new columns
['submitWaterBill','submitElectricBill'].forEach(function(fn){
  var cObj = caseLines.find(function(cl){return cl.label === fn;});
  if(!cObj) return;
  var s = cObj.line;
  var nC = caseLines.find(function(cl){return cl.line > s;});
  var e = nC ? nC.line : lines.length;
  var hasRetrySansSnapshot = false;
  for(var j=s;j<e;j++){
    if(/resident_/.test(lines[j]) && /delete\s+.*resident_/.test(lines[j])){
      hasRetrySansSnapshot = true;
    }
  }
  console.log('  '+fn+' snapshot column fallback: '+(hasRetrySansSnapshot?'PASS':'CHECK MANUALLY'));
});

// 10. Parse check
console.log('\n=== JS PARSE CHECK ===');
try {
  new Function(c);
  console.log('  Syntax parse: PASS (no SyntaxError)');
} catch(e) {
  console.log('  Syntax parse: FAIL -', e.message);
}
