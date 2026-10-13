import { Body, Controller, Post } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './create-attachment.dto';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  create(@Body() dto: CreateAttachmentDto) {
    return this.attachments.register(dto);
  }
}
