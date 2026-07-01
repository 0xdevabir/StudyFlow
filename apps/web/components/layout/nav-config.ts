'use client';

import {
  BarChart3,
  Bookmark,
  Calendar,
  CheckSquare,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Settings,
  StickyNote,
  Target,
  Timer,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

export const primaryNav: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Courses', href: '/courses', icon: GraduationCap },
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Sessions', href: '/sessions', icon: Timer },
  { title: 'Notes', href: '/notes', icon: StickyNote },
];

export const growthNav: NavItem[] = [
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Habits', href: '/habits', icon: Flame },
  { title: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export const utilityNav: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
];