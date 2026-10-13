import { Body, Controller, PayloadTooLargeException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './create-attachment.dto';

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  create(@Body() dto: CreateAttachmentDto) {
    const maxBytes = Number(this.config.get('MAX_UPLOAD_MB')) * 1024 * 1024;
    if (dto.sizeBytes > maxBytes) throw new PayloadTooLargeException(`Max upload is ${maxBytes} bytes`);
    return this.attachments.register(dto);
  }
}
