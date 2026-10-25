'use client';

import {
  LayoutDashboard,
  Coffee,
  ReceiptText,
  Wallet,
  UserCircle,
  Home,
  ClipboardList,
  History,
  Users,
  UserCog,
  UtensilsCrossed,
  Tags,
  Banknote,
  BarChart3,
  FileText,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'student' | 'staff' | 'admin';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (p: string) => boolean;
  /** Shorter label for tight spots (the student dock below `sm`). */
  shortLabel?: string;
}

export interface RoleNavDef {
  roleLabel: string;
  nav: NavItem[];
  mobileNav: NavItem[];
}

/**
 * Nav definitions live CLIENT-side: icon components and match functions
 * cannot cross the server→client boundary (React 19 / Next 15), so the
 * server layouts only pass the `role` string and everything else is
 * resolved here.
 */
export const ROLE_NAV: Record<Role, RoleNavDef> = {
  student: {
    roleLabel: 'Student Portal',
    nav: [
      {
        href: '/student/dashboard',
        label: 'Dashboard',
        shortLabel: 'Home',
        icon: Home,
        match: (p) => p === '/student/dashboard' || p === '/student',
      },
      {
        href: '/student/cafes',
        label: 'Cafes',
        icon: Coffee,
        match: (p) => p.startsWith('/student/cafes') || p.startsWith('/cafe'),
      },
      {
        href: '/student/orders',
        label: 'My Orders',
        shortLabel: 'Orders',
        icon: ReceiptText,
        match: (p) => p.startsWith('/student/orders'),
      },
      {
        href: '/student/spending',
        label: 'My Spending',
        shortLabel: 'Spending',
        icon: Wallet,
        match: (p) => p.startsWith('/student/spending'),
      },
      {
        href: '/student/profile',
        label: 'Profile',
        icon: UserCircle,
        match: (p) => p.startsWith('/student/profile'),
      },
    ],
    mobileNav: [
      { href: '/student/dashboard', label: 'Dashboard', icon: Home, match: (p) => p === '/student/dashboard' || p === '/student' },
      { href: '/student/cafes', label: 'Cafes', icon: Coffee, match: (p) => p.startsWith('/student/cafes') || p.startsWith('/cafe') },
      { href: '/student/orders', label: 'Orders', icon: ReceiptText, match: (p) => p.startsWith('/student/orders') },
      { href: '/student/spending', label: 'Spending', icon: Wallet, match: (p) => p.startsWith('/student/spending') },
      { href: '/student/profile', label: 'Profile', icon: UserCircle, match: (p) => p.startsWith('/student/profile') },
    ],
  },
  staff: {
    roleLabel: 'Cafe Staff',
    nav: [
      { href: '/staff/dashboard', label: 'Counter', icon: ClipboardList, match: (p) => p === '/staff/dashboard' || p === '/staff' },
      { href: '/staff/history', label: 'History', icon: History },
    ],
    mobileNav: [
      { href: '/staff/dashboard', label: 'Counter', icon: ClipboardList },
      { href: '/staff/history', label: 'History', icon: History },
    ],
  },
  admin: {
    roleLabel: 'University Admin',
    nav: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/cafes', label: 'Cafes', icon: Coffee },
      { href: '/admin/orders', label: 'All Orders', icon: ClipboardList },
      { href: '/admin/students', label: 'Students', icon: Users },
      { href: '/admin/staff', label: 'Cafe Staff', icon: UserCog },
      { href: '/admin/menu', label: 'Menu Management', icon: UtensilsCrossed },
      { href: '/admin/categories', label: 'Categories', icon: Tags },
      { href: '/admin/payments', label: 'Payments', icon: Banknote },
      { href: '/admin/analytics', label: 'Revenue Analytics', icon: BarChart3 },
      { href: '/admin/reports', label: 'Reports', icon: FileText },
      { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
    mobileNav: [
      { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
      { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
};
