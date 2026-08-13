#!/usr/bin/env sh
set -eu

mysql_host="${MYSQL_HOST:-127.0.0.1}"
mysql_port="${MYSQL_PORT:-3307}"
mysql_user="${MYSQL_USER:-backend}"
mysql_password="${MYSQL_PASSWORD:-backend-local-only}"
mysql_database="${MYSQL_DATABASE:-backend_learning}"
migration_version="202608120001"
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

mysql_run() {
  mysql --protocol=tcp \
    -h "$mysql_host" -P "$mysql_port" \
    -u "$mysql_user" -p"$mysql_password" \
    "$mysql_database" "$@"
}

mysql_run <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(32) PRIMARY KEY,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;
SQL

already_applied="$(mysql_run -Nse "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_version'")"
if [ "$already_applied" = "1" ]; then
  mysql_run < "$script_dir/seed.sql"
  echo "schema migration ${migration_version} already applied"
  exit 0
fi

mysql_run < "$script_dir/schema.sql"
mysql_run < "$script_dir/seed.sql"
mysql_run -e "INSERT INTO schema_migrations (version) VALUES ('$migration_version')"
echo "schema migration ${migration_version} applied to ${mysql_host}:${mysql_port}/${mysql_database}"
