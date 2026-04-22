import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, logsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/logs", requireAuth(), async (req, res): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const rows = await db
    .select()
    .from(logsTable)
    .orderBy(desc(logsTable.createdAt))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      id: r.id,
      action: r.action,
      detail: r.detail,
      username: r.username,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
