# Запуск проекта в Docker

Полностью контейнеризованная среда: **Next.js 15 + PostgreSQL 16 + MinIO**. Достаточно только **Docker Desktop** — Node.js, PostgreSQL и MinIO ставить не надо.

## Состав контейнеров

| Сервис | Образ | Порт | Описание |
|--------|-------|------|----------|
| `app` | Node.js 20 / Next.js | 3000 | Приложение (hot-reload в dev) |
| `db` | postgres:16-alpine | 5432 | База данных PostgreSQL |
| `minio` | minio/minio | 9000, 9001 | S3-хранилище файлов |
| `minio-init` | minio/mc | — | Создаёт бакет при старте |

## Первый запуск

```bash
# 1. Создать .env из шаблона
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux

# 2. Собрать и запустить все контейнеры
docker compose up -d --build

# 3. Следить за логами приложения
docker compose logs -f app
```

Приложение: **http://localhost:3000**
MinIO Console: **http://localhost:9001** (логин: `minioadmin` / `minioadmin`)

> При старте контейнер `app` автоматически применяет миграции (`prisma migrate deploy`) и запускает dev-сервер.

## Первая миграция и тестовые данные

После первого запуска создай миграцию и засей тестовые данные:

```bash
# Создать первую миграцию (выполнять один раз)
docker compose exec app npx prisma migrate dev --name init

# Загрузить тестовые данные (необязательно)
docker compose exec app npm run db:seed
```

После seed в системе будут:
- `admin@praktik.ru` / `admin123` — администратор
- `curator@praktik.ru` / `curator123` — куратор (группа ИСП-31)
- `student@praktik.ru` / `student123` — студент

## Работа с Prisma

```bash
# Открыть визуальный просмотр БД
docker compose exec app npx prisma studio   # http://localhost:5555

# Применить существующие миграции
docker compose exec app npx prisma migrate deploy

# Создать новую миграцию после изменения schema.prisma
docker compose exec app npx prisma migrate dev --name <название>
```

## Частые команды

```bash
docker compose up -d              # запустить
docker compose down               # остановить (данные сохраняются)
docker compose down -v            # остановить и удалить данные
docker compose exec app sh        # зайти в контейнер приложения
docker compose exec db psql -U praktik -d praktik_db   # psql

# Пересобрать после изменений в package.json
docker compose up -d --build
```

## Production-сборка

```bash
docker build --target runner -t praktik-app:prod .
docker run -p 3000:3000 --env-file .env praktik-app:prod
```

В prod-среде:
- Смени все пароли в `.env`
- Сгенерируй `AUTH_SECRET`: `openssl rand -base64 32`
- Не открывай порты 5432 и 9000 наружу
- В MinIO настрой TLS и смени root credentials

## Примечания

- Хост БД внутри Docker — `db` (не `localhost`). Для Prisma из хоста используй `localhost:5432`.
- Хост MinIO внутри Docker — `minio:9000`. Presigned URLs для браузера используют `localhost:9000` (`MINIO_PUBLIC_ENDPOINT`).
- `node_modules` и `.next` намеренно исключены из volume-монтирования, чтобы не конфликтовали версии хоста и контейнера.
