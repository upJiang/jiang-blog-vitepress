import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Principal } from '../auth/auth.types'
import { PrismaService } from '../prisma.service'
import { jsonValue } from '../json-value'

type Collection = 'tenants' | 'departments' | 'users' | 'roles' | 'permissions' | 'audit-logs'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: Principal, collection: Collection) {
    const tenantId = principal.tenantId
    const statements: Record<Collection, Prisma.Sql> = {
      tenants: Prisma.sql`
        SELECT id, name, status, CAST(version AS CHAR) AS version, created_at AS createdAt,
               updated_at AS updatedAt
        FROM tenants WHERE id = ${tenantId} ORDER BY id LIMIT 100`,
      departments: Prisma.sql`
        SELECT id, tenant_id AS tenantId, parent_id AS parentId, name,
               CAST(version AS CHAR) AS version, created_at AS createdAt, updated_at AS updatedAt
        FROM departments WHERE tenant_id = ${tenantId} ORDER BY id LIMIT 100`,
      users: Prisma.sql`
        SELECT id, tenant_id AS tenantId, department_id AS departmentId, email,
               display_name AS displayName, status, CAST(version AS CHAR) AS version,
               created_at AS createdAt, updated_at AS updatedAt
        FROM users WHERE tenant_id = ${tenantId} ORDER BY id LIMIT 100`,
      roles: Prisma.sql`
        SELECT id, tenant_id AS tenantId, code, name, created_at AS createdAt
        FROM roles WHERE tenant_id = ${tenantId} ORDER BY id LIMIT 100`,
      permissions: Prisma.sql`
        SELECT DISTINCT p.id, p.code, p.description
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN roles r ON r.id = rp.role_id
        WHERE r.tenant_id = ${tenantId}
        ORDER BY p.code LIMIT 100`,
      'audit-logs': Prisma.sql`
        SELECT id, tenant_id AS tenantId, actor_id AS actorId, action,
               resource_type AS resourceType, resource_id AS resourceId, request_id AS requestId,
               result, changes_json AS changes, created_at AS createdAt
        FROM audit_logs WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC, id DESC LIMIT 100`,
    }
    const items = await this.prisma.$queryRaw<Record<string, unknown>[]>(statements[collection])
    return { items: jsonValue(items), nextCursor: null }
  }
}
