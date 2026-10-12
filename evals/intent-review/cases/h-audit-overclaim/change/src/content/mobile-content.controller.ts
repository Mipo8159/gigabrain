import { ContentService, CreateContentDto, UpdateContentDto } from './content.service';
import { AuthUser } from '../auth/user';

interface Req { user: AuthUser; headers: Record<string, string>; body: any; params: any }

// Mobile app: creators submit external content for admin review.
export class MobileContentController {
  constructor(private content: ContentService) {}

  // POST /content
  create(req: Req) {
    const dto = req.body as CreateContentDto;
    return this.content.create(dto, req.user.id, req.headers['x-region-id'] ?? null);
  }

  // PATCH /content/:id
  update(req: Req) {
    const { title, category } = req.body as UpdateContentDto;
    return this.content.update(req.params.id, req.user.id, { title, category });
  }

  // GET /content
  list(req: Req) {
    return this.content.listForRegion(req.user.regionId);
  }
}
