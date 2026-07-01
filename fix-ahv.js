const fs = require('fs'); let c = fs.readFileSync('ppk-api.js', 'utf8');

let replaceStr = 
'            // ดึง sent_at จาก notifications มาใช้คำนวณ 10 วันนับจากวันแจ้ง\n' +
'            if (ahvOutRows && ahvOutRows.length > 0) {\n' +
'                try {\n' +
'                    var _aNotifs2 = await sbGet(\\'notifications\\', { house_number: \\'eq.\\' + ahvHouse, select: \\'period,sent_at\\', limit: \\'100\\' }).catch(function() { return []; });\n' +
'                    var _aNotifMap2 = {};\n' +
'                    (_aNotifs2 || []).forEach(function(n) { if (n.period) _aNotifMap2[n.period] = n.sent_at; });\n' +
'                    ahvOutRows.forEach(function(o) { o._sent_at = _aNotifMap2[o.period]; });\n' +
'                } catch(e) {}\n' +
'            }\n' +
'            var ahvCurOut = null;\n' +
'            var _ahvDisplayPeriod = ahvPeriod;\n' +
'            if (ahvOutRows && ahvOutRows.length > 0) {\n' +
'                for (var _ahi = 0; _ahi < ahvOutRows.length; _ahi++) {\n' +
'                    var _ahLast = ahvOutRows[_ahi];\n' +
'                    if (_ahLast && _ahLast.period) {\n' +
'                        var _isExp = false;\n' +
'                        if (_ahLast._sent_at) {\n' +
'                            var _ahDate = new Date(_ahLast._sent_at);\n' +
'                            if (!isNaN(_ahDate.getTime()) && ((ahvNow.getTime() - _ahDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {\n' +
'                                _isExp = true;\n' +
'                            }\n' +
'                        } else {\n' +
'                            _isExp = true;\n' +
'                        }\n' +
'                        if (!_isExp) {\n' +
'                            ahvCurOut = _ahLast;\n' +
'                            _ahvDisplayPeriod = _ahLast.period;\n' +
'                            break;\n' +
'                        }\n' +
'                    }\n' +
'                }\n' +
'            }\n' +
'            if (!ahvCurOut) {\n' +
'                ahvCurOut = (ahvOutRows || []).find(function(o) { return o.period === ahvPeriod && o._sent_at; });\n' +
'                _ahvDisplayPeriod = ahvPeriod;\n' +
'            }\n' +
'            var ahvCurNotif = null;\n' +
'            if (!ahvCurOut) {\n' +
'                try {\n' +
'                    var ahvNotifR = await sbGet(\\'notifications\\', { house_number: \\'eq.\\' + ahvHouse, period: \\'eq.\\' + _ahvDisplayPeriod, order: \\'sent_at.desc\\', limit: \\'1\\' });\n' +
'                    ahvCurNotif = ahvNotifR && ahvNotifR[0];\n' +
'                } catch(e) {}\n' +
'            }';

c = c.replace(
    /\\s*\\/\\/ ข้อมูลงวดปัจจุบัน\\s*var ahvCurOut = \\(ahvOutRows \\|\\| \\[\\]\\)\\.find\\(function\\(o\\) \\{ return o\\.period === ahvPeriod; \\}\\);\\s*\\/\\/ fallback: ถ้าไม่มีใน outstanding ให้ดึงจาก notifications\\s*var ahvCurNotif = null;\\s*if \\(!ahvCurOut\\) \\{\\s*try \\{\\s*var ahvNotifR = await sbGet\\('notifications', \\{ house_number: 'eq\\.' \\+ ahvHouse, period: 'eq\\.' \\+ ahvPeriod, order: 'sent_at\\.desc', limit: '1' \\}\\);\\s*ahvCurNotif = ahvNotifR && ahvNotifR\\[0\\];\\s*\\} catch\\(e\\) \\{\\}\\s*\\}/,
    replaceStr
);

c = c.replace(
    /var ahvCurSlip = \\(ahvSlipRows \\|\\| \\[\\]\\)\\.find\\(function\\(s\\) \\{ return s\\.period === ahvPeriod; \\}\\);/,
    'var ahvCurSlip = (ahvSlipRows || []).find(function(s) { return s.period === _ahvDisplayPeriod; });'
);

c = c.replace(
    /period:\\s*ahvPeriod,/,
    'period:           _ahvDisplayPeriod,'
);

c = c.replace(
    /var ahvTotalOs = \\(ahvOutRows \\|\\| \\[\\]\\)\\.filter\\(function\\(r\\) \\{ return r\\.status !== 'paid'; \\}\\)\\.reduce\\(function\\(s, r\\) \\{ return s \\+ \\(parseFloat\\(r\\.total_amount\\) \\|\\| 0\\); \\}, 0\\);/,
    'var ahvTotalOs = (ahvOutRows || []).filter(function(r) { return r.status !== \\'paid\\' && r.period !== _ahvDisplayPeriod; }).reduce(function(s, r) { return s + (parseFloat(r.total_amount) || 0); }, 0);'
);

fs.writeFileSync('ppk-api.js', c); console.log('done!');