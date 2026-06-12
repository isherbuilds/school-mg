import {
  normalizeEmail,
  schoolAccessRoles,
  staffAssignableRoles,
  type SchoolAccessRole,
  type StaffListInput,
  type StaffMember,
  type StaffMemberCreateInput,
  type StaffMemberUpdateInput
} from "@tsu-stack/core/school";
import { and, asc, db, desc, eq, inArray, isNotNull, sql } from "@tsu-stack/db";
import { invitation, member, user } from "@tsu-stack/db/schema";

const invitationDurationMs = 7 * 24 * 60 * 60 * 1000;
const manageableStaffRoles = [...staffAssignableRoles];
const visibleSchoolRoles = [...schoolAccessRoles];

type MemberStaffRow = Pick<
  typeof member.$inferSelect,
  | "createdAt"
  | "department"
  | "employeeCode"
  | "id"
  | "organizationId"
  | "schoolRole"
  | "staffStatus"
  | "title"
  | "updatedAt"
  | "userId"
> & {
  user: Pick<typeof user.$inferSelect, "email" | "name">;
};

type InvitationStaffRow = Pick<
  typeof invitation.$inferSelect,
  | "createdAt"
  | "department"
  | "email"
  | "employeeCode"
  | "id"
  | "organizationId"
  | "schoolRole"
  | "staffStatus"
  | "status"
  | "title"
>;

function timestampToIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function assertSchoolRole(role: SchoolAccessRole | null): SchoolAccessRole {
  if (role === null) {
    throw new Error("Staff record is missing a school role.");
  }

  return role;
}

function memberToOutput(row: MemberStaffRow): StaffMember {
  const role = assertSchoolRole(row.schoolRole);

  return {
    accessStatus: row.staffStatus === "inactive" ? "revoked" : "linked",
    createdAt: timestampToIso(row.createdAt),
    department: row.department,
    email: normalizeEmail(row.user.email),
    employeeCode: row.employeeCode,
    fullName: row.user.name,
    id: row.id,
    invitationId: null,
    memberId: row.id,
    role,
    status: row.staffStatus,
    title: row.title,
    updatedAt: timestampToIso(row.updatedAt),
    userId: row.userId
  };
}

function invitationToOutput(row: InvitationStaffRow): StaffMember {
  const role = assertSchoolRole(row.schoolRole);
  const updatedAt = timestampToIso(row.createdAt);

  return {
    accessStatus: row.status === "pending" ? "pending" : "revoked",
    createdAt: updatedAt,
    department: row.department,
    email: normalizeEmail(row.email),
    employeeCode: row.employeeCode,
    fullName: null,
    id: row.id,
    invitationId: row.id,
    memberId: null,
    role,
    status: row.staffStatus,
    title: row.title,
    updatedAt,
    userId: null
  };
}

function sortStaff(staff: StaffMember[]): StaffMember[] {
  const sortedStaff = Array.from(staff);

  sortedStaff.sort((a, b) => {
    const nameA = a.fullName ?? a.email;
    const nameB = b.fullName ?? b.email;
    const nameComparison = nameA.localeCompare(nameB);

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return (a.employeeCode ?? "").localeCompare(b.employeeCode ?? "");
  });

  return sortedStaff;
}

function normalizedInvitationEmailEquals(email: string) {
  return sql`lower(trim(${invitation.email})) = ${email}`;
}

function normalizedUserEmailEquals(email: string) {
  return sql`lower(trim(${user.email})) = ${email}`;
}

export class DuplicateStaffRecordError extends Error {
  code = "DUPLICATE_STAFF_RECORD";

  constructor() {
    super("A staff record already exists for this email.");
  }
}

export async function listStaffMembers(
  organizationId: string,
  _input: StaffListInput
): Promise<StaffMember[]> {
  const [memberRows, invitationRows] = await Promise.all([
    db
      .select({
        createdAt: member.createdAt,
        department: member.department,
        employeeCode: member.employeeCode,
        id: member.id,
        organizationId: member.organizationId,
        schoolRole: member.schoolRole,
        staffStatus: member.staffStatus,
        title: member.title,
        updatedAt: member.updatedAt,
        user: {
          email: user.email,
          name: user.name
        },
        userId: member.userId
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(
          eq(member.organizationId, organizationId),
          isNotNull(member.schoolRole),
          inArray(member.schoolRole, visibleSchoolRoles)
        )
      )
      .orderBy(asc(user.name), asc(member.employeeCode)),
    db
      .select({
        createdAt: invitation.createdAt,
        department: invitation.department,
        email: invitation.email,
        employeeCode: invitation.employeeCode,
        id: invitation.id,
        organizationId: invitation.organizationId,
        schoolRole: invitation.schoolRole,
        staffStatus: invitation.staffStatus,
        status: invitation.status,
        title: invitation.title
      })
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, "pending"),
          isNotNull(invitation.schoolRole),
          inArray(invitation.schoolRole, manageableStaffRoles)
        )
      )
      .orderBy(desc(invitation.createdAt))
  ]);

  return sortStaff([...memberRows.map(memberToOutput), ...invitationRows.map(invitationToOutput)]);
}

async function getMemberStaffRow(
  organizationId: string,
  staffMemberId: string
): Promise<MemberStaffRow | null> {
  const [row] = await db
    .select({
      createdAt: member.createdAt,
      department: member.department,
      employeeCode: member.employeeCode,
      id: member.id,
      organizationId: member.organizationId,
      schoolRole: member.schoolRole,
      staffStatus: member.staffStatus,
      title: member.title,
      updatedAt: member.updatedAt,
      user: {
        email: user.email,
        name: user.name
      },
      userId: member.userId
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.id, staffMemberId),
        isNotNull(member.schoolRole)
      )
    )
    .limit(1);

  return row ?? null;
}

async function getInvitationStaffRow(
  organizationId: string,
  staffMemberId: string
): Promise<InvitationStaffRow | null> {
  const [row] = await db
    .select({
      createdAt: invitation.createdAt,
      department: invitation.department,
      email: invitation.email,
      employeeCode: invitation.employeeCode,
      id: invitation.id,
      organizationId: invitation.organizationId,
      schoolRole: invitation.schoolRole,
      staffStatus: invitation.staffStatus,
      status: invitation.status,
      title: invitation.title
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.id, staffMemberId),
        isNotNull(invitation.schoolRole)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getStaffMemberById(
  organizationId: string,
  staffMemberId: string
): Promise<StaffMember | null> {
  const memberRow = await getMemberStaffRow(organizationId, staffMemberId);

  if (memberRow) {
    return memberToOutput(memberRow);
  }

  const invitationRow = await getInvitationStaffRow(organizationId, staffMemberId);

  return invitationRow ? invitationToOutput(invitationRow) : null;
}

export async function getStaffMemberRole(
  organizationId: string,
  staffMemberId: string
): Promise<SchoolAccessRole | null> {
  const staffMember = await getStaffMemberById(organizationId, staffMemberId);
  return staffMember?.role ?? null;
}

async function assertNoStaffRecordForEmail(
  organizationId: string,
  email: string,
  excludedInvitationId?: string
) {
  const normalizedEmail = normalizeEmail(email);
  const [existingMember] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, organizationId),
        normalizedUserEmailEquals(normalizedEmail),
        isNotNull(member.schoolRole)
      )
    )
    .limit(1);

  if (existingMember) {
    throw new DuplicateStaffRecordError();
  }

  const [existingInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, "pending"),
        normalizedInvitationEmailEquals(normalizedEmail),
        isNotNull(invitation.schoolRole),
        excludedInvitationId === undefined
          ? undefined
          : sql`${invitation.id} <> ${excludedInvitationId}`
      )
    )
    .limit(1);

  if (existingInvitation) {
    throw new DuplicateStaffRecordError();
  }
}

export async function createStaffMember(
  organizationId: string,
  inviterId: string,
  input: StaffMemberCreateInput
): Promise<StaffMember> {
  await assertNoStaffRecordForEmail(organizationId, input.email);

  const now = new Date();
  const [created] = await db
    .insert(invitation)
    .values({
      createdAt: now,
      department: input.department ?? null,
      email: normalizeEmail(input.email),
      employeeCode: input.employeeCode ?? null,
      expiresAt: new Date(now.getTime() + invitationDurationMs),
      id: crypto.randomUUID(),
      inviterId,
      organizationId,
      role: "member",
      schoolRole: input.role,
      staffStatus: input.status,
      status: "pending",
      title: input.title ?? null
    })
    .returning({ id: invitation.id });

  const staffMember = await getStaffMemberById(organizationId, created.id);

  if (!staffMember) {
    throw new Error("Created staff invitation could not be reloaded.");
  }

  return staffMember;
}

export async function updateStaffMember(
  organizationId: string,
  input: StaffMemberUpdateInput
): Promise<StaffMember | null> {
  const existingMember = await getMemberStaffRow(organizationId, input.id);

  if (existingMember) {
    await db
      .update(member)
      .set({
        department: input.department,
        employeeCode: input.employeeCode,
        schoolRole: input.role,
        staffStatus: input.status,
        title: input.title
      })
      .where(and(eq(member.organizationId, organizationId), eq(member.id, input.id)));

    return getStaffMemberById(organizationId, input.id);
  }

  const existingInvitation = await getInvitationStaffRow(organizationId, input.id);

  if (!existingInvitation) {
    return null;
  }

  if (
    input.email !== undefined &&
    normalizeEmail(input.email) !== normalizeEmail(existingInvitation.email)
  ) {
    await assertNoStaffRecordForEmail(organizationId, input.email, existingInvitation.id);
  }

  await db
    .update(invitation)
    .set({
      department: input.department,
      email: input.email === undefined ? undefined : normalizeEmail(input.email),
      employeeCode: input.employeeCode,
      schoolRole: input.role,
      staffStatus: input.status,
      title: input.title
    })
    .where(and(eq(invitation.organizationId, organizationId), eq(invitation.id, input.id)));

  return getStaffMemberById(organizationId, input.id);
}
