import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateAttachmentDto } from './create-attachment.dto';

export interface Attachment extends CreateAttachmentDto {
  id: string;
  uploadUrl: string;
}

@Injectable()
export class AttachmentsService {
  private readonly attachments = new Map<string, Attachment>();

  register(dto: CreateAttachmentDto): Attachment {
    const id = randomUUID();
    const attachment = { id, ...dto, uploadUrl: `https://storage.example.test/uploads/${id}` };
    this.attachments.set(id, attachment);
    return attachment;
  }
}
