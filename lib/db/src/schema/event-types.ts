import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const eventTypesTable = pgTable(
  "event_types",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    color: text("color").notNull().default("#6366f1"),
    isActive: boolean("is_active").notNull().default(true),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("event_types_user_slug_idx").on(table.userId, table.slug)],
);

export const insertEventTypeSchema = createInsertSchema(eventTypesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEventType = z.infer<typeof insertEventTypeSchema>;
export type EventType = typeof eventTypesTable.$inferSelect;
