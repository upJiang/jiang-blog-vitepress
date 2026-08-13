import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Client } from 'minio'
import type { Principal } from '../auth/auth.types'
import { PrismaService } from '../prisma.service'
import type { FileIntentDto } from './files.dto'

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async presign(principal: Principal, input: FileIntentDto) {
    const id = randomUUID()
    const bucket = process.env.MINIO_BUCKET ?? 'backend-files'
    const objectKey = `tenants/${principal.tenantId}/files/${id}/source`
    const expiresInSeconds = 15 * 60
    let uploadUrl: string
    try {
      uploadUrl = await this.client().presignedPutObject(bucket, objectKey, expiresInSeconds)
      uploadUrl = this.publicUploadUrl(uploadUrl)
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'object_storage_unavailable',
        detail: 'Unable to sign upload',
      }, { cause: error as Error })
    }
    await this.prisma.storedFile.create({
      data: {
        id,
        tenantId: principal.tenantId,
        ownerId: principal.sub,
        bucket,
        objectKey,
        filename: input.filename.trim(),
        contentType: input.contentType,
        sizeBytes: BigInt(input.size),
        sha256: input.sha256,
        status: 'pending',
      },
    })
    return {
      fileId: id,
      objectKey,
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    }
  }

  async download(principal: Principal, fileId: string): Promise<string> {
    const file = await this.prisma.storedFile.findFirst({
      where: { id: fileId, tenantId: principal.tenantId, status: { notIn: ['deleted', 'deleting'] } },
    })
    if (!file) throw new NotFoundException('file_not_found')
    try {
      const signedUrl = await this.client().presignedGetObject(file.bucket, file.objectKey, 5 * 60)
      return this.publicUploadUrl(signedUrl)
    } catch (error) {
      throw new ServiceUnavailableException({
        code: 'object_storage_unavailable',
        detail: 'Unable to sign download',
      }, { cause: error as Error })
    }
  }

  private client(): Client {
    const endpoint = new URL(process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000')
    return new Client({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)),
      useSSL: endpoint.protocol === 'https:',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'backend',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'backend-local-only',
    })
  }

  private publicUploadUrl(signedUrl: string): string {
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT
    if (!publicEndpoint) return signedUrl
    const signed = new URL(signedUrl)
    const published = new URL(publicEndpoint)
    signed.protocol = published.protocol
    signed.host = published.host
    return signed.toString()
  }
}
