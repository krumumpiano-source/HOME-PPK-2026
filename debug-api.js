
async function sbGet(table, params) {
    let url = 'https://mwigdgxrfpcmfjuztmip.supabase.co/rest/v1/' + table + '?';
    let q = [];
    for (let k in params) {
        if (k === 'select') q.push('select=' + params[k]);
        else if (k === 'order') q.push('order=' + params[k]);
        else if (k === 'limit') q.push('limit=' + params[k]);
        else q.push(k + '=' + params[k]);
    }
    url += q.join('&');
    const res = await fetch(url, { headers: { apikey: 'sb_publishable_DInAJWyKXTwcxC79jNiS9A_PDxjKWHL', Authorization: 'Bearer sb_publishable_DInAJWyKXTwcxC79jNiS9A_PDxjKWHL' } });
    return res.json();
}

async function run() {
    let sessHouseNumber = 'บ้าน7';
    let adminPeriod = '2569-07';
    let now2 = new Date('2026-07-01T12:00:00+07:00');
    
    let adminOutRows = await sbGet('outstanding', { house_number: 'eq.' + encodeURIComponent(sessHouseNumber), status: 'neq.paid', order: 'period.desc', limit: '12' });
    
    if (adminOutRows.length > 0) {
        let _aNotifs = await sbGet('notifications', { house_number: 'eq.' + encodeURIComponent(sessHouseNumber), select: 'period,sent_at', limit: '100' });
        let _aNotifMap = {};
        (_aNotifs || []).forEach(n => { if (n.period) _aNotifMap[n.period] = n.sent_at; });
        adminOutRows.forEach(o => { o._sent_at = _aNotifMap[o.period]; });
    }
    
    let adminCurrentOut = null;
    let _adminDisplayPeriod = adminPeriod;
    
    if (adminOutRows.length > 0) {
        for (let _ai = 0; _ai < adminOutRows.length; _ai++) {
            let _aLast = adminOutRows[_ai];
            if (_aLast && _aLast.period) {
                let _isExpired = false;
                if (_aLast._sent_at) {
                    let _aDate = new Date(_aLast._sent_at);
                    if (!isNaN(_aDate.getTime()) && ((now2.getTime() - _aDate.getTime()) / (1000 * 60 * 60 * 24) > 10)) {
                        _isExpired = true;
                    }
                } else {
                    _isExpired = true;
                }
                if (!_isExpired) {
                    adminCurrentOut = _aLast; 
                    _adminDisplayPeriod = _aLast.period;
                    break;
                }
            }
        }
    }
    
    if (!adminCurrentOut) {
        adminCurrentOut = adminOutRows.find(o => o.period === adminPeriod && o._sent_at);
        _adminDisplayPeriod = adminPeriod;
    }
    
    console.log('adminCurrentOut:', adminCurrentOut ? adminCurrentOut.period : null);
    console.log('_adminDisplayPeriod:', _adminDisplayPeriod);
}
run();