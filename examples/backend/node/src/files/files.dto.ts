import { IsInt, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

export class FileIntentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contentType!: string

  @IsInt()
  @Min(1)
  @Max(52_428_800)
  size!: number

  @Matches(/^[a-f0-9]{64}$/)
  sha256!: string
}
