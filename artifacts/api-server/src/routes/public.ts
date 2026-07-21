import { Router, type IRouter } from "express";
import { and, eq, ne } from "drizzle-orm";
import { availabilityRulesTable, bookingsTable, db, eventTypesTable, profilesTable } from "@workspace/db";
import {
  CreatePublicBookingBody,
  CreatePublicBookingResponse,
  GetPublicEventTypeResponse,
  GetPublicEventTypeSlotsQueryParams,
  GetPublicEventTypeSlotsResponse,
  GetPublicProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function findHostAndEventType(username: string, slug: string) {
  const [host] = await db.select().from(profilesTable).where(eq(profilesTable.username, username));
  if (!host) return { host: null, eventType: null };

  const [eventType] = await db
    .select()
    .from(eventTypesTable)
    .where(and(eq(eventTypesTable.userId, host.id), eq(eventTypesTable.slug, slug), eq(eventTypesTable.isActive, true)));

  return { host, eventType: eventType ?? null };
}

router.get("/public/users/:username", async (req, res): Promise<void> => {
  const username = String(req.params.username);

  const [host] = await db.select().from(profilesTable).where(eq(profilesTable.username, username));
  if (!host) {
    res.status(404).json({ error: "Host not found" });
    return;
  }

  const eventTypes = await db
    .select()
    .from(eventTypesTable)
    .where(and(eq(eventTypesTable.userId, host.id), eq(eventTypesTable.isActive, true), eq(eventTypesTable.isPublic, true)))
    .orderBy(eventTypesTable.createdAt);

  res.json(
    GetPublicProfileResponse.parse({
      username: host.username,
      name: host.name,
      timezone: host.timezone,
      eventTypes: eventTypes.map((eventType) => ({
        id: eventType.id,
        title: eventType.title,
        slug: eventType.slug,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes,
        color: eventType.color,
        hostName: host.name,
        hostUsername: host.username,
        hostTimezone: host.timezone,
      })),
    }),
  );
});

router.get("/public/users/:username/event-types/:slug", async (req, res): Promise<void> => {
  const { host, eventType } = await findHostAndEventType(String(req.params.username), String(req.params.slug));
  if (!host || !eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  res.json(
    GetPublicEventTypeResponse.parse({
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      color: eventType.color,
      hostName: host.name,
      hostUsername: host.username,
      hostTimezone: host.timezone,
    }),
  );
});

const SLOT_STEP_MINUTES = 30;

router.get("/public/slots", async (req, res): Promise<void> => {
  const query = GetPublicEventTypeSlotsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { username, slug, startDate, endDate } = query.data;

  const { host, eventType } = await findHostAndEventType(username, slug);
  if (!host || !eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  const rules = await db
    .select()
    .from(availabilityRulesTable)
    .where(eq(availabilityRulesTable.userId, host.id));

  const existingBookings = await db
    .select({ startTime: bookingsTable.startTime, endTime: bookingsTable.endTime })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.hostUserId, host.id), ne(bookingsTable.status, "cancelled")));

  const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
  const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);

  const days: { date: string; slots: Date[] }[] = [];
  for (let day = new Date(rangeStart); day <= rangeEnd; day = new Date(day.getTime() + 24 * 60 * 60 * 1000)) {
    const dateKey = day.toISOString().slice(0, 10);
    const dayOfWeek = day.getUTCDay();
    const rulesForDay = rules.filter((rule) => rule.dayOfWeek === dayOfWeek);

    const slots: Date[] = [];
    for (const rule of rulesForDay) {
      const [startHour, startMinute] = rule.startTime.split(":").map(Number);
      const [endHour, endMinute] = rule.endTime.split(":").map(Number);

      let cursor = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), startHour, startMinute));
      const windowEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), endHour, endMinute));

      while (cursor.getTime() + eventType.durationMinutes * 60 * 1000 <= windowEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + eventType.durationMinutes * 60 * 1000);
        const now = new Date();
        const overlapsExisting = existingBookings.some(
          (booking) => cursor < booking.endTime && slotEnd > booking.startTime,
        );
        if (cursor > now && !overlapsExisting) {
          slots.push(new Date(cursor));
        }
        cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60 * 1000);
      }
    }

    if (slots.length > 0) {
      days.push({ date: dateKey, slots });
    }
  }

  res.json(GetPublicEventTypeSlotsResponse.parse(days));
});

router.post("/public/users/:username/event-types/:slug/book", async (req, res): Promise<void> => {
  const { host, eventType } = await findHostAndEventType(String(req.params.username), String(req.params.slug));
  if (!host || !eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  const parsed = CreatePublicBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(startTime.getTime() + eventType.durationMinutes * 60 * 1000);

  const existing = await db
    .select({ startTime: bookingsTable.startTime, endTime: bookingsTable.endTime })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.hostUserId, host.id), ne(bookingsTable.status, "cancelled")));

  const hasConflict = existing.some((booking) => startTime < booking.endTime && endTime > booking.startTime);
  if (hasConflict) {
    res.status(409).json({ error: "Slot is no longer available" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      eventTypeId: eventType.id,
      hostUserId: host.id,
      inviteeName: parsed.data.inviteeName,
      inviteeEmail: parsed.data.inviteeEmail,
      inviteeTimezone: parsed.data.timezone,
      notes: parsed.data.notes ?? null,
      startTime,
      endTime,
      status: "confirmed",
    })
    .returning();

  res.status(201).json(
    CreatePublicBookingResponse.parse({
      ...booking,
      eventTypeTitle: eventType.title,
    }),
  );
});

export default router;
