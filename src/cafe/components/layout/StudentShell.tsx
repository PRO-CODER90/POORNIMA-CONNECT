'use client';

import FloatingDock from './FloatingDock';
import StudentTopBar from './StudentTopBar';
import WatercolorBackdrop from './WatercolorBackdrop';
import type { NavItem } from './roleNav';

/** Student/faculty layout: slim top bar, content, floating dock. No sidebar. */
export default function StudentShell({
  title,
  subtitle,
  userName,
  userMeta,
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
  nav: NavItem[];
  isActive: (item: NavItem) => boolean;
  onLogout: () => void;
  loggingOut: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="cafe-page relative min-h-screen bg-canvas text-ink">
      <WatercolorBackdrop />
      <StudentTopBar
        title={title}
        subtitle={subtitle}
        userName={userName}
        userMeta={userMeta}
        onLogout={onLogout}
        loggingOut={loggingOut}
      />
      {/* pb-36 keeps the last card clear of the dock */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-36 pt-4 sm:px-8 lg:px-12">{children}</main>
      <FloatingDock items={nav} isActive={isActive} />
    </div>
  );
}
