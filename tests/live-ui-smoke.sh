#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://reviver-platform.iltieresilvas.workers.dev}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

fetch_page() {
  local path="$1"
  local file="$2"
  local code
  code=$(curl -sS -L -o "$file" -w "%{http_code}" "$BASE_URL$path")
  echo "$path -> $code"
  test "$code" = "200"
}

assert_text() {
  local file="$1"
  local pattern="$2"
  if ! grep -Eqi "$pattern" "$file"; then
    echo "Expected pattern not found: $pattern"
    exit 1
  fi
}

assert_redirect_login() {
  local path="$1"
  local headers="$tmpdir/headers-$(echo "$path" | tr '/ ?=&' '______')"
  local code location
  code=$(curl -sS -o /dev/null -D "$headers" -w "%{http_code}" "$BASE_URL$path")
  location=$(awk 'BEGIN{IGNORECASE=1} /^location:/{gsub("\r",""); print $2}' "$headers" | tail -1)
  echo "$path -> $code $location"
  case "$code" in
    301|302|303|307|308) ;;
    *) echo "Expected redirect for $path"; exit 1 ;;
  esac
  echo "$location" | grep -q "/login"
}

assert_api_200() {
  local path="$1"
  local file="$2"
  local code
  code=$(curl -sS -o "$file" -w "%{http_code}" "$BASE_URL$path")
  echo "$path -> $code"
  test "$code" = "200"
}

echo "== Public pages =="
declare -A public_pages=(
  ["/"]="Reviver"
  ["/login"]="Reviver"
  ["/eventos"]="event|agenda"
  ["/redes"]="rede|comunidade"
  ["/ministerio-de-louvor"]="louvor"
  ["/repertorio-da-igreja"]="Repert[oó]rio"
  ["/midia"]="M[ií]dia|conte[uú]do"
  ["/sobre"]="Reviver|Sobre"
  ["/contactos"]="contact|conversa"
  ["/campanhas"]="campanha"
  ["/noticias"]="not[ií]cia|acontece"
  ["/louvor"]="louvor"
)
for path in "${!public_pages[@]}"; do
  file="$tmpdir/public-$(echo "$path" | tr '/' '_').html"
  fetch_page "$path" "$file"
  assert_text "$file" "${public_pages[$path]}"
done
assert_text "$tmpdir/public-_login.html" "reviver-gold\.svg"

echo "== Public APIs =="
for path in   /api/health   /api/public/site   /api/public/worship-repertoire   /api/public/content   /api/public/content/events   /api/public/content/campaigns   /api/public/content/posts   /api/public/content/videos   /api/public/content/galleries   /api/public/content/highlights
do
  file="$tmpdir/api-$(echo "$path" | tr '/' '_').json"
  assert_api_200 "$path" "$file"
done
grep -q '"ok":true' "$tmpdir/api-_api_public_worship-repertoire.json"

echo "== Dynamic public pages when published data exists =="
test_dynamic_route() {
  local api_path="$1"
  local route_prefix="$2"
  local json="$tmpdir/dynamic.json"
  curl -sS "$BASE_URL$api_path" -o "$json"
  local slug
  slug=$(grep -Eo '"slug":"[^"]+"' "$json" | head -1 | cut -d'"' -f4 || true)
  if [ -n "$slug" ]; then
    fetch_page "$route_prefix/$slug" "$tmpdir/dynamic-page.html"
  else
    echo "$api_path has no published slug; detail route skipped"
  fi
}
test_dynamic_route "/api/public/content/events" "/eventos"
test_dynamic_route "/api/public/content/campaigns" "/campanhas"

echo "== Protected UI =="
for path in   /dashboard   /academy   /academy/resources   /achievements   /vocal-gym   /profile   /worship   /worship/repertoire   /worship/share   /worship/substitutions   /worship/reports   /worship/themes   /worship/rotacao   /worship/band-rotation   /worship/import   /worship/schedules/new   /worship/run-sheet/test   /media   /media/edit/test   /media/preview/test   /admin   /admin/site   /admin/academy   /admin/academy/resources   /admin/academy/preview/test   /admin/aprovacoes   /admin/conteudos   /admin/louvor   /admin/mensagens   /admin/ministerios   /admin/utilizadores
do
  assert_redirect_login "$path"
done

echo "== Protected APIs =="
for path in   "/api/worship/search-song?q=Bondade%20de%20Deus"   "/api/worship/resolve-song-links?url=https%3A%2F%2Fexample.com"   "/api/worship/reports.csv"   "/api/worship/schedule-card/test"   "/api/ministry/import-template"
do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  echo "$path -> $code"
  case "$code" in
    401|403|301|302|303|307|308) ;;
    *) echo "Expected auth boundary for $path, got $code"; exit 1 ;;
  esac
done

echo "== Public contact validation =="
code=$(curl -sS -o "$tmpdir/contact.json" -w "%{http_code}"   -H 'content-type: application/json'   -d '{"name":"","email":"not-an-email","subject":"","message":"x"}'   "$BASE_URL/api/public/contact")
echo "/api/public/contact invalid payload -> $code"
case "$code" in
  400|422) ;;
  *) echo "Expected validation error from contact API"; exit 1 ;;
esac

echo "== Security headers =="
curl -sS -I "$BASE_URL/" > "$tmpdir/headers"
grep -qi '^content-type:' "$tmpdir/headers"
grep -qi '^x-content-type-options: *nosniff' "$tmpdir/headers"
grep -qi '^referrer-policy:' "$tmpdir/headers"

echo "Comprehensive live smoke passed."
