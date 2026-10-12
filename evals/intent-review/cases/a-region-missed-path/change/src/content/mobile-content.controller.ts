import { ContentService, CreateContentDto } from './content.service';
import { AuthUser } from '../auth/user';

interface Req { user: AuthUser; headers: Record<string, string>; body: any; params: any }

// Mobile app: creators submit external content for admin review.
export class MobileContentController {
  constructor(private content: ContentService) {}

  // POST /content
  create(req: Req) {
    const dto = req.body as CreateContentDto;
    return this.content.create(dto, req.user.id, req.user.regionId);
  }

  // GET /content
  list(req: Req) {
    return this.content.listForRegion(req.user.regionId);
  }
}
