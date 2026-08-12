#!/usr/bin/env sh
set -eu

database_url="${DATABASE_URL:-mysql://backend:backend-local-only@127.0.0.1:3307/backend_learning}"
mysql_host="${MYSQL_HOST:-127.0.0.1}"
mysql_port="${MYSQL_PORT:-3307}"
mysql_user="${MYSQL_USER:-backend}"
mysql_password="${MYSQL_PASSWORD:-backend-local-only}"
mysql_database="${MYSQL_DATABASE:-backend_learning}"

mysql --protocol=tcp -h "$mysql_host" -P "$mysql_port" -u "$mysql_user" -p"$mysql_password" "$mysql_database" < "$(dirname "$0")/schema.sql"
echo "schema applied to ${mysql_host}:${mysql_port}/${mysql_database}"
