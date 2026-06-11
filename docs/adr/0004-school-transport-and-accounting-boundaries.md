# School, Transport, and Accounting Boundaries

Accepted on 2026-06-11.

School App owns staff-side school operations, including students, enrollments, attendance, school fee intent, school-specific billing history, and student transport assignment. Transport operations may grow into a separate app for vehicles, crew, routes, runs, incidents, GPS, maintenance, expenses, and compliance. Edernal Books owns accounting truth: ledger, invoices and bills, receipts and payments, parties, vendor records, accounting reports, and tax/accounting documents.

These apps integrate through public APIs, webhooks, idempotent events, and external references. They do not share tables directly. School App and future Transport App may record operational facts, accounting-ready intent, and domain-facing financial summaries, but Edernal Books remains the system that posts accounting documents and returns accounting document IDs, status, and ledger outcomes.

The integration rule is: operational apps own context, while Edernal Books owns posting. School App answers school-context questions such as student fee history by academic year, enrollment, guardian, section, or fee plan. Future Transport App answers transport-context questions such as vehicle expense history, route cost, run incidents, driver advances, or maintenance spend. Edernal Books answers accounting-context questions such as receivables, payables, bank/cash balance, vendor history, tax documents, trial balance, profit and loss, and balance sheet.

Considered option: keep all school fees, transport expenses, and accounting tables inside School App. Rejected because school operations and accounting have different invariants, release timing, permissions, and audit expectations.

Considered option: make transport a separate product immediately. Rejected for the MVP because School App only needs student route and stop assignment now. Full transport operations remain separate-product-compatible without pulling logistics complexity into the first school release.
