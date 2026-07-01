/**
 * User-facing DTOs (profile, settings).
 */

import { z } from 'zod';
import { Theme } from '../enums.js';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  image: z.string().url().nullable().optional(),
  timezone: z.string().min(1).max(60).optional(),
  locale: z.string().min(2).max(10).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateSettingsSchema = z.object({
  theme: z.enum([Theme.light, Theme.dark, Theme.system]).optional(),
  accent: z.string().regex(/^#?[0-9a-fA-F]{6}$/).nullable().optional(),
  studyMinutesGoal: z.number().int().min(0).max(1440).optional(),
  dailyReminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(60).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  notifyDeadline: z.boolean().optional(),
  notifyGoal: z.boolean().optional(),
  notifyRevision: z.boolean().optional(),
  notifyDaily: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;