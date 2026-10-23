import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminExport } from '@/cafe/server/admin/analytics';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  const q = new URL(req.url).searchParams;
  const { filename, csv } = await adminExport(admin, q.get('type') ?? 'daily', q);
  return new Response(`${csv}\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
