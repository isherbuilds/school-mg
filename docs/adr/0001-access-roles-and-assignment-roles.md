# Access Roles and Assignment Roles

Accepted on 2026-06-09.

School App uses few organization-level access roles and separate contextual assignment roles. The MVP access roles are `owner`, `principal`, and `teacher`; contextual assignments such as `coordinator`, `homeroom_teacher`, and `subject_teacher` scope what staff can do for specific grade levels, sections, or subject offerings. This avoids turning every department or job title into a global permission role while still supporting precise school workflows.

Product surfaces use School Admin for the staff user responsible for initial setup and staff access. The implementation may back that responsibility with the `owner` access role, but `owner` is permission language, not the preferred frontend/domain label.

Considered option: copy the old `academic_admin` and `front_office` roles. Rejected because those names describe departments more than permission boundaries, and they would become confusing once coordinators, transport crew, finance staff, and other non-teaching staff are introduced.

Considered option: add `operations_staff` for student admission and profile maintenance. Rejected for MVP because real admission responsibility may belong to principals or finance/accountant staff depending on fee workflows. Student create/edit is principal-owned until a later finance/admission slice introduces explicit enrollment access or accountant permissions.
