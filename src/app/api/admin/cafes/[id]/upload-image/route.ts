import { handleApi } from '@/cafe/lib/api';
import { handleImageUpload } from '@/cafe/server/imageUploadRoute';
import { adminCafeScope, param } from '@/cafe/server/inventoryScope';

export const maxDuration = 30;

export const POST = handleApi(async (req, ctx) => {
  const { scope, cafeCode } = await adminCafeScope(await param(ctx));
  return handleImageUpload(req, { userId: scope.actorUserId, cafeCode });
});
