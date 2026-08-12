-- CreateTable
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX `users_email_key`(`email`),
  INDEX `users_tenant_id_idx`(`tenant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_family_id` CHAR(36) NOT NULL,
  `refresh_token_hash` BINARY(32) NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `rotated_at` DATETIME(6) NULL,
  `revoked_at` DATETIME(6) NULL,
  `revoke_reason` VARCHAR(80) NULL,
  `last_used_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX `auth_sessions_refresh_token_hash_key`(`refresh_token_hash`),
  INDEX `auth_sessions_user_id_revoked_at_expires_at_idx`(`user_id`, `revoked_at`, `expires_at`),
  INDEX `auth_sessions_token_family_id_idx`(`token_family_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `owner_id` CHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,
  `deleted_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL,
  UNIQUE INDEX `projects_tenant_id_name_key`(`tenant_id`, `name`),
  INDEX `projects_tenant_id_updated_at_id_idx`(`tenant_id`, `updated_at`, `id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `auth_sessions`
  ADD CONSTRAINT `auth_sessions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `projects`
  ADD CONSTRAINT `projects_owner_id_fkey`
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
