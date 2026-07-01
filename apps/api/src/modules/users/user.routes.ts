/**
 * Users module — read & update the authenticated user's profile and settings.
 * Real, working endpoints — they prove the auth → DB chain end-to-end.
 */
import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '@studyflow/db';
import { settings, user } from '@studyflow/db/schema';
import { updateProfileSchema, updateSettingsSchema } from '@studyflow/shared';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { NotFoundError } from '../../lib/errors.js';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', async (req, res, next) => {
  try {
    const me = await db
      .select()
      .from(user)
      .where(eq(user.id, req.user!.id))
      .limit(1);

    const row = me[0];
    if (!row) throw new NotFoundError('User');

    const mySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, req.user!.id))
      .limit(1);

    res.json({
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        image: row.image,
        timezone: row.timezone,
        locale: row.locale,
        createdAt: row.createdAt,
        settings: mySettings[0] ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

userRouter.patch(
  '/me',
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const body = req.body as { name?: string; image?: string | null; timezone?: string; locale?: string };
      const [updated] = await db
        .update(user)
        .set({
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.image !== undefined ? { image: body.image } : {}),
          ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
          ...(body.locale !== undefined ? { locale: body.locale } : {}),
          updatedAt: new Date(),
        })
        .where(eq(user.id, req.user!.id))
        .returning();
      if (!updated) throw new NotFoundError('User');
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

userRouter.get('/me/settings', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, req.user!.id))
      .limit(1);
    res.json({ data: rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});

userRouter.patch(
  '/me/settings',
  validate(updateSettingsSchema),
  async (req, res, next) => {
    try {
      const body = req.body as Partial<{
        theme: 'light' | 'dark' | 'system';
        accent: string | null;
        studyMinutesGoal: number;
        dailyReminderTime: string | null;
        locale: string;
        timezone: string;
        weekStartsOn: number;
        notifyDeadline: boolean;
        notifyGoal: boolean;
        notifyRevision: boolean;
        notifyDaily: boolean;
      }>;
      const [updated] = await db
        .insert(settings)
        .values({ userId: req.user!.id, ...body })
        .onConflictDoUpdate({
          target: settings.userId,
          set: { ...body, updatedAt: new Date() },
        })
        .returning();
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

/** Lightweight stats endpoint used by the dashboard. */
userRouter.get('/me/stats', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    // Use count + sum aggregates via Drizzle.
    const [courseCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`courses`)
      .where(sql`owner_id = ${userId}::uuid AND deleted_at IS NULL`)
      .limit(1);
    const [activeTaskCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`tasks`)
      .where(sql`user_id = ${userId}::uuid AND deleted_at IS NULL AND status <> 'completed'`)
      .limit(1);
    const [sessionStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        minutes: sql<number>`coalesce(sum(duration_seconds),0)::int`,
      })
      .from(sql`study_sessions`)
      .where(sql`user_id = ${userId}::uuid AND deleted_at IS NULL`)
      .limit(1);
    res.json({
      data: {
        courses: Number(courseCount?.n ?? 0),
        activeTasks: Number(activeTaskCount?.n ?? 0),
        sessions: Number(sessionStats?.total ?? 0),
        totalSeconds: Number(sessionStats?.minutes ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});