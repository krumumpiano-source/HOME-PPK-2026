const fs = require('fs');
let c = fs.readFileSync('ppk-api.js', 'utf8');

// Normalize to \n for matching, then restore
const hadCRLF = c.includes('\r\n');
if (hadCRLF) c = c.replace(/\r\n/g, '\n');

// ============================================================
// FIX 1: Resident Dashboard proxy assignments
// ============================================================
const oldResidentProxy =
`                            var upaOut = null;
                            try { var upaOutR = await sbGet('outstanding', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, moved_out_at: 'is.null', limit: '1' }); upaOut = upaOutR && upaOutR[0]; } catch(e) {}
                            // fallback: ถ้าไม่มี outstanding ให้ดึงจาก notifications (แหล่งจริงที่ admin แจ้งยอด)
                            var upaNotif = null;
                            if (!upaOut) {
                                try { var upaNotifR = await sbGet('notifications', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, order: 'sent_at.desc', limit: '1' }); upaNotif = upaNotifR && upaNotifR[0]; } catch(e) {}
                            }
                            var upaSrc = upaOut || upaNotif;
                            var upaSlip = null;
                            try { var upaSlipR = await sbGet('slip_submissions', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + period, order: 'submitted_at.desc', limit: '1' }); upaSlip = upaSlipR && upaSlipR[0]; } catch(e) {}`;

const newResidentProxy =
`                            var upaOut = null;
                            var _upaPeriod = period;
                            try {
                                var upaOutAll = await sbGet('outstanding', { house_number: 'eq.' + upaP.house_number, status: 'neq.paid', order: 'period.desc', limit: '12' }).catch(function() { return []; });
                                if (upaOutAll && upaOutAll.length > 0) {
                                    var _upaNots = await sbGet('notifications', { house_number: 'eq.' + upaP.house_number, select: 'period,sent_at', limit: '100' }).catch(function() { return []; });
                                    var _upaNotMap = {};
                                    (_upaNots || []).forEach(function(n) { if (n.period) _upaNotMap[n.period] = n.sent_at; });
                                    upaOutAll.forEach(function(o) { o._sent_at = _upaNotMap[o.period]; });
                                    for (var _upai2 = 0; _upai2 < upaOutAll.length; _upai2++) {
                                        var _upaB = upaOutAll[_upai2];
                                        if (_upaB && _upaB.period) {
                                            var _upaExp = false;
                                            if (_upaB._sent_at) {
                                                var _upaD = new Date(_upaB._sent_at);
                                                if (!isNaN(_upaD.getTime()) && ((now.getTime() - _upaD.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                                                    _upaExp = true;
                                                }
                                            } else {
                                                _upaExp = true;
                                            }
                                            if (!_upaExp) {
                                                upaOut = _upaB;
                                                _upaPeriod = _upaB.period;
                                                break;
                                            }
                                        }
                                    }
                                }
                            } catch(e) {}
                            var upaSrc = upaOut;
                            var upaSlip = null;
                            try { var upaSlipR = await sbGet('slip_submissions', { house_number: 'eq.' + upaP.house_number, period: 'eq.' + _upaPeriod, order: 'submitted_at.desc', limit: '1' }); upaSlip = upaSlipR && upaSlipR[0]; } catch(e) {}`;

if (c.includes(oldResidentProxy)) {
    c = c.replace(oldResidentProxy, newResidentProxy);
    console.log('FIX 1 (Resident proxy): Applied OK');
} else {
    console.log('FIX 1 (Resident proxy): NOT FOUND');
}

// Fix period in push() for Resident proxy
c = c.replace(
    "house_number: upaP.house_number, resident_name: upaResName, period: period,",
    "house_number: upaP.house_number, resident_name: upaResName, period: _upaPeriod,"
);
console.log('FIX 1b (Resident proxy period in push): Applied');

// ============================================================
// FIX 2: Admin Dashboard proxy assignments
// ============================================================
const oldAdminProxy =
`                        var ahvPAOut = null;
                        try { var ahvPAOutR = await sbGet('outstanding', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, limit: '1' }); ahvPAOut = ahvPAOutR && ahvPAOutR[0]; } catch(e) {}
                        if (!ahvPAOut) {
                            try { var ahvPANotifR = await sbGet('notifications', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, order: 'sent_at.desc', limit: '1' }); if (ahvPANotifR && ahvPANotifR[0]) ahvPAOut = ahvPANotifR[0]; } catch(e) {}
                        }
                        var ahvPASlip = null;
                        try { var ahvPASlipR = await sbGet('slip_submissions', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + ahvPeriod, order: 'submitted_at.desc', limit: '1' }); ahvPASlip = ahvPASlipR && ahvPASlipR[0]; } catch(e) {}`;

const newAdminProxy =
`                        var ahvPAOut = null;
                        var _ahvPAPeriod = ahvPeriod;
                        try {
                            var ahvPAOutAll = await sbGet('outstanding', { house_number: 'eq.' + ahvPA.house_number, status: 'neq.paid', order: 'period.desc', limit: '12' }).catch(function() { return []; });
                            if (ahvPAOutAll && ahvPAOutAll.length > 0) {
                                var _paNots = await sbGet('notifications', { house_number: 'eq.' + ahvPA.house_number, select: 'period,sent_at', limit: '100' }).catch(function() { return []; });
                                var _paNotMap = {};
                                (_paNots || []).forEach(function(n) { if (n.period) _paNotMap[n.period] = n.sent_at; });
                                ahvPAOutAll.forEach(function(o) { o._sent_at = _paNotMap[o.period]; });
                                for (var _pai = 0; _pai < ahvPAOutAll.length; _pai++) {
                                    var _paB = ahvPAOutAll[_pai];
                                    if (_paB && _paB.period) {
                                        var _paExp = false;
                                        if (_paB._sent_at) {
                                            var _paD = new Date(_paB._sent_at);
                                            if (!isNaN(_paD.getTime()) && ((ahvNow.getTime() - _paD.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                                                _paExp = true;
                                            }
                                        } else {
                                            _paExp = true;
                                        }
                                        if (!_paExp) {
                                            ahvPAOut = _paB;
                                            _ahvPAPeriod = _paB.period;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch(e) {}
                        var ahvPASlip = null;
                        try { var ahvPASlipR = await sbGet('slip_submissions', { house_number: 'eq.' + ahvPA.house_number, period: 'eq.' + _ahvPAPeriod, order: 'submitted_at.desc', limit: '1' }); ahvPASlip = ahvPASlipR && ahvPASlipR[0]; } catch(e) {}`;

if (c.includes(oldAdminProxy)) {
    c = c.replace(oldAdminProxy, newAdminProxy);
    console.log('FIX 2 (Admin proxy): Applied OK');
} else {
    console.log('FIX 2 (Admin proxy): NOT FOUND');
}

// Fix period in push() for Admin proxy
c = c.replace(
    "house_number: ahvPA.house_number, resident_name: ahvPAResName, period: ahvPeriod,",
    "house_number: ahvPA.house_number, resident_name: ahvPAResName, period: _ahvPAPeriod,"
);
console.log('FIX 2b (Admin proxy period in push): Applied');

// Restore CRLF if original had it
if (hadCRLF) c = c.replace(/\n/g, '\r\n');

fs.writeFileSync('ppk-api.js', c);
console.log('All fixes written to ppk-api.js');
