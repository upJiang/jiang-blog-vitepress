SET time_zone = '+00:00';
SET NAMES utf8mb4;

CREATE TABLE tenants (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_tenants_name (name)
) ENGINE=InnoDB;

CREATE TABLE departments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  name VARCHAR(120) NOT NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_departments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id),
  UNIQUE KEY uq_departments_name (tenant_id, parent_id, name),
  KEY ix_departments_tenant_parent (tenant_id, parent_id, id)
) ENGINE=InnoDB;

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  department_id CHAR(36) NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  status ENUM('active','locked','disabled') NOT NULL DEFAULT 'active',
  password_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id),
  UNIQUE KEY uq_users_email (tenant_id, email),
  KEY ix_users_scope (tenant_id, department_id, status, id)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY uq_roles_code (tenant_id, code)
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, user_id, role_id),
  CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

CREATE TABLE auth_sessions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_family_id CHAR(36) NOT NULL,
  refresh_token_hash BINARY(32) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  rotated_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  revoke_reason VARCHAR(80) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_used_at DATETIME(6) NULL,
  CONSTRAINT fk_auth_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_auth_refresh_hash (refresh_token_hash),
  KEY ix_auth_family (tenant_id, token_family_id, revoked_at),
  KEY ix_auth_user_expiry (tenant_id, user_id, expires_at)
) ENGINE=InnoDB;

CREATE TABLE projects (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  department_id CHAR(36) NULL,
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  deleted_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_projects_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE KEY uq_projects_name (tenant_id, name),
  KEY ix_projects_cursor (tenant_id, status, updated_at DESC, id DESC),
  KEY ix_projects_scope (tenant_id, department_id, deleted_at, id)
) ENGINE=InnoDB;

CREATE TABLE files (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  bucket VARCHAR(120) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  status ENUM('pending','uploaded','scanning','ready','rejected','deleting','deleted') NOT NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_files_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_files_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE KEY uq_files_object (bucket, object_key),
  KEY ix_files_scope (tenant_id, owner_id, status, id)
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  task_type VARCHAR(80) NOT NULL,
  status ENUM('queued','running','retrying','completed','failed','cancelled') NOT NULL,
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  attempt INT UNSIGNED NOT NULL DEFAULT 0,
  owner_token CHAR(36) NULL,
  lease_until DATETIME(6) NULL,
  input_json JSON NOT NULL,
  result_json JSON NULL,
  error_code VARCHAR(120) NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT ck_tasks_progress CHECK (progress <= 100),
  KEY ix_tasks_recovery (status, lease_until, created_at),
  KEY ix_tasks_tenant (tenant_id, created_at DESC, id DESC)
) ENGINE=InnoDB;

CREATE TABLE task_events (
  task_id CHAR(36) NOT NULL,
  sequence BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (task_id, sequence),
  CONSTRAINT fk_task_events_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id CHAR(36) NULL,
  request_id VARCHAR(80) NOT NULL,
  result ENUM('allowed','denied','failed') NOT NULL,
  changes_json JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_audit_tenant_cursor (tenant_id, created_at DESC, id DESC),
  KEY ix_audit_request (request_id)
) ENGINE=InnoDB;

CREATE TABLE idempotency_keys (
  tenant_id CHAR(36) NOT NULL,
  scope VARCHAR(120) NOT NULL,
  idem_key VARCHAR(128) NOT NULL,
  request_hash BINARY(32) NOT NULL,
  status ENUM('processing','completed','failed') NOT NULL,
  response_status SMALLINT UNSIGNED NULL,
  response_json JSON NULL,
  expires_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, scope, idem_key),
  KEY ix_idempotency_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE outbox_events (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id CHAR(36) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('pending','publishing','published','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  published_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_outbox_dispatch (status, available_at, created_at),
  KEY ix_outbox_aggregate (tenant_id, aggregate_type, aggregate_id)
) ENGINE=InnoDB;

CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  price DECIMAL(18,2) NOT NULL,
  status ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT ck_products_price CHECK (price >= 0),
  UNIQUE KEY uq_products_sku (tenant_id, sku)
) ENGINE=InnoDB;

CREATE TABLE inventory (
  tenant_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  available INT UNSIGNED NOT NULL,
  reserved INT UNSIGNED NOT NULL DEFAULT 0,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (tenant_id, product_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  status ENUM('pending','paid','cancelled','refunded') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  KEY ix_orders_cursor (tenant_id, created_at DESC, id DESC)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(18,2) NOT NULL,
  PRIMARY KEY (order_id, product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT ck_order_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE payment_callbacks (
  provider VARCHAR(80) NOT NULL,
  provider_event_id VARCHAR(190) NOT NULL,
  order_id CHAR(36) NOT NULL,
  payload_hash BINARY(32) NOT NULL,
  status ENUM('received','applied','rejected') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (provider, provider_event_id)
) ENGINE=InnoDB;

CREATE TABLE knowledge_bases (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  active_version BIGINT UNSIGNED NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_knowledge_base_name (tenant_id, name)
) ENGINE=InnoDB;

CREATE TABLE documents (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  knowledge_base_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  status ENUM('uploaded','queued','parsing','indexing','ready','failed') NOT NULL,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_documents_kb FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id),
  CONSTRAINT fk_documents_file FOREIGN KEY (file_id) REFERENCES files(id),
  CONSTRAINT fk_documents_task FOREIGN KEY (task_id) REFERENCES tasks(id),
  KEY ix_documents_kb (tenant_id, knowledge_base_id, status, id)
) ENGINE=InnoDB;

CREATE TABLE chat_runs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  knowledge_base_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  question TEXT NOT NULL,
  status ENUM('accepted','retrieving','generating','completed','failed','cancelled') NOT NULL,
  answer_json JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY ix_chat_runs_tenant (tenant_id, created_at DESC, id DESC)
) ENGINE=InnoDB;
