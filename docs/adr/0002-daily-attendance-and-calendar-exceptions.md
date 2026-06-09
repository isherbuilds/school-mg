# Daily Attendance and Calendar Exceptions

Accepted on 2026-06-09.

MVP attendance is daily section attendance with `present` and `absent` statuses, and the entry UI defaults every student to present so teachers only mark exceptions. Calendar exceptions such as holidays, closures, trips, half days, and late starts suppress or annotate expected attendance; they never create absences automatically.

Considered option: auto-mark students absent on holidays or configured non-standard days. Rejected because absence should mean the student missed an expected instructional attendance session, while a holiday or closure means no attendance was expected.
