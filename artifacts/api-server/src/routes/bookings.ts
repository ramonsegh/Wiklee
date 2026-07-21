import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { bookingsTable, db, eventTypesTable } from "@workspace/db";
import {
  CancelBookingParams,
  CancelBookingResponse,
  GetDashboardSummaryResponse,
  ListMyBookingsQueryParams,
  ListMyBookingsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function bookingsForUserWithTitles(userId: string) {
  const rows = await db
    .select({
      id: bookingsTable.id,
      eventTypeId: bookingsTable.eventTypeId,
      eventTypeTitle: eventTypesTable.title,
      hostUserId: bookingsTable.hostUserId,
      inviteeName: bookingsTable.inviteeName,
      inviteeEmail: bookingsTable.inviteeEmail,
      inviteeTimezone: bookingsTable.inviteeTimezone,
      notes: bookingsTable.notes,
      startTime: bookingsTable.startTime,
      endTime: bookingsTable.endTime,
      status: bookingsTable.status,
      createdAt: bookingsTable.createdAt,
    })
    .from(bookingsTable)
    .innerJoin(eventTypesTable, eq(bookingsTable.eventTypeId, eventTypesTable.id))
    .where(eq(bookingsTable.hostUserId, userId))
    .orderBy(bookingsTable.startTime);
  return rows;
}

router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  const query = ListMyBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await bookingsForUserWithTitles(req.userId!);
  const now = new Date();

  const status = query.data.status ?? "upcoming";
  const filtered = rows.filter((row) => {
    if (status === "all") return true;
    if (status === "cancelled") return row.status === "cancelled";
    if (status === "upcoming") return row.status === "confirmed" && row.startTime >= now;
    if (status === "past") return row.status === "confirmed" && row.startTime < now;
    return true;
  });

  res.json(ListMyBookingsResponse.parse(filtered));
});

router.post("/bookings/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(and(eq(bookingsTable.id, params.data.id), eq(bookingsTable.hostUserId, req.userId!)))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [eventType] = await db
    .select({ title: eventTypesTable.title })
    .from(eventTypesTable)
    .where(eq(eventTypesTable.id, booking.eventTypeId));

  res.json(
    CancelBookingResponse.parse({
      ...booking,
      eventTypeTitle: eventType?.title ?? "",
    }),
  );
});

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const rows = await bookingsForUserWithTitles(req.userId!);
  const eventTypes = await db
    .select({ id: eventTypesTable.id })
    .from(eventTypesTable)
    .where(eq(eventTypesTable.userId, req.userId!));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const confirmed = rows.filter((row) => row.status === "confirmed");

  res.json(
    GetDashboardSummaryResponse.parse({
      totalEventTypes: eventTypes.length,
      upcomingBookings: confirmed.filter((row) => row.startTime >= now).length,
      bookingsToday: confirmed.filter((row) => row.startTime >= startOfToday && row.startTime < endOfToday).length,
      bookingsThisWeek: confirmed.filter((row) => row.startTime >= startOfToday && row.startTime < endOfWeek).length,
    }),
  );
});

export default router;
