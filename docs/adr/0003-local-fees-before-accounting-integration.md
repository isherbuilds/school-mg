# Local Fees Before Accounting Integration

Accepted on 2026-06-09.

School App will build school operations first, then local school fee workflows, then connect those stable local fee records to Edernal Books for official accounting documents and ledger truth. Local fees include school-owned fee plans, billing parties, charges, receipts, and balance snapshots; accounting integration is a later boundary, not the starting point.

Considered option: connect to Edernal Books during the first MVP slice. Rejected because student, enrollment, fee, and receipt semantics need to stabilize locally before cross-repo API contracts and accounting references depend on them.
