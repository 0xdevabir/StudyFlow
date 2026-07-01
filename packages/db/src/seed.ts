/**
 * Minimal development seed. Creates one demo user and one sample course
 * with hierarchy so the dashboard renders something meaningful after
 * `pnpm db:seed`.
 *
 * NOTE: this assumes Better Auth's adapter has already created the `users`
 * table. We do NOT hash passwords ourselves — that is the auth package's job.
 * In a real bootstrap we'd call Better Auth's signUp endpoint, but for seed
 * convenience we insert directly and store a placeholder hash.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './client.js';
import {
  course,
  courseHierarchy,
  courseProgress,
  settings,
  task,
  user,
} from './schema/index.js';

const DEMO_EMAIL = 'demo@studyflow.local';
const DEMO_NAME = 'Demo Learner';

async function main() {
  console.log('Seeding StudyFlow…');

  // 1. Demo user — pick existing if run twice.
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))
    .limit(1);

  let userId: string;
  if (existing.length && existing[0]) {
    userId = existing[0].id;
    console.log(`✓ Demo user exists (${userId})`);
  } else {
    await db.insert(user).values({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
      timezone: 'UTC',
      locale: 'en',
    });
    const inserted = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, DEMO_EMAIL))
      .limit(1);
    if (!inserted[0]) throw new Error('Seed user was not created');
    userId = inserted[0].id;
    console.log(`✓ Demo user created (${userId})`);
  }

  // 2. Settings row.
  await db
    .insert(settings)
    .values({ userId })
    .onConflictDoNothing();

  // 3. Sample course "Programming Hero".
  await db.insert(course).values({
    ownerId: userId,
    title: 'Programming Hero',
    slug: 'programming-hero',
    description: 'A complete web development course.',
    category: 'Bootcamp',
    source: 'Programming Hero',
    url: 'https://web.programming-hero.com',
    color: '#6366F1',
    icon: 'flame',
    status: 'active',
    priority: 'high',
    estimatedMinutes: 6000,
  });
  const courseRow = await db
    .select({ id: course.id })
    .from(course)
    .where(eq(course.slug, 'programming-hero'))
    .limit(1);
  const courseId = courseRow[0]!.id;

  // 4. Sample hierarchy — insert each module then read its id back.
  async function insertModule(title: string, orderIndex: number, estimatedMinutes: number) {
    await db.insert(courseHierarchy).values({
      courseId,
      type: 'module',
      title,
      orderIndex,
      estimatedMinutes,
    });
    const rows = await db
      .select({ id: courseHierarchy.id })
      .from(courseHierarchy)
      .where(eq(courseHierarchy.title, title))
      .limit(1);
    return rows[0]!.id;
  }
  const module1Id = await insertModule('Module 1 — HTML & CSS', 0, 600);
  const module2Id = await insertModule('Module 2 — JavaScript', 1, 1200);
  const module3Id = await insertModule('Module 3 — React', 2, 1500);

  await db.insert(courseHierarchy).values([
    {
      courseId,
      parentId: module1Id,
      type: 'lesson',
      title: 'Intro to HTML',
      orderIndex: 0,
    },
    {
      courseId,
      parentId: module1Id,
      type: 'lesson',
      title: 'CSS basics',
      orderIndex: 1,
    },
    {
      courseId,
      parentId: module2Id,
      type: 'lesson',
      title: 'Variables & types',
      orderIndex: 0,
    },
    {
      courseId,
      parentId: module2Id,
      type: 'lesson',
      title: 'Functions',
      orderIndex: 1,
    },
    {
      courseId,
      parentId: module3Id,
      type: 'lesson',
      title: 'Components',
      orderIndex: 0,
    },
  ]);

  // 5. Sample tasks.
  await db.insert(task).values([
    {
      userId,
      courseId,
      type: 'assignment',
      title: 'Build a personal portfolio page',
      status: 'in_progress',
      priority: 'high',
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    },
    {
      userId,
      courseId,
      type: 'practice',
      title: 'Solve 5 array challenges',
      status: 'pending',
      priority: 'medium',
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
    },
    {
      userId,
      courseId,
      type: 'quiz',
      title: 'JS fundamentals quiz',
      status: 'pending',
      priority: 'urgent',
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
  ]);

  // 6. Initial progress row so the dashboard isn't empty.
  await db
    .insert(courseProgress)
    .values({ userId, courseId, percent: 18 })
    .onConflictDoNothing();

  console.log('✓ Seed complete.');
  console.log(`  • Demo user: ${DEMO_EMAIL} (sign in via the UI)`);
}

main()
  .then(() => {
    console.log('✓ Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
