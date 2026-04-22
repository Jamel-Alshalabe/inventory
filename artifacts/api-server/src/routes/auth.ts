import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sysUsersTable } from "@workspace/db";
import { hashPassword, verifyPassword } from "../lib/session";
import { addLog, getCurrentUser, requireAuth, type AuthUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  const [u] = await db
    .select()
    .from(sysUsersTable)
    .where(eq(sysUsersTable.username, username));
  if (!u || !verifyPassword(password, u.passwordHash)) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }
  req.session.userId = u.id;
  await addLog("login", `تسجيل دخول`, u.username);
  res.json({
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      assignedWarehouseId: u.assignedWarehouseId ?? null,
      assignedWarehouseName: null,
    },
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const user = await getCurrentUser(req);
  if (user) await addLog("logout", "تسجيل خروج", user.username);
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getCurrentUser(req);
  res.json({ user });
});

router.put("/account/username", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const { username } = req.body ?? {};
  if (typeof username !== "string" || username.trim().length < 2) {
    res.status(400).json({ error: "اسم المستخدم غير صالح" });
    return;
  }
  await db
    .update(sysUsersTable)
    .set({ username: username.trim() })
    .where(eq(sysUsersTable.id, user.id));
  await addLog("change_username", `تغيير اسم المستخدم إلى ${username}`, user.username);
  res.json({ ok: true });
});

router.put("/account/password", requireAuth(), async (req, res): Promise<void> => {
  const user = (req as unknown as { user: AuthUser }).user;
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password.length < 4) {
    res.status(400).json({ error: "كلمة المرور قصيرة جداً" });
    return;
  }
  await db
    .update(sysUsersTable)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(sysUsersTable.id, user.id));
  await addLog("change_password", "تغيير كلمة المرور", user.username);
  res.json({ ok: true });
});

export default router;
