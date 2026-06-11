# School Bootstrap Through App Procedure

Accepted on 2026-06-11.

School creation is a Staff App workflow, even though tenancy and membership are backed by Better Auth organization records. A signed-in user creates a school through a School App bootstrap procedure that creates or activates the underlying organization, creates the school actor, and assigns the owner access role so the user immediately becomes the School Admin for that school.

The first user may create multiple schools. The data model and bootstrap flow should support this from the start, while the MVP user experience can still optimize for the first active school and defer a full multi-school switcher until it is needed.

Active school selection uses the active organization stored in the authenticated session. If a signed-in user has no schools, the Staff App sends them to create a school. If they have one school and no active school, the app may set it active automatically. If they have multiple schools and no active school, the app shows a minimal school picker before allowing school-scoped workflows.

Considered option: call Better Auth organization endpoints directly from the frontend and then separately create School App actor and role records. Rejected because school creation must produce one coherent domain outcome, and splitting it across client calls would make retries, partial failure handling, and first-run setup harder to reason about.
