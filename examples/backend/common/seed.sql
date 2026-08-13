INSERT INTO tenants (id, name, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Demo tenant', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO users (
  id, tenant_id, department_id, email, password_hash, display_name, status
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'demo@example.test',
  '$argon2id$v=19$m=65536,t=3,p=4$Xn57nY0kCdihc+I1MFhWIQ$mpbCtuKlRcBfEQdrZJygL/IBXicyESQLEUGeX2c1bBI',
  'Demo User',
  'active'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  display_name = VALUES(display_name),
  status = VALUES(status);

INSERT INTO departments (id, tenant_id, parent_id, name)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NULL,
  'Engineering'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

UPDATE users
SET department_id = '20000000-0000-4000-8000-000000000001'
WHERE id = '10000000-0000-0000-0000-000000000001';

INSERT INTO roles (id, tenant_id, code, name)
VALUES (
  '21000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin',
  'Administrator'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (id, code, description) VALUES
  ('22000000-0000-4000-8000-000000000001', 'project.read', 'Read tenant projects'),
  ('22000000-0000-4000-8000-000000000002', 'project.write', 'Create and update tenant projects'),
  ('22000000-0000-4000-8000-000000000003', 'file.write', 'Create direct upload intents'),
  ('22000000-0000-4000-8000-000000000004', 'task.read', 'Read task state and events')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO user_roles (tenant_id, user_id, role_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000001',
  '21000000-0000-4000-8000-000000000001'
);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'),
  ('21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000003'),
  ('21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000004');

INSERT INTO products (id, tenant_id, sku, name, price, status)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'DEMO-SKU-001',
  'Demo product',
  19.90,
  'active'
)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), status = VALUES(status);

INSERT INTO inventory (tenant_id, product_id, available, reserved)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '30000000-0000-4000-8000-000000000001',
  100,
  0
)
ON DUPLICATE KEY UPDATE available = GREATEST(available, 100);

INSERT INTO knowledge_bases (id, tenant_id, name)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Demo knowledge base'
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO files (
  id, tenant_id, owner_id, bucket, object_key, filename, content_type,
  size_bytes, sha256, status
)
VALUES (
  '60000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000001',
  'backend-files',
  'seed/demo/readme.txt',
  'readme.txt',
  'text/plain',
  13,
  '315f5bdb76d078c43b8ac0064e4a0164612b1fce6b5b7d4d0edc2d5b9e4f4a10',
  'ready'
)
ON DUPLICATE KEY UPDATE filename = VALUES(filename), status = VALUES(status);
