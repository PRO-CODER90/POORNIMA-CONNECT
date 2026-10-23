import { requireStudentPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import ProfileForm from '@/cafe/components/student/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const auth = await requireStudentPage();
  const full = await prisma.student.findUnique({ where: { id: auth.student.id } });
  if (!full) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">My Student Profile</h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage your contact information and view your verified university registrar record.
        </p>
      </div>
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
