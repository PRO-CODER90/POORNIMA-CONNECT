'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_NAV, type Role, type NavItem } from './roleNav';
import DockShell from './DockShell';
import SidebarShell from './SidebarShell';

/** Picks the shell for a role. Student and staff get the floating dock, admin (12 destinations) a floating sidebar. */
export default function RoleShell({
  role,
  roleLabel,
  subtitle,
  userName,
  userMeta,
  children,
}: {
  role: Role;
  roleLabel?: string; // optional override (e.g. staff: "<cafe name> — Staff Panel")
  subtitle?: string;
  userName: string;
  userMeta?: string;
  children: React.ReactNode;
}) {
  const def = ROLE_NAV[role];
  const label = roleLabel ?? def.roleLabel;
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

  const isActive = (item: NavItem) => {
    if (item.match) return item.match(pathname);
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const common = { title: label, subtitle, userName, userMeta, isActive, onLogout: logout, loggingOut };

  if (role === 'admin') {
    return (
      <SidebarShell {...common} nav={def.nav} mobileNav={def.mobileNav} homeHref="/admin/dashboard">
        {children}
      </SidebarShell>
    );
  }

  return (
    <DockShell
      {...common}
      nav={def.nav}
      homeHref={role === 'staff' ? '/staff/dashboard' : '/student/dashboard'}
      profileHref={role === 'student' ? '/student/profile' : undefined}
      navLabel={role === 'staff' ? 'Staff navigation' : 'Student navigation'}
    >
      {children}
    </DockShell>
  );
}
