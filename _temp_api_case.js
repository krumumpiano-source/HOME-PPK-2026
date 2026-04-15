        /* ── Admin Executive Report (Comprehensive) ─────────── */
        case 'adminReport': {
            var arSess = await _getSessionRole();
            if (!arSess || (arSess.role !== 'admin' && arSess.role !== 'head')) {
                return { success: false, error: '\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e44\u0e21\u0e48\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e1e\u0e2d' };
            }
            var arPeriods = data.periods || [];
            if (!arPeriods.length) return { success: false, error: '\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e23\u0e30\u0e1a\u0e38\u0e07\u0e27\u0e14' };

            // ── Parallel fetch ALL data ──
            var [arHousing, arResidents, arOutstanding, arRequests, arSlips,
                 arAccounting, arPayHist, arWaterBills, arElecBills,
                 arNotifs, arExemptions, arQueue, arAllSettings] = await Promise.all([
                sbGet('housing', { select: 'id,house_number,status,type' }).catch(function() { return []; }),
                sbGet('residents', { select: 'id,house_number,move_in_date,departed_at,is_active' }).catch(function() { return []; }),
                sbGet('outstanding', { select: 'id,house_number,period,water_amount,electric_amount,common_fee,garbage_fee,total_amount,status,moved_out_at' }).catch(function() { return []; }),
                sbGet('requests', { select: 'id,type,status,submitted_at' }).catch(function() { return []; }),
                sbGet('slip_submissions', { select: 'id,house_number,period,amount,status,submitted_at' }).catch(function() { return []; }),
                sbGet('accounting_entries', { select: 'id,period,type,category,description,amount,recorded_at' }).catch(function() { return []; }),
                sbGet('payment_history', { select: 'id,house_number,period,amount_paid,payment_date,payment_method' }).catch(function() { return []; }),
                sbGet('water_bills', { select: 'id,house_number,period,prev_meter,curr_meter,units_used,rate_per_unit,amount,status' }).catch(function() { return []; }),
                sbGet('electric_bills', { select: 'id,house_number,period,prev_meter,curr_meter,units_used,rate_per_unit,bill_amount,amount,method,status' }).catch(function() { return []; }),
                sbGet('notifications', { select: 'id,house_number,period,total_amount,sent_at' }).catch(function() { return []; }),
                sbGet('exemptions', { select: 'id,house_number,type,reason,start_date,end_date' }).catch(function() { return []; }),
                sbGet('queue', { select: 'id,user_id,position,status,created_at' }).catch(function() { return []; }),
                sbGet('settings', { select: 'key,value' }).catch(function() { return []; })
            ]);

            // ── Period helpers ──
            var arPeriodSet = {};
            arPeriods.forEach(function(p) { arPeriodSet[p] = true; });
            function _arDateToPeriod(d) {
                if (!d) return '';
                var dt = new Date(d);
                return (dt.getFullYear() + 543) + '-' + String(dt.getMonth() + 1).padStart(2, '0');
            }

            // ── 1. Housing overview ──
            var arHTotal = (arHousing || []).length;
            var arHOccupied = (arHousing || []).filter(function(h) { return h.status === 'occupied'; }).length;
            var arHAvailable = (arHousing || []).filter(function(h) { return h.status === 'available'; }).length;
            var arHMaint = (arHousing || []).filter(function(h) { return h.status === 'maintenance'; }).length;
            var arHouseCount = (arHousing || []).filter(function(h) { return h.type === 'house'; }).length;
            var arFlatCount = (arHousing || []).filter(function(h) { return h.type === 'flat'; }).length;
            var arActiveResidents = (arResidents || []).filter(function(r) { return r.is_active; }).length;
            var arMovedIn = 0, arMovedOut = 0;
            (arResidents || []).forEach(function(r) {
                var mip = _arDateToPeriod(r.move_in_date);
                if (mip && arPeriodSet[mip]) arMovedIn++;
                var mop = _arDateToPeriod(r.departed_at);
                if (mop && arPeriodSet[mop]) arMovedOut++;
            });

            // ── 2. Finance by period ──
            var arFinMap = {};
            arPeriods.forEach(function(p) {
                arFinMap[p] = { period: p, billed: 0, paid: 0, unpaid: 0, waived: 0, water: 0, electric: 0, common: 0, garbage: 0 };
            });
            var arTotalBilled = 0, arTotalPaid = 0, arTotalUnpaid = 0, arTotalWaived = 0;
            var arTotalWater = 0, arTotalElectric = 0, arTotalCommon = 0, arTotalGarbage = 0;
            (arOutstanding || []).forEach(function(o) {
                if (!arPeriodSet[o.period]) return;
                var bucket = arFinMap[o.period];
                if (!bucket) return;
                var amt = parseFloat(o.total_amount) || 0;
                var w = parseFloat(o.water_amount) || 0;
                var e = parseFloat(o.electric_amount) || 0;
                var c = parseFloat(o.common_fee) || 0;
                var g = parseFloat(o.garbage_fee) || 0;
                bucket.billed += amt;
                bucket.water += w; bucket.electric += e; bucket.common += c; bucket.garbage += g;
                arTotalBilled += amt; arTotalWater += w; arTotalElectric += e; arTotalCommon += c; arTotalGarbage += g;
                if (o.status === 'paid') { bucket.paid += amt; arTotalPaid += amt; }
                else if (o.status === 'waived') { bucket.waived += amt; arTotalWaived += amt; }
                else { bucket.unpaid += amt; arTotalUnpaid += amt; }
            });
            var arFinByPeriod = arPeriods.map(function(p) { return arFinMap[p]; }).filter(function(r) { return r.billed > 0 || r.paid > 0; });

            // ── 3. Requests ──
            var arReqMap = { residence: {}, transfer: {}, return: {}, repair: {} };
            function _arInitReq() { return { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 }; }
            ['residence','transfer','return','repair'].forEach(function(t) { arReqMap[t] = _arInitReq(); });
            (arRequests || []).forEach(function(r) {
                var rp = _arDateToPeriod(r.submitted_at);
                if (arPeriods.length > 0 && !arPeriodSet[rp]) return;
                var bucket = arReqMap[r.type];
                if (!bucket) return;
                bucket.total++;
                if (r.status === 'pending' || r.status === 'reviewing' || r.status === 'waiting') bucket.pending++;
                else if (r.status === 'approved' || r.status === 'completed') bucket.approved++;
                else if (r.status === 'rejected') bucket.rejected++;
                else if (r.status === 'cancelled') bucket.cancelled++;
            });

            // ── 4. Slips ──
            var arSlipMap = {};
            arPeriods.forEach(function(p) {
                arSlipMap[p] = { period: p, total: 0, approved: 0, rejected: 0, pending: 0 };
            });
            var arSlipTotal = 0, arSlipApproved = 0, arSlipRejected = 0, arSlipPending = 0;
            (arSlips || []).forEach(function(s) {
                if (!arPeriodSet[s.period]) return;
                var bucket = arSlipMap[s.period];
                if (!bucket) return;
                bucket.total++; arSlipTotal++;
                if (s.status === 'approved') { bucket.approved++; arSlipApproved++; }
                else if (s.status === 'rejected') { bucket.rejected++; arSlipRejected++; }
                else { bucket.pending++; arSlipPending++; }
            });
            var arSlipByPeriod = arPeriods.map(function(p) { return arSlipMap[p]; }).filter(function(r) { return r.total > 0; });

            // ── 5. Accounting (income / expense) ──
            var arAcctMap = {};
            arPeriods.forEach(function(p) { arAcctMap[p] = { period: p, income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }; });
            var arTotalIncome = 0, arTotalExpense = 0;
            (arAccounting || []).forEach(function(a) {
                if (!arPeriodSet[a.period]) return;
                var bucket = arAcctMap[a.period];
                if (!bucket) return;
                var amt = parseFloat(a.amount) || 0;
                if (a.type === 'income') { bucket.income += amt; bucket.incomeCount++; arTotalIncome += amt; }
                else if (a.type === 'expense') { bucket.expense += amt; bucket.expenseCount++; arTotalExpense += amt; }
            });
            var arAcctByPeriod = arPeriods.map(function(p) { return arAcctMap[p]; }).filter(function(r) { return r.income > 0 || r.expense > 0; });

            // ── 6. Monthly Withdraw (from settings) ──
            var arWithdrawals = [];
            var arTotalWithdraw = 0;
            (arAllSettings || []).forEach(function(s) {
                if (!s.key || !s.key.startsWith('monthly_withdraw_')) return;
                var period = s.key.replace('monthly_withdraw_', '');
                if (!arPeriodSet[period]) return;
                try {
                    var val = JSON.parse(s.value);
                    val.period = period;
                    arWithdrawals.push(val);
                    arTotalWithdraw += parseFloat(val.totalWithdraw) || 0;
                } catch(e) {}
            });
            arWithdrawals.sort(function(a, b) { return a.period.localeCompare(b.period); });

            // ── 7. Payment History ──
            var arPayMap = {};
            arPeriods.forEach(function(p) { arPayMap[p] = { period: p, count: 0, totalAmount: 0, transfer: 0, cash: 0 }; });
            var arPayTotal = 0, arPayAmount = 0, arPayTransfer = 0, arPayCash = 0;
            (arPayHist || []).forEach(function(ph) {
                if (!arPeriodSet[ph.period]) return;
                var bucket = arPayMap[ph.period];
                if (!bucket) return;
                var amt = parseFloat(ph.amount_paid) || 0;
                bucket.count++; bucket.totalAmount += amt; arPayTotal++; arPayAmount += amt;
                if (ph.payment_method === 'cash') { bucket.cash++; arPayCash++; }
                else { bucket.transfer++; arPayTransfer++; }
            });
            var arPayByPeriod = arPeriods.map(function(p) { return arPayMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 8. Water Bills ──
            var arWaterMap = {};
            arPeriods.forEach(function(p) { arWaterMap[p] = { period: p, count: 0, totalUnits: 0, totalAmount: 0 }; });
            var arWaterTotalBills = 0, arWaterTotalUnits = 0, arWaterTotalAmt = 0;
            (arWaterBills || []).forEach(function(wb) {
                if (!arPeriodSet[wb.period]) return;
                var bucket = arWaterMap[wb.period];
                if (!bucket) return;
                bucket.count++; arWaterTotalBills++;
                var u = parseFloat(wb.units_used) || 0;
                var a = parseFloat(wb.amount) || 0;
                bucket.totalUnits += u; bucket.totalAmount += a;
                arWaterTotalUnits += u; arWaterTotalAmt += a;
            });
            var arWaterByPeriod = arPeriods.map(function(p) { return arWaterMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 9. Electric Bills ──
            var arElecMap = {};
            arPeriods.forEach(function(p) { arElecMap[p] = { period: p, count: 0, totalUnits: 0, totalAmount: 0, totalPEA: 0 }; });
            var arElecTotalBills = 0, arElecTotalUnits = 0, arElecTotalAmt = 0, arElecTotalPEA = 0;
            (arElecBills || []).forEach(function(eb) {
                if (!arPeriodSet[eb.period]) return;
                var bucket = arElecMap[eb.period];
                if (!bucket) return;
                bucket.count++; arElecTotalBills++;
                var u = parseFloat(eb.units_used) || 0;
                var a = parseFloat(eb.amount) || 0;
                var pea = parseFloat(eb.bill_amount) || 0;
                bucket.totalUnits += u; bucket.totalAmount += a; bucket.totalPEA += pea;
                arElecTotalUnits += u; arElecTotalAmt += a; arElecTotalPEA += pea;
            });
            var arElecByPeriod = arPeriods.map(function(p) { return arElecMap[p]; }).filter(function(r) { return r.count > 0; });
            // Electric lost from settings
            var arElecLost = [];
            (arAllSettings || []).forEach(function(s) {
                if (!s.key || !s.key.startsWith('electric_lost_')) return;
                var period = s.key.replace('electric_lost_', '');
                if (!arPeriodSet[period]) return;
                try { var val = JSON.parse(s.value); val.period = period; arElecLost.push(val); } catch(e) {}
            });
            arElecLost.sort(function(a, b) { return a.period.localeCompare(b.period); });

            // ── 10. Notifications ──
            var arNotifMap = {};
            arPeriods.forEach(function(p) { arNotifMap[p] = { period: p, count: 0, totalAmount: 0 }; });
            var arNotifTotal = 0, arNotifTotalAmt = 0;
            (arNotifs || []).forEach(function(n) {
                if (!arPeriodSet[n.period]) return;
                var bucket = arNotifMap[n.period];
                if (!bucket) return;
                bucket.count++; arNotifTotal++;
                var amt = parseFloat(n.total_amount) || 0;
                bucket.totalAmount += amt; arNotifTotalAmt += amt;
            });
            var arNotifByPeriod = arPeriods.map(function(p) { return arNotifMap[p]; }).filter(function(r) { return r.count > 0; });

            // ── 11. Exemptions ──
            var arExemptByType = { water: 0, electric: 0, common_fee: 0, garbage: 0 };
            var arExemptTotal = (arExemptions || []).length;
            (arExemptions || []).forEach(function(ex) {
                if (arExemptByType.hasOwnProperty(ex.type)) arExemptByType[ex.type]++;
            });

            // ── 12. Queue ──
            var arQueueWaiting = (arQueue || []).filter(function(q) { return q.status === 'waiting'; }).length;
            var arQueueAssigned = (arQueue || []).filter(function(q) { return q.status === 'assigned'; }).length;
            var arQueueExpired = (arQueue || []).filter(function(q) { return q.status === 'expired'; }).length;
            var arQueueTotal = (arQueue || []).length;

            return {
                success: true,
                data: {
                    housing: { total: arHTotal, occupied: arHOccupied, available: arHAvailable, maintenance: arHMaint, houseCount: arHouseCount, flatCount: arFlatCount, activeResidents: arActiveResidents, movedIn: arMovedIn, movedOut: arMovedOut },
                    finance: {
                        summary: { totalBilled: arTotalBilled, totalPaid: arTotalPaid, totalUnpaid: arTotalUnpaid, totalWaived: arTotalWaived, totalWater: arTotalWater, totalElectric: arTotalElectric, totalCommon: arTotalCommon, totalGarbage: arTotalGarbage },
                        byPeriod: arFinByPeriod
                    },
                    requests: arReqMap,
                    slips: {
                        summary: { total: arSlipTotal, approved: arSlipApproved, rejected: arSlipRejected, pending: arSlipPending },
                        byPeriod: arSlipByPeriod
                    },
                    accounting: {
                        summary: { totalIncome: arTotalIncome, totalExpense: arTotalExpense, balance: arTotalIncome - arTotalExpense },
                        byPeriod: arAcctByPeriod
                    },
                    withdrawals: { total: arTotalWithdraw, byPeriod: arWithdrawals },
                    payments: {
                        summary: { total: arPayTotal, totalAmount: arPayAmount, transfer: arPayTransfer, cash: arPayCash },
                        byPeriod: arPayByPeriod
                    },
                    waterBills: {
                        summary: { totalBills: arWaterTotalBills, totalUnits: arWaterTotalUnits, totalAmount: arWaterTotalAmt },
                        byPeriod: arWaterByPeriod
                    },
                    electricBills: {
                        summary: { totalBills: arElecTotalBills, totalUnits: arElecTotalUnits, totalAmount: arElecTotalAmt, totalPEA: arElecTotalPEA },
                        byPeriod: arElecByPeriod,
                        lostData: arElecLost
                    },
                    notifications: {
                        summary: { total: arNotifTotal, totalAmount: arNotifTotalAmt },
                        byPeriod: arNotifByPeriod
                    },
                    exemptions: { total: arExemptTotal, byType: arExemptByType },
                    queue: { total: arQueueTotal, waiting: arQueueWaiting, assigned: arQueueAssigned, expired: arQueueExpired }
                }
            };
        }