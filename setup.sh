#!/usr/bin/env bash
# ============================================================
#  setup.sh — установка окружения «Система учёта практик»
#  Поддерживается: Arch Linux / EndeavourOS
#
#  Использование:
#    chmod +x setup.sh
#    ./setup.sh
#
#  Что делает скрипт:
#    1. Обновляет систему
#    2. Устанавливает git, docker, docker-compose, curl, base-devel
#    3. Устанавливает yay (AUR-хелпер) если его нет
#    4. Устанавливает Node.js LTS через nvm
#    5. Добавляет пользователя в группу docker
#    6. Включает и запускает Docker
#    7. Клонирует репозиторий (если ещё не склонирован)
#    8. Восстанавливает БД из dump.sql (если файл есть)
#    9. Запускает приложение
# ============================================================

set -euo pipefail

# ── цвета ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

step()  { echo -e "\n${BLUE}${BOLD}==> $*${NC}"; }
ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
warn()  { echo -e "  ${YELLOW}!${NC} $*"; }
die()   { echo -e "  ${RED}✗ ОШИБКА:${NC} $*"; exit 1; }

REPO_URL="https://github.com/dofoul/practice-sys.git"
PROJECT_DIR="$HOME/practice-sys"

# ── 1. Обновление системы ───────────────────────────────────
step "Обновление системы (pacman -Syu)"
sudo pacman -Syu --noconfirm
ok "Система обновлена"

# ── 2. Базовые пакеты ──────────────────────────────────────
step "Установка базовых пакетов"
sudo pacman -S --noconfirm --needed \
    base-devel git curl wget \
    docker docker-compose
ok "Пакеты установлены"

# ── 3. yay (AUR-хелпер) ────────────────────────────────────
if ! command -v yay &>/dev/null; then
    step "Установка yay (AUR-хелпер)"
    TMP=$(mktemp -d)
    git clone --depth=1 https://aur.archlinux.org/yay.git "$TMP/yay"
    (cd "$TMP/yay" && makepkg -si --noconfirm)
    rm -rf "$TMP"
    ok "yay установлен"
else
    ok "yay уже установлен: $(yay --version | head -1)"
fi

# ── 4. Node.js через nvm ───────────────────────────────────
step "Установка Node.js LTS через nvm"
export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    ok "nvm установлен"
fi

# Загружаем nvm в текущую оболочку
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh"

nvm install --lts
nvm use --lts
nvm alias default node

NODE_VER=$(node --version)
NPM_VER=$(npm --version)
ok "Node.js $NODE_VER, npm $NPM_VER"

# Добавляем nvm в ~/.bashrc и ~/.zshrc если их нет
for RC in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$RC" ] && ! grep -q 'NVM_DIR' "$RC"; then
        cat >> "$RC" <<'NVM_BLOCK'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
NVM_BLOCK
        ok "nvm добавлен в $RC"
    fi
done

# ── 5. Docker — группа и запуск ────────────────────────────
step "Настройка Docker"
sudo systemctl enable --now docker
ok "Docker запущен"

if ! groups "$USER" | grep -qw docker; then
    sudo usermod -aG docker "$USER"
    warn "Пользователь добавлен в группу docker."
    warn "Изменение вступит в силу ПОСЛЕ перелогина."
    warn "До этого момента используй: newgrp docker"
else
    ok "Пользователь уже в группе docker"
fi

# ── 6. Клонирование репозитория ────────────────────────────
step "Клонирование репозитория"
if [ -d "$PROJECT_DIR/.git" ]; then
    ok "Репозиторий уже склонирован: $PROJECT_DIR"
    (cd "$PROJECT_DIR" && git pull --ff-only)
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    ok "Репозиторий склонирован в $PROJECT_DIR"
fi
cd "$PROJECT_DIR"

# ── 7. Переключение на нужную ветку ────────────────────────
BRANCH="feature/new-features-and-company-role"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
ok "Ветка: $BRANCH"

# ── 8. Запуск Docker Compose ───────────────────────────────
step "Сборка и запуск контейнеров"
# Если docker ещё не доступен без sudo — пробуем через newgrp
if docker info &>/dev/null 2>&1; then
    docker compose up -d --build
else
    warn "Docker недоступен без sudo (группа не применена). Используем sudo."
    sudo docker compose up -d --build
fi
ok "Контейнеры запущены"

# ── 9. Восстановление БД из dump.sql ──────────────────────
DUMP_FILE="$PROJECT_DIR/prisma/dump.sql"

step "Восстановление базы данных"
if [ -f "$DUMP_FILE" ]; then
    echo "  Ожидание готовности PostgreSQL..."
    RETRIES=20
    until docker exec praktik_db pg_isready -U praktik -q 2>/dev/null || [ $RETRIES -eq 0 ]; do
        sleep 2
        RETRIES=$((RETRIES - 1))
    done
    [ $RETRIES -eq 0 ] && die "PostgreSQL не стартовал вовремя"

    docker exec -i praktik_db psql -U praktik -d praktik_db < "$DUMP_FILE"
    ok "БД восстановлена из $DUMP_FILE"
else
    warn "Файл prisma/dump.sql не найден — пропускаем восстановление БД."
    warn "Скопируй dump.sql в $PROJECT_DIR/prisma/ и запусти:"
    warn "  docker exec -i praktik_db psql -U praktik -d praktik_db < prisma/dump.sql"
fi

# ── 10. Восстановление файлов MinIO ────────────────────────
MINIO_ARCHIVE="$PROJECT_DIR/minio.tar.gz"

step "Восстановление файлов MinIO"
if [ -f "$MINIO_ARCHIVE" ]; then
    NETWORK=$(docker inspect praktik_db \
        --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null | head -1)

    MINIO_TMP=$(mktemp -d)
    tar -xzf "$MINIO_ARCHIVE" -C "$MINIO_TMP"

    if [ -n "$NETWORK" ]; then
        docker run --rm \
            --network "$NETWORK" \
            -v "$MINIO_TMP/minio-files:/src" \
            -e MC_HOST_local="http://minioadmin:minioadmin@minio:9000" \
            minio/mc mirror /src local/praktik 2>/dev/null && \
            ok "Файлы загружены в MinIO" || \
            warn "Не удалось загрузить через сеть"
    fi
    rm -rf "$MINIO_TMP"
else
    warn "Файл minio.tar.gz не найден — файлы MinIO не восстановлены."
    warn "Скопируй minio.tar.gz в $PROJECT_DIR/ для восстановления."
fi

# ── 11. Восстановление миграций Prisma ─────────────────────
MIGRATIONS_ARCHIVE="$PROJECT_DIR/migrations.tar.gz"

step "Восстановление миграций Prisma"
if [ -f "$MIGRATIONS_ARCHIVE" ]; then
    tar -xzf "$MIGRATIONS_ARCHIVE" -C "$PROJECT_DIR/prisma/"
    COUNT=$(find "$PROJECT_DIR/prisma/migrations" -name "migration.sql" | wc -l)
    ok "$COUNT миграций восстановлено в prisma/migrations/"
else
    warn "Файл migrations.tar.gz не найден — пропускаем."
    warn "Приложение работает без них если БД восстановлена из dump.sql."
fi

# ── Готово ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Установка завершена успешно!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Приложение:  ${BOLD}http://localhost:3000${NC}"
echo -e "  MinIO UI:    ${BOLD}http://localhost:9001${NC}  (minioadmin / minioadmin)"
echo -e "  Проект:      ${BOLD}$PROJECT_DIR${NC}"
echo ""
echo -e "  Тестовые аккаунты:"
echo -e "    admin@praktik.ru     / admin123"
echo -e "    curator@praktik.ru   / curator123"
echo -e "    student@praktik.ru   / student123"
echo ""
echo -e "  Управление:"
echo -e "    ${BOLD}docker compose logs -f app${NC}   — логи приложения"
echo -e "    ${BOLD}docker compose down${NC}           — остановить"
echo -e "    ${BOLD}docker compose up -d${NC}          — запустить снова"
echo ""
if groups "$USER" | grep -qw docker; then
    :
else
    echo -e "${YELLOW}  ! Не забудь перелогиниться для применения группы docker!${NC}"
fi
