import { integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventTypesTable } from "./event-types";
import { profilesTable } from "./profiles";

export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventTypeId: integer("event_type_id").notNull().references(() => eventTypesTable.id, { onDelete: "cascade" }),
  hostUserId: text("host_user_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  inviteeName: text("invitee_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeTimezone: text("invitee_timezone").notNull().default("UTC"),
  notes: text("notes"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
