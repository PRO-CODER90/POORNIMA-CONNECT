import { handleApi } from '@/cafe/lib/api';
import { handleImageUpload } from '@/cafe/server/imageUploadRoute';
import { staffScope } from '@/cafe/server/inventoryScope';

export const maxDuration = 30;

export const POST = handleApi(async (req) => {
  const { scope, cafeCode } = await staffScope();
  return handleImageUpload(req, { userId: scope.actorUserId, cafeCode });
});
