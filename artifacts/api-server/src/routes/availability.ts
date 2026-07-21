import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, availabilityRulesTable } from "@workspace/db";
import { ListMyAvailabilityResponse, ReplaceMyAvailabilityBody, ReplaceMyAvailabilityResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { ensureProfile } from "./profile";

const router: IRouter = Router();

router.get("/availability", requireAuth, async (req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(availabilityRulesTable)
    .where(eq(availabilityRulesTable.userId, req.userId!))
    .orderBy(availabilityRulesTable.dayOfWeek, availabilityRulesTable.startTime);
  res.json(ListMyAvailabilityResponse.parse(rules));
});

router.put("/availability", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReplaceMyAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureProfile(req.userId!);

  const rules = await db.transaction(async (tx) => {
    await tx.delete(availabilityRulesTable).where(eq(availabilityRulesTable.userId, req.userId!));
    if (parsed.data.rules.length === 0) return [];
    return tx
      .insert(availabilityRulesTable)
      .values(parsed.data.rules.map((rule) => ({ ...rule, userId: req.userId! })))
      .returning();
  });

  const sorted = rules.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  res.json(ReplaceMyAvailabilityResponse.parse(sorted));
});

export default router;
