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

echo "== Public UI =="
fetch_page "/" "$tmpdir/home.html"
assert_text "$tmpdir/home.html" "Reviver"

fetch_page "/login" "$tmpdir/login.html"
assert_text "$tmpdir/login.html" "Reviver"
assert_text "$tmpdir/login.html" "reviver-gold\.svg"

fetch_page "/midia" "$tmpdir/media.html"
assert_text "$tmpdir/media.html" "M[ií]dia|conte[uú]do"

fetch_page "/repertorio-da-igreja" "$tmpdir/repertoire.html"
assert_text "$tmpdir/repertoire.html" "Repert[oó]rio"

echo "== Public APIs =="
code=$(curl -sS -o "$tmpdir/repertoire.json" -w "%{http_code}" "$BASE_URL/api/public/worship-repertoire")
echo "/api/public/worship-repertoire -> $code"
test "$code" = "200"
grep -q '"ok":true' "$tmpdir/repertoire.json"

code=$(curl -sS -o "$tmpdir/site.json" -w "%{http_code}" "$BASE_URL/api/public/site")
echo "/api/public/site -> $code"
test "$code" = "200"

code=$(curl -sS -o "$tmpdir/health.json" -w "%{http_code}" "$BASE_URL/api/health")
echo "/api/health -> $code"
test "$code" = "200"

echo "== Protected UI =="
for path in   /worship   /worship/repertoire   /worship/share   /worship/substitutions   /worship/reports   /worship/run-sheet/test   /academy   /media   /admin   /admin/site   /admin/academy   /admin/utilizadores
do
  headers="$tmpdir/headers-$(echo "$path" | tr '/ ' '__')"
  code=$(curl -sS -o /dev/null -D "$headers" -w "%{http_code}" "$BASE_URL$path")
  location=$(awk 'BEGIN{IGNORECASE=1} /^location:/{gsub("\r",""); print $2}' "$headers" | tail -1)
  echo "$path -> $code $location"
  case "$code" in
    301|302|303|307|308) ;;
    *) echo "Expected redirect for $path"; exit 1 ;;
  esac
  echo "$location" | grep -q "/login"
done

echo "== Authorization boundaries =="
code=$(curl -sS -o "$tmpdir/song-search.json" -w "%{http_code}" "$BASE_URL/api/worship/search-song?q=Bondade%20de%20Deus")
echo "/api/worship/search-song -> $code"
test "$code" = "401"

echo "== Basic headers =="
curl -sS -I "$BASE_URL/" > "$tmpdir/headers"
grep -qi '^content-type:' "$tmpdir/headers"

echo "Live UI smoke passed."
