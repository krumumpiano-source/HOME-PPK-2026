---
name: financial-integrity
description: Use when building or modifying financial, accounting, billing, or payment features (e.g., ledgers, wallets, withdrawals, slip verification) to ensure transaction integrity and prevent race conditions.
---

# Financial Integrity & Accounting Patterns

## Overview
When dealing with money, standard CRUD patterns are dangerous. This skill provides bulletproof patterns for handling financial data, preventing race conditions, avoiding floating-point math errors, and maintaining audit trails, especially within the context of Thai financial systems (e-Slips, PromptPay, etc.).

## When to Use
- Implementing wallets, balances, or withdrawal systems
- Building payment gateways or slip verification systems
- Creating ledgers, accounting reports, or receipts
- Modifying database schemas related to money
- **Symptoms**: Race conditions in balances, floating-point rounding errors, lost transaction histories.

## Core Principles

### 1. Never Trust the Client (No Client-Side Math)
**❌ BAD:** Client calculates `newBalance = oldBalance - amount` and sends to DB.
**✅ GOOD:** Client sends `withdraw(amount)`. Database uses RPC/Transactions with Row-Level Locks (`SELECT ... FOR UPDATE`) to calculate and update safely.

### 2. Floating Point is Evil
**❌ BAD:** Using `FLOAT` or `REAL` for money (e.g., `10.01 + 10.02 = 20.02999999`).
**✅ GOOD:** Use `NUMERIC(12,2)` or `DECIMAL` in PostgreSQL. Alternatively, store money as integers (Satang / Cents) and divide by 100 on the frontend.

### 3. Immutable Ledgers (No DELETES)
**❌ BAD:** `DELETE FROM payments WHERE id = 123` or `UPDATE payments SET amount = 500`.
**✅ GOOD:** Insert a compensating/reversing entry (e.g., `amount = -123`). If you must update status, keep a strict `status` column (`pending`, `completed`, `voided`) with an `audit_log` table tracking who changed what and when.

### 4. Idempotency Keys
**❌ BAD:** User double-clicks "Pay", two identical transactions are created.
**✅ GOOD:** Generate a unique `idempotency_key` (e.g., UUID) on the client when the form loads. The database enforces `UNIQUE(idempotency_key)` so the second submission fails or returns the first result.

## Implementation Patterns (Supabase / PostgreSQL)

### Safe Balance Updates (RPC)
Always use stored procedures (RPC) for balance changes to leverage ACID properties.

```sql
CREATE OR REPLACE FUNCTION safe_withdraw(user_id UUID, amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance NUMERIC;
BEGIN
    -- 1. Lock the row to prevent race conditions
    SELECT balance INTO current_balance 
    FROM accounts 
    WHERE id = user_id FOR UPDATE;

    -- 2. Validate
    IF current_balance < amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;

    -- 3. Execute update and audit log
    UPDATE accounts SET balance = balance - amount WHERE id = user_id;
    INSERT INTO transactions (account_id, amount, type) VALUES (user_id, -amount, 'withdrawal');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## Thai Financial Context (Specifics)

### e-Slip Verification (สลิปโอนเงิน)
When users upload transfer slips:
1. **Never trust the image alone**: Use an OCR API (like SlipOK or EasySlip) to extract the QR code payload.
2. **Verify with Bank**: Ensure the receiver account matches your corporate account, the amount matches the invoice, and the transaction date is recent.
3. **Prevent Re-use**: Store the slip's unique bank reference number (`transRef` or `ref1`) as a `UNIQUE` column in your database to prevent users from uploading the same slip twice.

### Receipts (ใบเสร็จรับเงิน)
Thai tax law requires running numbers for receipts without gaps (e.g., `INV-202607-001`). 
**Pattern**: Generate the receipt number **ONLY** at the exact moment the payment is marked `completed` via a database sequence or serialized transaction. Do not generate it when the invoice is `pending`.

## Common Mistakes & Red Flags
- 🚩 "I'll fetch the balance, subtract the amount in JS, and update." -> **STOP**. Use RPC/Transactions.
- 🚩 "I'll just delete the wrong payment record." -> **STOP**. Void it or offset it.
- 🚩 "Amount is stored as `float8`." -> **STOP**. Alter to `numeric(10,2)`.
- 🚩 "Checking if the slip image is valid by looking at it." -> **STOP**. Use QR extraction and verify the bank reference.
