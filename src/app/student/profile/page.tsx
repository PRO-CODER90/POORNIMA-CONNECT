import { requireStudentPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import ProfileForm from '@/cafe/components/student/ProfileForm';
import { PageHeader } from '@/cafe/components/ui';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const auth = await requireStudentPage();
  const full = await prisma.student.findUnique({ where: { id: auth.student.id } });
  if (!full) return null;

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
    </div>
  );
}
