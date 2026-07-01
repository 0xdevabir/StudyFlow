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
import { sql } from 'drizzle-orm';
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
    .where(sql`lower(${user.email}) = lower(${DEMO_EMAIL})`)
    .limit(1);

  let userId: string;
  if (existing.length && existing[0]) {
    userId = existing[0].id;
    console.log(`✓ Demo user exists (${userId})`);
  } else {
    const inserted = await db
      .insert(user)
      .values({
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        emailVerified: true,
        timezone: 'UTC',
        locale: 'en',
      })
      .returning({ id: user.id });
    userId = inserted[0]!.id;
    console.log(`✓ Demo user created (${userId})`);
  }

  // 2. Settings row.
  await db
    .insert(settings)
    .values({ userId })
    .onConflictDoNothing();

  // 3. Sample course "Programming Hero".
  const courseResult = await db
    .insert(course)
    .values({
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
    })
    .returning({ id: course.id });

  const courseId = courseResult[0]!.id;

  // 4. Sample hierarchy.
  const module1 = await db
    .insert(courseHierarchy)
    .values({
      courseId,
      type: 'module',
      title: 'Module 1 — HTML & CSS',
      orderIndex: 0,
      estimatedMinutes: 600,
    })
    .returning({ id: courseHierarchy.id });

  const module2 = await db
    .insert(courseHierarchy)
    .values({
      courseId,
      type: 'module',
      title: 'Module 2 — JavaScript',
      orderIndex: 1,
      estimatedMinutes: 1200,
    })
    .returning({ id: courseHierarchy.id });

  const module3 = await db
    .insert(courseHierarchy)
    .values({
      courseId,
      type: 'module',
      title: 'Module 3 — React',
      orderIndex: 2,
      estimatedMinutes: 1500,
    })
    .returning({ id: courseHierarchy.id });

  await db.insert(courseHierarchy).values([
    {
      courseId,
      parentId: module1[0]!.id,
      type: 'lesson',
      title: 'Intro to HTML',
      orderIndex: 0,
    },
    {
      courseId,
      parentId: module1[0]!.id,
      type: 'lesson',
      title: 'CSS basics',
      orderIndex: 1,
    },
    {
      courseId,
      parentId: module2[0]!.id,
      type: 'lesson',
      title: 'Variables & types',
      orderIndex: 0,
    },
    {
      courseId,
      parentId: module2[0]!.id,
      type: 'lesson',
      title: 'Functions',
      orderIndex: 1,
    },
    {
      courseId,
      parentId: module3[0]!.id,
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
