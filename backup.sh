#!/usr/bin/env bash
# ============================================================
#  backup.sh — полный бэкап «Системы учёта практик»
#
#  Использование:
#    chmod +x backup.sh
#    ./backup.sh
#
#  Создаёт папку backup-YYYY-MM-DD/ содержащую:
#    dump.sql          — дамп PostgreSQL
#    minio.tar.gz      — все файлы из MinIO (документы, шаблоны)
#    migrations.tar.gz — папка prisma/migrations/
#
#  Для переноса скопируй всю папку backup-* на новое устройство.
# ============================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

step() { echo -e "\n${BLUE}${BOLD}==> $*${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}!${NC} $*"; }
die()  { echo -e "  ${RED}✗ ОШИБКА:${NC} $*"; exit 1; }

# ── папка для бэкапа ───────────────────────────────────────
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="backup-$DATE"
mkdir -p "$BACKUP_DIR"
ok "Папка бэкапа: $BACKUP_DIR/"

# ── проверка запущенных контейнеров ────────────────────────
step "Проверка контейнеров"
if ! docker info &>/dev/null 2>&1; then
    die "Docker не запущен. Запусти: sudo systemctl start docker"
fi

RUNNING=$(docker ps --format "{{.Names}}" 2>/dev/null)
if ! echo "$RUNNING" | grep -q "praktik_db"; then
    warn "Контейнеры не запущены. Запускаю..."
    docker compose up -d
    sleep 5
fi
ok "Контейнеры работают"

# ── 1. Дамп PostgreSQL ─────────────────────────────────────
step "Бэкап PostgreSQL → $BACKUP_DIR/dump.sql"
until docker exec praktik_db pg_isready -U praktik -q 2>/dev/null; do
    echo "  Ожидание PostgreSQL..."; sleep 2
done

docker exec praktik_db pg_dump -U praktik -d praktik_db --no-owner --no-acl \
    > "$BACKUP_DIR/dump.sql"

SIZE=$(wc -c < "$BACKUP_DIR/dump.sql")
ok "dump.sql создан ($SIZE байт)"

# ── 2. Файлы MinIO ─────────────────────────────────────────
step "Бэкап файлов MinIO → $BACKUP_DIR/minio.tar.gz"

# Скачиваем файлы из MinIO в локальную папку через mc
NETWORK=$(docker network ls --filter "name=_default" --format "{{.Name}}" | grep -i "sys\|praktik" | head -1)
if [ -z "$NETWORK" ]; then
    NETWORK=$(docker inspect praktik_db --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | head -1)
fi

MINIO_TMP="$BACKUP_DIR/minio-files"
mkdir -p "$MINIO_TMP"

if [ -n "$NETWORK" ]; then
    docker run --rm \
        --network "$NETWORK" \
        -v "$(pwd)/$MINIO_TMP:/export" \
        -e MC_HOST_local="http://minioadmin:minioadmin@minio:9000" \
        minio/mc mirror local/praktik /export 2>/dev/null && \
        ok "Файлы скачаны из MinIO" || warn "Не удалось скачать файлы через сеть — пробую через volume"
fi

# Если скачать не удалось — бэкапим volume напрямую
FILE_COUNT=$(find "$MINIO_TMP" -type f 2>/dev/null | wc -l)
if [ "$FILE_COUNT" -eq 0 ]; then
    docker run --rm \
        -v praktik_miniodata:/minio-data \
        -v "$(pwd)/$MINIO_TMP:/export" \
        alpine sh -c "cp -r /minio-data/. /export/"
    ok "Файлы скопированы из Docker volume"
fi

tar -czf "$BACKUP_DIR/minio.tar.gz" -C "$BACKUP_DIR" minio-files
rm -rf "$MINIO_TMP"
FILE_COUNT=$(tar -tzf "$BACKUP_DIR/minio.tar.gz" | grep -v '/$' | wc -l)
SIZE=$(wc -c < "$BACKUP_DIR/minio.tar.gz")
ok "minio.tar.gz создан ($FILE_COUNT файлов, $SIZE байт)"

# ── 3. Миграции Prisma ─────────────────────────────────────
step "Бэкап миграций Prisma → $BACKUP_DIR/migrations.tar.gz"
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    tar -czf "$BACKUP_DIR/migrations.tar.gz" -C prisma migrations
    COUNT=$(tar -tzf "$BACKUP_DIR/migrations.tar.gz" | grep "migration.sql" | wc -l)
    ok "migrations.tar.gz создан ($COUNT миграций)"
else
    warn "Папка prisma/migrations/ пуста или не существует — пропускаем"
fi

# ── Итог ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Бэкап завершён!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Содержимое ${BOLD}$BACKUP_DIR/${NC}:"
ls -lh "$BACKUP_DIR/"
echo ""
echo -e "  Для переноса скопируй всю папку ${BOLD}$BACKUP_DIR/${NC} на новое устройство"
echo -e "  (USB, rsync, scp, облако)."
echo ""
echo -e "  На новом устройстве:"
echo -e "    1. Скопируй dump.sql        → в папку проекта prisma/"
echo -e "    2. Скопируй minio.tar.gz    → в папку проекта"
echo -e "    3. Скопируй migrations.tar.gz → в папку проекта"
echo -e "    4. Запусти: ${BOLD}./setup.sh${NC}"
