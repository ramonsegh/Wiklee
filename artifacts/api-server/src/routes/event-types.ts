import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, eventTypesTable } from "@workspace/db";
import {
  CreateEventTypeBody,
  CreateEventTypeResponse,
  DeleteEventTypeParams,
  GetEventTypeParams,
  GetEventTypeResponse,
  ListMyEventTypesResponse,
  UpdateEventTypeBody,
  UpdateEventTypeParams,
  UpdateEventTypeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureProfile } from "./profile";

const router: IRouter = Router();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "event";
}

async function uniqueSlug(userId: string, base: string, ignoreId?: number): Promise<string> {
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db
      .select()
      .from(eventTypesTable)
      .where(and(eq(eventTypesTable.userId, userId), eq(eventTypesTable.slug, candidate)));
    if (!existing || existing.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

router.get("/event-types", requireAuth, async (req, res): Promise<void> => {
  const eventTypes = await db
    .select()
    .from(eventTypesTable)
    .where(eq(eventTypesTable.userId, req.userId!))
    .orderBy(eventTypesTable.createdAt);
  res.json(ListMyEventTypesResponse.parse(eventTypes));
});

router.post("/event-types", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEventTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureProfile(req.userId!);

  const slug = await uniqueSlug(req.userId!, slugify(parsed.data.slug || parsed.data.title));

  const [eventType] = await db
    .insert(eventTypesTable)
    .values({
      userId: req.userId!,
      title: parsed.data.title,
      slug,
      description: parsed.data.description ?? null,
      durationMinutes: parsed.data.durationMinutes,
      color: parsed.data.color ?? "#6366f1",
      isActive: parsed.data.isActive ?? true,
      isPublic: parsed.data.isPublic ?? true,
    })
    .returning();

  res.status(201).json(CreateEventTypeResponse.parse(eventType));
});

router.get("/event-types/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEventTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [eventType] = await db
    .select()
    .from(eventTypesTable)
    .where(and(eq(eventTypesTable.id, params.data.id), eq(eventTypesTable.userId, req.userId!)));

  if (!eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  res.json(GetEventTypeResponse.parse(eventType));
});

router.patch("/event-types/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEventTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.slug || parsed.data.title) {
    updates.slug = await uniqueSlug(
      req.userId!,
      slugify(parsed.data.slug || parsed.data.title || ""),
      params.data.id,
    );
  }

  const [eventType] = await db
    .update(eventTypesTable)
    .set(updates)
    .where(and(eq(eventTypesTable.id, params.data.id), eq(eventTypesTable.userId, req.userId!)))
    .returning();

  if (!eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  res.json(UpdateEventTypeResponse.parse(eventType));
});

router.delete("/event-types/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEventTypeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [eventType] = await db
    .delete(eventTypesTable)
    .where(and(eq(eventTypesTable.id, params.data.id), eq(eventTypesTable.userId, req.userId!)))
    .returning();

  if (!eventType) {
    res.status(404).json({ error: "Event type not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
