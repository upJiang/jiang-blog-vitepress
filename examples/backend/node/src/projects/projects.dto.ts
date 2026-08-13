import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string

  @IsInt()
  @Min(1)
  version!: number

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null
}
