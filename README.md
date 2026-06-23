# Система учёта практик

Веб-платформа для организации, учёта и контроля прохождения производственной практики студентов.

## Стек

- **Frontend/Backend** — Next.js 15 (App Router)
- **БД** — PostgreSQL + Prisma ORM
- **Авторизация** — NextAuth v5 (JWT)
- **UI** — Ant Design 5
- **Хранилище** — S3-совместимое (MinIO локально / Cloudflare R2 на проде)
- **Хостинг** — Vercel + Neon (serverless PostgreSQL)

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| `admin` | Управление пользователями, группами, периодами практик |
| `curator` | Просмотр и проверка практик своих групп, выставление оценок |
| `student` | Подача на практику, загрузка документов, ведение дневника |
| `company` | Публикация вакансий, просмотр откликов студентов |

## Демо-доступ

Сайт: [dofoul.site](https://dofoul.site)

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@praktik.ru | admin123 |
| Куратор | curator@praktik.ru | curator123 |
| Студент | student@praktik.ru | student123 |

## Ветки

| Ветка | Назначение |
|-------|------------|
| `dev-1` | Основная ветка разработки. Сюда попадают все стабильные изменения после проверки. |
| `feature/vercel-deploy` | Production-ветка. Каждый пуш сюда автоматически деплоится на [dofoul.site](https://dofoul.site) через Vercel. |
| `feature/company-dashboard-v2` | Расширенный дашборд для компаний: аналитика, управление вакансиями, просмотр откликов. |
| `feature/new-features-and-company-role` | Добавление роли компании, системы уведомлений и отзывов на практику. |
| `feature/react18-antd-compat` | Фикс совместимости React 18 с Ant Design 5 (патч для SSR). |
| `feature/high-priority` | Критические исправления и срочные задачи вне основного цикла разработки. |
| `fix/ui-and-minio-paths` | Исправления UI-компонентов и путей хранилища MinIO. |

## CI/CD

- **CI** — GitHub Actions: type check (`tsc`) + lint (`eslint`) на каждый пуш
- **CD** — Vercel: автодеплой при пуше в `feature/vercel-deploy`
- Миграции БД применяются автоматически при деплое (`prisma migrate deploy`)

## Локальный запуск

```bash
# Запуск через Docker (БД + MinIO + приложение)
docker compose up -d

# Накатить миграции и заполнить БД
npm run db:migrate
npm run db:seed
```

Приложение будет доступно на [http://localhost:3000](http://localhost:3000)
