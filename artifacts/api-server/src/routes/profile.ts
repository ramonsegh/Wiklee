import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { GetMyProfileResponse, UpdateMyProfileBody, UpdateMyProfileResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function defaultUsernameFor(userId: string): string {
  return `host-${userId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase()}`;
}

export async function ensureProfile(userId: string) {
  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
  if (existing) return existing;

  const [created] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      username: defaultUsernameFor(userId),
      name: "New Host",
      timezone: "UTC",
    })
    .onConflictDoNothing({ target: profilesTable.id })
    .returning();

  if (created) return created;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId));
  return profile;
}

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const profile = await ensureProfile(req.userId!);
  res.json(GetMyProfileResponse.parse(profile));
});

router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  await ensureProfile(req.userId!);

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.username) {
    const [conflict] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.username, parsed.data.username));
    if (conflict && conflict.id !== req.userId) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }
  }

  const [updated] = await db
    .update(profilesTable)
    .set(parsed.data)
    .where(eq(profilesTable.id, req.userId!))
    .returning();

  res.json(UpdateMyProfileResponse.parse(updated));
});

export default router;
