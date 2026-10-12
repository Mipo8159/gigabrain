export interface Reel { id: string; fileUrl: string; title: string; creatorId: string; regionId: string | null }

export class ReelService {
  private reels: Reel[] = [];
  create(data: Omit<Reel, 'id'>): Reel {
    const reel = { ...data, id: `reel-${this.reels.length + 1}` };
    this.reels.push(reel);
    return reel;
  }
  all(): Reel[] { return this.reels; }
}
