import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { organization } from "#@/schema/auth.schema";
import { students } from "#@/schema/school.people.schema";
import {
  timestamps,
  transportRideStatusEnum,
  transportRouteWindowEnum
} from "#@/schema/school.shared";

export const transportStops = pgTable(
  "transport_stops",
  {
    active: boolean("active").default(true).notNull(),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("transport_stops_organization_idx").on(table.organizationId),
    uniqueIndex("transport_stops_code_uidx").on(table.organizationId, table.code),
    uniqueIndex("transport_stops_org_id_uidx").on(table.organizationId, table.id)
  ]
);

export const transportRoutes = pgTable(
  "transport_routes",
  {
    active: boolean("active").default(true).notNull(),
    code: text("code").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    notes: text("notes"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    window: transportRouteWindowEnum("window").default("both").notNull(),
    ...timestamps()
  },
  (table) => [
    index("transport_routes_organization_idx").on(table.organizationId),
    uniqueIndex("transport_routes_code_uidx").on(table.organizationId, table.code),
    uniqueIndex("transport_routes_org_id_uidx").on(table.organizationId, table.id)
  ]
);

export const transportRouteStops = pgTable(
  "transport_route_stops",
  {
    distanceFromStartKm: numeric("distance_from_start_km", { precision: 8, scale: 2 }),
    dropoffMinute: integer("dropoff_minute"),
    pickupMinute: integer("pickup_minute"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    stopId: uuid("stop_id")
      .notNull()
      .references(() => transportStops.id, { onDelete: "cascade" }),
    stopOrder: integer("stop_order").notNull(),
    ...timestamps()
  },
  (table) => [
    primaryKey({
      columns: [table.routeId, table.stopId],
      name: "transport_route_stops_pk"
    }),
    uniqueIndex("transport_route_stops_order_uidx").on(
      table.organizationId,
      table.routeId,
      table.stopOrder
    ),
    foreignKey({
      columns: [table.organizationId, table.routeId],
      foreignColumns: [transportRoutes.organizationId, transportRoutes.id],
      name: "transport_route_stops_route_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.stopId],
      foreignColumns: [transportStops.organizationId, transportStops.id],
      name: "transport_route_stops_stop_org_fk"
    }).onDelete("cascade"),
    check("transport_route_stops_order_positive_chk", sql`${table.stopOrder} > 0`),
    check(
      "transport_route_stops_pickup_minute_bounds_chk",
      sql`${table.pickupMinute} IS NULL OR (${table.pickupMinute} >= 0 AND ${table.pickupMinute} <= 1440)`
    ),
    check(
      "transport_route_stops_dropoff_minute_bounds_chk",
      sql`${table.dropoffMinute} IS NULL OR (${table.dropoffMinute} >= 0 AND ${table.dropoffMinute} <= 1440)`
    ),
    check(
      "transport_route_stops_distance_non_negative_chk",
      sql`${table.distanceFromStartKm} IS NULL OR ${table.distanceFromStartKm} >= 0`
    )
  ]
);

export const transportRiders = pgTable(
  "transport_riders",
  {
    activeFrom: date("active_from").notNull(),
    activeTo: date("active_to"),
    afternoonEnabled: boolean("afternoon_enabled").default(true).notNull(),
    dropoffStopId: uuid("dropoff_stop_id")
      .notNull()
      .references(() => transportStops.id, { onDelete: "restrict" }),
    emergencyGuardianName: text("emergency_guardian_name"),
    emergencyGuardianPhone: text("emergency_guardian_phone"),
    id: uuid("id").defaultRandom().primaryKey(),
    morningEnabled: boolean("morning_enabled").default(true).notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    pickupStopId: uuid("pickup_stop_id")
      .notNull()
      .references(() => transportStops.id, { onDelete: "restrict" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "cascade" }),
    status: transportRideStatusEnum("status").default("active").notNull(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    ...timestamps()
  },
  (table) => [
    index("transport_riders_route_idx").on(table.organizationId, table.routeId),
    index("transport_riders_status_idx").on(table.organizationId, table.status),
    index("transport_riders_student_idx").on(table.organizationId, table.studentId),
    uniqueIndex("transport_riders_student_route_uidx").on(
      table.organizationId,
      table.studentId,
      table.routeId,
      table.activeFrom
    ),
    foreignKey({
      columns: [table.organizationId, table.studentId],
      foreignColumns: [students.organizationId, students.id],
      name: "transport_riders_student_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.routeId],
      foreignColumns: [transportRoutes.organizationId, transportRoutes.id],
      name: "transport_riders_route_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.pickupStopId],
      foreignColumns: [transportStops.organizationId, transportStops.id],
      name: "transport_riders_pickup_stop_org_fk"
    }),
    foreignKey({
      columns: [table.organizationId, table.dropoffStopId],
      foreignColumns: [transportStops.organizationId, transportStops.id],
      name: "transport_riders_dropoff_stop_org_fk"
    }),
    check(
      "transport_riders_date_order_chk",
      sql`${table.activeTo} IS NULL OR ${table.activeFrom} <= ${table.activeTo}`
    ),
    check(
      "transport_riders_window_chk",
      sql`${table.morningEnabled} = TRUE OR ${table.afternoonEnabled} = TRUE`
    )
  ]
);
