'use client';

import FloatingDock from './FloatingDock';
import TopBar from './TopBar';
import type { NavItem } from './roleNav';

/** Student/faculty/staff layout: slim top bar, content, floating dock. No sidebar. */
export default function DockShell({
  title,
  subtitle,
  userName,
  userMeta,
  homeHref,
  profileHref,
  navLabel,
  nav,
  isActive,
  onLogout,
  loggingOut,
  children,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  userMeta?: string;
  homeHref?: string;
  profileHref?: string;
  navLabel?: string;
  nav: NavItem[];
  isActive: (item: NavItem) => boolean;
  onLogout: () => void;
  loggingOut: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="cafe-page relative min-h-screen text-ink">
      <TopBar
        title={title}
        subtitle={subtitle}
        userName={userName}
        userMeta={userMeta}
        homeHref={homeHref}
        profileHref={profileHref}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
      {/* pb-36 keeps the last card clear of the dock */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-36 pt-4 sm:px-8 lg:px-12">{children}</main>
      <FloatingDock items={nav} isActive={isActive} label={navLabel} />
    </div>
  );
}
