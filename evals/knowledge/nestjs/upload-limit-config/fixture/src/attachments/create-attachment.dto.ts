import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  @Length(1, 255)
  filename: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;
}
