import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireStudentPage } from '@/cafe/lib/rbac';
import { getStudentOrder } from '@/cafe/server/orders';
import OrderDetailClient from '@/cafe/components/student/OrderDetailClient';

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
      <div className="border-b border-slate-200/80 pb-4">
        <Link
          href="/student/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy transition-colors mb-2"
        >
          <ArrowLeft size={14} aria-hidden />
          <span>Back to My Orders</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Order Details & Receipt</h1>
        <p className="mt-1 text-xs text-slate-500">
          Real-time kitchen order tracking and counter cash payment receipt
        </p>
      </div>
      <OrderDetailClient orderId={id} />
    </div>
  );
}
