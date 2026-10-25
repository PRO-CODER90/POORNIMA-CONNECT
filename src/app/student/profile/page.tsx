import { requireStudentPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import ProfileForm from '@/cafe/components/student/ProfileForm';
import { PageHeader } from '@/cafe/components/ui';
import RecoveryEmailCard from '@/cafe/components/student/RecoveryEmailCard';
import { getSession as getPortalSession } from '@/lib/auth';
import { findById } from '@/lib/users';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Profile' };

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const auth = await requireStudentPage();
  const full = await prisma.student.findUnique({ where: { id: auth.student.id } });
  if (!full) return null;
  const portal = await getPortalSession();
  const account = portal ? await findById(portal.uid) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Student Profile"
        sub="Manage your contact information and view your verified university registrar record."
      />
      <ProfileForm
        name={full.name}
        email={full.email}
        phone={full.phone}
        studentCode={full.studentCode}
        department={full.department}
        course={full.course}
        year={full.year}
      />
      {account ? (
        <div className="lg:max-w-[calc(50%-0.75rem)]">
          <RecoveryEmailCard initial={account.personal_email} universityEmail={account.email} hasPassword={!!account.password_hash} />
        </div>
      ) : null}
    </div>
  );
}
