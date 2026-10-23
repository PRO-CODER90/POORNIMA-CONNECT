import { requireStudentPage } from '@/cafe/lib/rbac';
import RoleShell from '@/cafe/components/layout/RoleShell';
import { CartProvider } from '@/cafe/components/cart/CartContext';
import CartDrawer from '@/cafe/components/cart/CartDrawer';
import CartFab from '@/cafe/components/cart/CartFab';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireStudentPage();
  const student = auth.student;

  return (
    <RoleShell
      role="student"
      subtitle="Order from any of the 3 campus cafes"
      userName={student.name}
      userMeta={student.studentCode}
    >
      <CartProvider>
        {children}
        <CartFab />
        <CartDrawer />
      </CartProvider>
    </RoleShell>
  );
}
