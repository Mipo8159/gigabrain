export type ContentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ContentType = 'REEL' | 'LESSON';

export interface Content {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  fileUrl: string;
  type: ContentType;
  status: ContentStatus;
  regionId: string | null;
  creatorId: string;
  courseId?: string;
  updatedBy?: string;
  rejectionReason?: string;
  deletedAt?: string;
}
