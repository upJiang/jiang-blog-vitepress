#!/usr/bin/env bash

set -euo pipefail

nginx_config="${1:-/www/server/nginx/conf/nginx.conf}"
health_path="${2:-/docs/ai-agent/agent-lifecycle}"
backup_file="${nginx_config}.jiang-blog-last-known-good"
candidate_file="$(mktemp)"
health_page="$(mktemp)"

old_rule='try_files $uri $uri/ =404;'
new_rule='try_files $uri $uri.html $uri/ =404;'
slash_rule='if ($uri ~ ^(.+)/$) { return 308 $1; }'

cleanup() {
  rm -f "$candidate_file" "$health_page"
}
trap cleanup EXIT

count_rule() {
  local rule="$1"

  awk -v expected="$rule" '
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      sub(/[[:space:]]*#.*/, "", line)
      sub(/[[:space:]]*$/, "", line)
      if (line == expected) count++
    }
    END { print count + 0 }
  ' "$nginx_config"
}

request_status() {
  local request_path="$1"
  local follow_redirects="${2:-false}"
  local redirect_flag=()

  if [[ "$follow_redirects" == "true" ]]; then
    redirect_flag=(--location)
  fi

  curl --silent --show-error --max-time 10 \
    "${redirect_flag[@]}" \
    --output /dev/null \
    --write-out '%{http_code}' \
    --noproxy '*' \
    --resolve 'junfeng530.xyz:443:127.0.0.1' \
    "https://junfeng530.xyz${request_path}"
}

check_status() {
  local request_path="$1"
  local expected="$2"
  local follow_redirects="${3:-false}"
  local actual

  actual="$(request_status "$request_path" "$follow_redirects")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Unexpected status for $request_path: expected=$expected actual=$actual" >&2
    return 1
  fi
}

check_clean_urls() {
  local attempt asset_path

  for attempt in 1 2 3 4 5; do
    if check_status '/' '200' \
      && check_status "$health_path" '200' \
      && check_status "${health_path}/" '200' 'true' \
      && check_status "${health_path}.html" '200' \
      && check_status '/__jiang_blog_missing_route__' '404'; then
      curl --fail --silent --show-error --max-time 10 \
        --noproxy '*' \
        --resolve 'junfeng530.xyz:443:127.0.0.1' \
        "https://junfeng530.xyz${health_path}" > "$health_page"
      asset_path="$(grep -oE '/assets/[^"[:space:]]+' "$health_page" | sed -n '1p' || true)"
      if [[ -z "$asset_path" ]] || ! check_status "$asset_path" '200'; then
        sleep 1
        continue
      fi
      return 0
    fi
    sleep 1
  done

  return 1
}

restore_config() {
  cp -p "$backup_file" "$nginx_config"
  nginx -t
  nginx -s reload
}

test -f "$nginx_config"

old_count="$(count_rule "$old_rule")"
new_count="$(count_rule "$new_rule")"
slash_count="$(count_rule "$slash_rule")"

if [[ "$old_count" == "0" && "$new_count" == "1" && "$slash_count" == "1" ]]; then
  nginx -t
  check_clean_urls
  exit 0
fi

if [[ "$slash_count" != "0" ]] || ! { [[ "$old_count" == "1" && "$new_count" == "0" ]] || [[ "$old_count" == "0" && "$new_count" == "1" ]]; }; then
  echo "Refusing to edit $nginx_config: found old=$old_count new=$new_count slash=$slash_count." >&2
  exit 1
fi

cp -p "$nginx_config" "$backup_file"

awk '
  {
    line = $0
    code = $0
    sub(/^[[:space:]]*/, "", code)
    sub(/[[:space:]]*#.*/, "", code)
    sub(/[[:space:]]*$/, "", code)
    if (code == "try_files $uri $uri/ =404;" || code == "try_files $uri $uri.html $uri/ =404;") {
      match(line, /^[[:space:]]*/)
      indent = substr(line, RSTART, RLENGTH)
      print indent "if ($uri ~ ^(.+)/$) { return 308 $1; }"
    }
    if (code == "try_files $uri $uri/ =404;") {
      sub(/try_files \$uri \$uri\/ =404;/, "try_files $uri $uri.html $uri/ =404;", line)
    }
    print line
  }
' "$nginx_config" > "$candidate_file"

cp "$candidate_file" "$nginx_config"

if ! nginx -t; then
  restore_config
  exit 1
fi

if ! nginx -s reload; then
  restore_config
  exit 1
fi

if ! check_clean_urls; then
  restore_config
  echo "Clean URL health check failed; restored $backup_file." >&2
  exit 1
fi
