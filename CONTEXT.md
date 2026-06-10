# school-mg

school-mg context defines school operations language for the MVP migration.

## Language

**Staff App**:
School-facing workspace for admins, teachers, principals, academic admins, and front-office staff.
_Avoid_: Admin panel, school-web, back office

**School Admin**:
Staff user responsible for setting up academic structure, staff access, and operating rules.
_Avoid_: Super admin, owner

**Teacher**:
Staff user responsible for assigned sections, subjects, attendance, timetable visibility, lesson logs, homework, and later marks.
_Avoid_: Faculty, instructor

**MVP**:
First useful staff-side school operations release: academic setup, people records, permissions, timetable, and attendance before finance, parent portal, AI, chat, or external integrations.
_Avoid_: Full school ERP, platform

**Grade Level**:
Academic level such as Nursery, Class 1, or Class 10.
_Avoid_: Class

**Section**:
Specific cohort within a grade level, such as Class 5 A or Class 5 B.
_Avoid_: Class, classroom, batch

**Access Role**:
Organization-level staff role that controls app access, broad navigation, and broad mutation rights.
_Avoid_: Department, job title

**Assignment Role**:
Contextual role attached to grade levels, sections, or subject offerings, such as coordinator, homeroom teacher, or subject teacher.
_Avoid_: Access role, department

**Coordinator**:
Staff assignment role for managing a defined group of grade levels or sections.
_Avoid_: Academic admin

**Enrollment Access**:
Future time-bound permission for admitting students during an admission period.
_Avoid_: Operations staff, front office

**Student Status**:
Student lifecycle state. MVP behavior primarily uses active and inactive, while the domain keeps room for prospect, withdrawn, and alumni.
_Avoid_: Admission status, enrollment status

**Student**:
Person record for a learner, stable across academic years and section changes.
_Avoid_: Enrollment, child record

**Guardian**:
Person responsible for student contact, emergency coordination, and later parent-facing access.
_Avoid_: Parent, billing party

**Student Relationship**:
Declared relationship between student and guardian or immediate family member, such as mother, father, sibling, grandparent, or guardian.
_Avoid_: Contact type, payer

**Enrollment**:
Time-bounded placement of a student in an academic year, grade level, and section.
_Avoid_: Student, class assignment

**Timetable**:
Manual weekly schedule of section periods, subjects, and assigned teachers.
_Avoid_: Solver, calendar

**Attendance Session**:
Daily section attendance record for an instructional day. MVP starts with present and absent statuses, with present as the default entry state.
_Avoid_: Period attendance, calendar event

**Calendar Exception**:
School calendar event that changes whether attendance is expected or how the day is labelled, such as holiday, closure, field trip, half day, or late start.
_Avoid_: Absence

**Subject**:
Reusable academic subject such as Mathematics or English.
_Avoid_: Course

**Subject Offering**:
Subject taught to a section during an academic year, with assigned teacher context.
_Avoid_: Subject, timetable slot

**Marksheet**:
Generated academic result document based on assessments and report-card state.
_Avoid_: Report card generator

**Local Fees**:
School-owned fee plans, charges, receipts, and balance snapshots before external accounting integration.
_Avoid_: Accounting, ledger

**Accounting Integration**:
Connection from School App local fee records to Edernal Books for official accounting documents and ledger truth.
_Avoid_: Finance MVP, local fees

**Transport Assignment**:
Student-level route and stop assignment for pickup/drop visibility.
_Avoid_: Transport operations, daily run

**Transport Operations**:
Full transport workflow for vehicles, crew, daily runs, incidents, GPS, maintenance, and compliance.
_Avoid_: Transport assignment
