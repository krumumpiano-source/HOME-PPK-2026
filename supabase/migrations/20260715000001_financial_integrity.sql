-- Migration: 20260715000001_financial_integrity.sql
-- Description: Implement secure RPCs for financial transactions to prevent race conditions and enforce ACID properties.

BEGIN;

-- 1. RPC for Slip Approval
CREATE OR REPLACE FUNCTION public.rpc_approve_slip(
    p_slip_id TEXT,
    p_status TEXT,
    p_reviewed_by TEXT,
    p_review_note TEXT,
    p_outstanding_id TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slip public.slip_submissions%ROWTYPE;
BEGIN
    -- 1. Lock the slip submission row
    SELECT * INTO v_slip
    FROM public.slip_submissions
    WHERE id = p_slip_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบสลิปนี้ในระบบ');
    END IF;

    IF v_slip.status = 'approved' OR v_slip.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'สลิปนี้ถูกตรวจไปแล้ว');
    END IF;

    -- 2. Update the slip
    UPDATE public.slip_submissions
    SET status = p_status,
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        review_note = p_review_note
    WHERE id = p_slip_id;

    -- 3. If approved, record payment and clear outstanding
    IF p_status = 'approved' THEN
        INSERT INTO public.payment_history (
            house_number, period, amount_paid, payment_date, payment_method, slip_id, recorded_by
        ) VALUES (
            v_slip.house_number, v_slip.period, v_slip.amount, CURRENT_DATE, 'transfer', p_slip_id, p_reviewed_by
        );

        IF p_outstanding_id IS NOT NULL THEN
            UPDATE public.outstanding
            SET status = 'paid', updated_at = now()
            WHERE id = p_outstanding_id;
        ELSE
            UPDATE public.outstanding
            SET status = 'paid', updated_at = now()
            WHERE house_number = v_slip.house_number 
              AND period = v_slip.period 
              AND status != 'paid';
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. RPC for Advance Reimbursement
CREATE OR REPLACE FUNCTION public.rpc_reimburse_advance(
    p_advance_id TEXT,
    p_amount NUMERIC,
    p_note TEXT,
    p_recorded_by TEXT,
    p_approved_by TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_adv public.advance_payments%ROWTYPE;
    v_new_reimbursed NUMERIC;
    v_new_status TEXT;
BEGIN
    -- 1. Lock the advance payment row
    SELECT * INTO v_adv
    FROM public.advance_payments
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบรายการเงินสำรองจ่าย');
    END IF;

    IF v_adv.status = 'reimbursed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'รายการนี้คืนเงินครบแล้ว');
    END IF;

    -- 2. Calculate safe limits
    v_new_reimbursed := COALESCE(v_adv.reimbursed_amount, 0) + p_amount;
    IF v_new_reimbursed > v_adv.amount THEN
        v_new_reimbursed := v_adv.amount;
    END IF;

    IF v_new_reimbursed >= v_adv.amount THEN
        v_new_status := 'reimbursed';
    ELSIF v_new_reimbursed > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;

    -- 3. Update the record
    UPDATE public.advance_payments
    SET reimbursed_amount = v_new_reimbursed,
        status = v_new_status,
        reimbursed_at = CASE WHEN v_new_status = 'reimbursed' THEN now() ELSE NULL END,
        reimbursed_note = p_note,
        approved_by = COALESCE(p_approved_by, approved_by),
        approved_at = CASE WHEN p_approved_by IS NOT NULL AND approved_at IS NULL THEN now() ELSE approved_at END,
        updated_at = now()
    WHERE id = p_advance_id;

    RETURN jsonb_build_object('success', true, 'status', v_new_status, 'reimbursed_amount', v_new_reimbursed);
END;
$$;

COMMIT;
