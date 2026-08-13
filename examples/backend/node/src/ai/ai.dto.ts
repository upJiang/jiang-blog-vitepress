import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateDocumentDto {
  @IsUUID() fileId!: string
}

export class CreateChatRunDto {
  @IsUUID() knowledgeBaseId!: string
  @IsString() @MinLength(1) @MaxLength(8000) question!: string
}
