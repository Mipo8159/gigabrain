import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsString()
  @Matches(/^[A-Z]{2,5}$/)
  key: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
