# Документация — Система учёта практик

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура](#архитектура)
4. [Роли пользователей](#роли-пользователей)
5. [Функциональность](#функциональность)
6. [Структура базы данных](#структура-базы-данных)
7. [API-маршруты](#api-маршруты)
8. [Страницы и маршруты](#страницы-и-маршруты)
9. [Переменные окружения](#переменные-окружения)
10. [Локальный запуск](#локальный-запуск)
11. [Деплой на Vercel](#деплой-на-vercel)
12. [CI/CD](#cicd)

---

## Обзор проекта

**Система учёта практик** — веб-платформа для организации, учёта и контроля прохождения производственной практики студентов в учебных заведениях. Система автоматизирует процесс взаимодействия между студентами, кураторами, администрацией и предприятиями-работодателями.

**Основные задачи системы:**
- Управление заявками студентов на практику
- Согласование и проверка документов кураторами
- Публикация вакансий предприятиями
- Ведение дневника практики
- Аналитика и отчётность

---

## Технологический стек

| Категория | Технология | Версия |
|-----------|-----------|--------|
| Фреймворк | Next.js (App Router) | 15.x |
| Язык | TypeScript | 5.x |
| UI-библиотека | Ant Design | 5.x |
| ORM | Prisma | 5.22.0 |
| База данных | PostgreSQL | — |
| Аутентификация | NextAuth.js (Auth.js) | v5 |
| Хранилище файлов | S3-совместимое (MinIO / Cloudflare R2) | — |
| Валидация | Zod | — |
| Утилиты дат | Day.js | — |
| Хостинг | Vercel | — |
| БД на проде | Neon (serverless PostgreSQL) | — |

---

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                   Клиент (браузер)               │
│        Next.js App Router + Ant Design 5         │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / Server Components
┌──────────────────────▼──────────────────────────┐
│              Next.js Server (Vercel)             │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  App Router │  │ API Routes │  │ Middleware │ │
│  │   (Pages)   │  │  /api/**   │  │  (Auth)   │ │
│  └─────────────┘  └─────┬──────┘  └───────────┘ │
└────────────────────────-┼───────────────────────┘
                          │
          ┌───────────────┼──────────────┐
          │               │              │
┌─────────▼──────┐ ┌──────▼──────┐ ┌───▼──────────┐
│  Neon (Postgres)│ │ Cloudflare  │ │  NextAuth    │
│  + Prisma ORM   │ │     R2      │ │  JWT Sessions│
└────────────────┘ └─────────────┘ └──────────────┘
```

**Ключевые архитектурные решения:**
- **App Router** — серверные компоненты для страниц, клиентские для интерактивных форм
- **JWT-сессии** — токены хранятся в HTTP-only cookie, не требуют базы данных для сессий
- **Lazy S3** — клиент хранилища инициализируется только при обращении к файлам, что позволяет запустить приложение без настроенного хранилища
- **Serverless-совместимость** — `PrismaClient` создаётся как singleton через `globalThis`, чтобы избежать превышения лимита подключений в serverless-среде

---

## Роли пользователей

### `student` — Студент
Основной пользователь системы. Проходит практику, загружает документы, ведёт дневник.

### `curator` — Куратор
Преподаватель, закреплённый за группами. Проверяет практики, согласует документы, выставляет оценки.

### `admin` — Администратор
Управляет всей системой: пользователями, группами, периодами практик, справочниками.

### `company` — Представитель предприятия
Публикует вакансии для практики, просматривает заявки студентов, видит аналитику.

---

## Функциональность

### Студент
- Регистрация и вход в систему
- Просмотр каталога вакансий практик от предприятий
- Подача заявки на практику (через вакансию или самостоятельно)
- Загрузка документов (PDF, DOC, DOCX, JPG, PNG до 10 МБ)
- Ведение дневника практики (по датам)
- Экспорт дневника в текстовый файл
- Просмотр статуса проверки документов и практики
- Оставление отзыва о предприятии после завершения практики
- Получение уведомлений об изменении статуса

### Куратор
- Просмотр практик своих групп с фильтрацией по статусу, периоду, группе
- Проверка практик: принять / отправить на доработку / отклонить
- Проверка отдельных документов (принять/отклонить с комментарием)
- Выставление итоговой оценки за практику
- Комментирование практики
- Экспорт списка практик в Excel
- Экспорт списка студентов

### Администратор
- Управление пользователями (создание, редактирование, блокировка)
- Управление студентами и кураторами (привязка к группам)
- Управление учебными группами и специальностями
- Управление учебными заведениями
- Управление периодами практик (открытие/закрытие)
- Управление справочниками (типы практик, типы документов, предприятия)

### Предприятие (компания)
- Регистрация и вход через отдельный портал (`/company/login`)
- Создание и публикация вакансий для практики
- Настройка шаблонов документов для вакансии
- Просмотр заявок студентов на вакансии
- Просмотр профилей студентов-практикантов
- Аналитика: количество откликов, принятых студентов, средняя оценка
- Клонирование вакансий
- Управление профилем компании

---

## Структура базы данных

### Пользователи и аутентификация

#### `User` — базовая сущность пользователя
| Поле | Тип | Описание |
|------|-----|----------|
| id | Int | Первичный ключ |
| email | String | Уникальный email |
| passwordHash | String | Bcrypt-хэш пароля |
| fullName | String | Полное имя |
| phone | String? | Телефон |
| role | Enum | student / curator / admin / company |
| isActive | Boolean | Активен ли аккаунт |

#### `Notification` — уведомления пользователя
| Поле | Тип | Описание |
|------|-----|----------|
| type | String | Тип уведомления |
| title | String | Заголовок |
| body | String | Текст |
| isRead | Boolean | Прочитано ли |
| link | String? | Ссылка для перехода |

---

### Учебная иерархия

```
Institution (Учебное заведение)
    └── Specialty (Специальность)
            └── Group (Группа)
                    ├── Student (Студент)
                    └── GroupCurator → Curator (Куратор)
```

#### `Institution` — учебное заведение
Поля: `name`, `shortName`

#### `Specialty` — специальность
Поля: `institutionId`, `code` (09.02.07), `name`

#### `Group` — учебная группа
Поля: `specialtyId`, `name` (ИСП-31), `course`, `enrollmentYear`

#### `Student` — профиль студента
Поля: `userId`, `groupId`, `recordBookNo`

#### `Curator` — профиль куратора
Поля: `userId`, `position`, `department`

#### `GroupCurator` — привязка куратора к группе
Уникальная пара `(groupId, curatorId)` — один куратор может вести несколько групп.

---

### Практика и вакансии

#### `PracticePeriod` — период практики
| Поле | Тип | Описание |
|------|-----|----------|
| name | String | Название периода |
| dateStart | Date | Начало периода |
| dateEnd | Date | Конец периода |
| isOpen | Boolean | Открыт ли приём заявок |

#### `PracticeType` — тип практики
Значения: `educational` (Учебная), `industrial` (Производственная), `pre_diploma` (Преддипломная)

#### `Company` — предприятие
| Поле | Тип | Описание |
|------|-----|----------|
| name | String | Название |
| inn | String | ИНН |
| address | String | Адрес |
| contactPerson | String? | Контактное лицо |
| contactPhone | String? | Телефон |
| website | String? | Сайт |
| isVerified | Boolean | Верификация |
| ownerUserId | Int? | Ссылка на пользователя-владельца |

#### `PracticeOffer` — вакансия для практики
| Поле | Тип | Описание |
|------|-----|----------|
| companyId | Int | Предприятие |
| practiceTypeId | Int | Тип практики |
| periodId | Int | Период |
| title | String | Название вакансии |
| description | String | Описание |
| direction | String? | Направление |
| slotsTotal | Int | Всего мест |
| slotsTaken | Int | Занято мест |
| isPublished | Boolean | Опубликована ли |

#### `OfferTemplate` — шаблон документа для вакансии
Поля: `offerId`, `documentTypeId`, `fileKey` (путь в S3)

---

### Записи о практике студента

#### `Practice` — запись о практике студента
| Поле | Тип | Описание |
|------|-----|----------|
| studentId | Int | Студент |
| practiceTypeId | Int | Тип практики |
| periodId | Int | Период |
| offerId | Int? | Вакансия (если через каталог) |
| companyId | Int? | Предприятие |
| customPlace | String? | Произвольное место практики |
| dateStart / dateEnd | Date? | Даты практики |
| status | Enum | draft / submitted / needs_revision / approved / rejected / completed |
| grade | String? | Итоговая оценка |
| submittedAt | DateTime? | Дата подачи |

**Жизненный цикл практики:**
```
draft → submitted → approved → completed
              ↓
        needs_revision → submitted
              ↓
           rejected
```

#### `Document` — документ практики
| Поле | Тип | Описание |
|------|-----|----------|
| practiceId | Int | Практика |
| documentTypeId | Int | Тип документа |
| fileKey | String | Путь к файлу в S3 |
| originalName | String | Оригинальное имя файла |
| status | Enum | uploaded / accepted / rejected |
| reviewComment | String? | Комментарий куратора |

#### `DiaryEntry` — запись дневника практики
Уникальность по `(practiceId, entryDate)` — одна запись на дату.

#### `PracticeComment` — комментарий к практике
Свободные комментарии куратора или студента к записи о практике.

---

### Отзывы и проверки

#### `OfferReview` — отзыв студента о вакансии
Поля: `offerId`, `practiceId`, `studentId`, `rating` (1–5), `comment`
Уникальность: один отзыв от студента на вакансию.

#### `PracticeReview` — решение куратора по практике
Поля: `practiceId`, `curatorId`, `oldStatus`, `newStatus`, `comment`
Хранит историю всех изменений статуса.

---

## API-маршруты

### Аутентификация

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/auth/[...nextauth]` | * | NextAuth.js — вход/выход |
| `/api/auth/register` | POST | Регистрация студента |
| `/api/auth/register/company` | POST | Регистрация компании |
| `/api/me` | GET | Данные текущего пользователя |

### Практики

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/practices` | GET | Список практик (с фильтрацией по роли) |
| `/api/practices` | POST | Создание новой практики |
| `/api/practices/[id]` | GET | Детали практики |
| `/api/practices/[id]` | PUT | Обновление практики |
| `/api/practices/[id]/submit` | POST | Подача на проверку |
| `/api/practices/[id]/review` | POST | Проверка куратором |
| `/api/practices/[id]/grade` | POST | Выставление оценки |
| `/api/practices/[id]/documents` | GET, POST | Документы практики |
| `/api/practices/[id]/diary` | GET, POST | Дневник практики |
| `/api/practices/[id]/diary/export` | POST | Экспорт дневника |
| `/api/practices/[id]/comments` | GET, POST | Комментарии |
| `/api/practices/bulk-action` | POST | Массовое изменение статуса |

### Вакансии

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/offers` | GET | Публичный каталог вакансий |
| `/api/offers/[id]` | GET | Детали вакансии |
| `/api/offers/[id]/reviews` | GET, POST | Отзывы о вакансии |
| `/api/company/offers` | GET, POST | Вакансии компании (CRUD) |
| `/api/company/offers/[id]` | GET, PUT, DELETE | Управление вакансией |
| `/api/company/offers/[id]/clone` | POST | Клонирование вакансии |
| `/api/company/offers/[id]/templates` | GET, POST | Шаблоны документов |
| `/api/company/offers/[id]/applicants` | GET | Заявки студентов |

### Документы

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/documents/[id]` | GET | Данные документа |
| `/api/documents/[id]/download` | GET | Скачать файл |
| `/api/documents/[id]/review` | POST | Проверка документа куратором |

### Уведомления

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/notifications` | GET | Список уведомлений |
| `/api/notifications/[id]/read` | POST | Отметить как прочитанное |
| `/api/notifications/read-all` | POST | Отметить все как прочитанные |

### Администрирование

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/admin/users` | GET, POST | Пользователи |
| `/api/admin/students` | GET, POST | Студенты |
| `/api/admin/curators` | GET, POST | Кураторы |
| `/api/admin/periods` | GET, POST | Периоды практик |
| `/api/admin/institutions` | GET, POST | Учебные заведения |
| `/api/admin/groups` | GET | Группы |
| `/api/admin/dictionaries/companies` | GET, POST | Справочник предприятий |
| `/api/admin/dictionaries/document-types` | GET, POST | Типы документов |
| `/api/admin/dictionaries/practice-types` | GET, POST | Типы практик |

### Аналитика и экспорт

| Маршрут | Метод | Описание |
|---------|-------|----------|
| `/api/dashboard` | GET | Статистика дашборда |
| `/api/company/dashboard` | GET | Дашборд компании |
| `/api/company/analytics` | GET | Аналитика компании |
| `/api/export/practices` | GET | Экспорт практик в Excel |
| `/api/export/students` | GET | Экспорт студентов в Excel |

---

## Страницы и маршруты

### Публичные страницы

| Маршрут | Описание |
|---------|----------|
| `/` | Лендинг с описанием системы и каруселью вакансий |
| `/login` | Вход для студентов и сотрудников |
| `/register` | Регистрация студента |
| `/company/login` | Вход для представителей предприятий |
| `/register/company` | Регистрация предприятия |

### Защищённые страницы (требуют авторизации)

| Маршрут | Доступ | Описание |
|---------|--------|----------|
| `/dashboard` | Все роли | Главная страница с персонализированной статистикой |
| `/practices` | Все роли | Список практик |
| `/practices/[id]` | Все роли | Детальная страница практики |
| `/catalog` | Все роли | Каталог вакансий |
| `/catalog/[id]` | Все роли | Детали вакансии |
| `/companies` | Все роли | Список предприятий |
| `/groups` | Куратор, Админ | Управление группами |
| `/notifications` | Все роли | Уведомления |
| `/company/offers` | Компания | Управление вакансиями |
| `/company/students` | Компания | Студенты-практиканты |
| `/company/analytics` | Компания | Аналитика |
| `/company/profile` | Компания | Профиль компании |
| `/admin/users` | Админ | Управление пользователями |
| `/admin/students` | Админ | Управление студентами |
| `/admin/curators` | Админ | Управление кураторами |
| `/admin/periods` | Админ | Периоды практик |
| `/admin/institutions` | Админ | Учебные заведения |
| `/admin/groups` | Админ | Группы |
| `/admin/dictionaries` | Админ | Справочники |

---

## Переменные окружения

```env
# База данных
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"  # без pgbouncer, для миграций

# Аутентификация
AUTH_SECRET="сгенерировать: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"  # или https://dofoul.site на проде

# Хранилище файлов (MinIO локально / Cloudflare R2 на проде)
MINIO_ENDPOINT="http://minio:9000"
MINIO_PUBLIC_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="praktik"

# Только для локального Docker
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"
```

---

## Локальный запуск

### Требования
- Docker и Docker Compose
- Node.js 20+

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/dofoul/practice-sys.git
cd practice-sys

# 2. Скопировать переменные окружения
cp .env.example .env
# Отредактировать .env при необходимости

# 3. Запустить все сервисы
docker compose up -d

# 4. Накатить миграции
npm run db:migrate

# 5. Заполнить тестовыми данными
npm run db:seed
```

Приложение: http://localhost:3000
MinIO Console: http://localhost:9001

### Тестовые аккаунты после seed

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@praktik.ru | admin123 |
| Куратор | curator@praktik.ru | curator123 |
| Студент | student@praktik.ru | student123 |
| Компания | company@praktik.ru | company123 |

---

## Деплой на Vercel

Проект настроен для автоматического деплоя через Vercel.

### Используемые сервисы
- **Vercel** — хостинг Next.js приложения
- **Neon** — serverless PostgreSQL база данных
- **Cloudflare R2** — S3-совместимое файловое хранилище

### Конфигурация (`vercel.json`)
```json
{
  "framework": "nextjs",
  "buildCommand": "prisma migrate deploy && next build",
  "regions": ["fra1"]
}
```

### Процесс деплоя
1. Пуш в ветку `feature/vercel-deploy`
2. GitHub Actions запускает CI (type check + lint)
3. Vercel автоматически запускает:
   - `npm install` + `prisma generate` (postinstall)
   - `prisma migrate deploy` — применяет миграции к Neon
   - `next build` — сборка приложения
4. Готовый билд деплоится на `dofoul.site`

### Переменные окружения на Vercel
Обязательные переменные в настройках проекта Vercel:
- `DATABASE_URL` — строка подключения Neon (с pooler)
- `AUTH_SECRET` — секрет для JWT
- `AUTH_URL` — публичный URL (`https://dofoul.site`)

Опциональные (для работы хранилища файлов):
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`

---

## CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

Запускается автоматически при каждом пуше в ветки `feature/vercel-deploy`, `dev-1`, `main`.

**Шаги:**
1. Checkout кода
2. Установка Node.js 20
3. `npm ci` — установка зависимостей
4. `prisma generate` — генерация Prisma Client
5. `tsc --noEmit` — проверка TypeScript
6. `next lint` — проверка ESLint

### Branch Protection

Ветка `feature/vercel-deploy` защищена правилом:
- Проверка `Type check & Lint` должна пройти перед мёржем
- Force push заблокирован
- Удаление ветки заблокировано

### Структура веток

| Ветка | Назначение |
|-------|-----------|
| `dev-1` | Основная ветка разработки |
| `feature/vercel-deploy` | Production-ветка → автодеплой на dofoul.site |
| `feature/company-dashboard-v2` | Расширенный дашборд компаний |
| `feature/new-features-and-company-role` | Роль компании и уведомления |
| `feature/react18-antd-compat` | Совместимость React 18 + Ant Design 5 |
| `feature/high-priority` | Срочные исправления |
| `fix/ui-and-minio-paths` | Исправления UI и путей хранилища |
