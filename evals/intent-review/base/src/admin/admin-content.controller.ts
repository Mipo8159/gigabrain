import { ContentService, CreateContentDto } from '../content/content.service';
import { ExternalContentService } from '../external/external-content.service';
import { AuthUser } from '../auth/user';

interface Req { user: AuthUser; headers: Record<string, string>; body: any; params: any }

// Admin panel.
export class AdminContentController {
  constructor(private content: ContentService, private external: ExternalContentService) {}

  // POST /admin/content  (admin uploads content on a creator's behalf)
  create(req: Req) {
    const dto = req.body as CreateContentDto & { creatorId: string };
    return this.content.create(dto, dto.creatorId, req.headers['x-region-id'] ?? null);
  }

  // POST /admin/content/:id/approve
  approve(req: Req) {
    return this.external.approve(req.params.id);
  }
}
