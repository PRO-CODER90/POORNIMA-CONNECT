import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireStudentPage } from '@/cafe/lib/rbac';
import { getStudentOrder } from '@/cafe/server/orders';
import OrderDetailClient from '@/cafe/components/student/OrderDetailClient';
import { PageHeader } from '@/cafe/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Order Details' };

export const dynamic = 'force-dynamic';

export default async function StudentOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStudentPage();
  const { id } = await params;

  // Server-side ownership check — a 404 is returned for orders that are not
  // this student's, so other students' order ids cannot be probed (spec §65).
  let exists = false;
  try {
    await getStudentOrder(auth, id);
    exists = true;
  } catch {
    exists = false;
  }
  if (!exists) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/student/orders"
          className="mb-3 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-pu-600 transition-colors hover:text-pu-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
        >
          <ArrowLeft size={15} aria-hidden />
          Back to My Orders
        </Link>
        <PageHeader title="Order Details & Receipt" sub="Real-time kitchen order tracking and counter cash payment receipt" />
      </div>
      <OrderDetailClient orderId={id} />
    </div>
  );
}
