import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const curatorHash = await bcrypt.hash("curator123", 10);
  const studentHash = await bcrypt.hash("student123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@praktik.ru" },
    update: {},
    create: { email: "admin@praktik.ru", passwordHash: adminHash, fullName: "Администратор Системы", role: "admin" },
  });

  const curatorUser = await prisma.user.upsert({
    where: { email: "curator@praktik.ru" },
    update: {},
    create: { email: "curator@praktik.ru", passwordHash: curatorHash, fullName: "Иванов Иван Иванович", role: "curator" },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@praktik.ru" },
    update: {},
    create: { email: "student@praktik.ru", passwordHash: studentHash, fullName: "Петров Пётр Петрович", role: "student" },
  });

  await prisma.practiceType.createMany({
    skipDuplicates: true,
    data: [
      { code: "educational", name: "Учебная практика" },
      { code: "industrial", name: "Производственная практика" },
      { code: "pre_diploma", name: "Преддипломная практика" },
    ],
  });

  await prisma.documentType.createMany({
    skipDuplicates: true,
    data: [
      { code: "contract", name: "Договор", isRequired: true },
      { code: "referral", name: "Направление", isRequired: true },
      { code: "diary", name: "Дневник практики", isRequired: true },
      { code: "report", name: "Отчёт о практике", isRequired: true },
      { code: "reference", name: "Характеристика с места практики", isRequired: false },
      { code: "attestation", name: "Аттестационный лист", isRequired: true },
    ],
  });

  const institution = await prisma.institution.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Технический колледж информационных технологий", shortName: "ТКИТ" },
  });

  const specialty = await prisma.specialty.upsert({
    where: { id: 1 },
    update: {},
    create: { institutionId: institution.id, code: "09.02.07", name: "Информационные системы и программирование" },
  });

  const group = await prisma.group.upsert({
    where: { id: 1 },
    update: {},
    create: { specialtyId: specialty.id, name: "ИСП-31", course: 3, enrollmentYear: 2023 },
  });

  const curator = await prisma.curator.upsert({
    where: { userId: curatorUser.id },
    update: {},
    create: { userId: curatorUser.id, position: "Преподаватель информатики", department: "Кафедра информационных технологий" },
  });

  await prisma.groupCurator.upsert({
    where: { groupId_curatorId: { groupId: group.id, curatorId: curator.id } },
    update: {},
    create: { groupId: group.id, curatorId: curator.id },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, groupId: group.id, recordBookNo: "2024-001" },
  });

  // --- 4 предприятия ---
  const company1 = await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'ООО "Технологии Будущего"',
      inn: "7712345678",
      address: "г. Москва, ул. Ленина, д. 1",
      contactPerson: "Сидоров Сергей Сергеевич",
      contactPhone: "+7 (495) 123-45-67",
    },
  });

  const company2 = await prisma.company.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'АО "ИТ-Решения"',
      inn: "7734567890",
      address: "г. Москва, Проспект Мира, д. 45",
      contactPerson: "Козлова Марина Владимировна",
      contactPhone: "+7 (495) 987-65-43",
    },
  });

  const company3 = await prisma.company.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'ПАО "ЦифраСофт"',
      inn: "7756789012",
      address: "г. Санкт-Петербург, Невский проспект, д. 100",
      contactPerson: "Новиков Алексей Борисович",
      contactPhone: "+7 (812) 456-78-90",
    },
  });

  const company4 = await prisma.company.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'ООО "ДатаБридж"',
      inn: "7778901234",
      address: "г. Казань, ул. Кремлёвская, д. 35",
      contactPerson: "Захарова Ольга Петровна",
      contactPhone: "+7 (843) 234-56-78",
    },
  });

  const period = await prisma.practicePeriod.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Производственная практика, лето 2026",
      dateStart: new Date("2026-06-01"),
      dateEnd: new Date("2026-07-31"),
      isOpen: true,
    },
  });

  const periodEdu = await prisma.practicePeriod.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Учебная практика, осень 2026",
      dateStart: new Date("2026-09-01"),
      dateEnd: new Date("2026-09-30"),
      isOpen: true,
    },
  });

  const industrial = await prisma.practiceType.findFirst({ where: { code: "industrial" } });
  const educational = await prisma.practiceType.findFirst({ where: { code: "educational" } });
  const preDiploma = await prisma.practiceType.findFirst({ where: { code: "pre_diploma" } });

  if (industrial && educational && preDiploma) {
    await prisma.practiceOffer.upsert({
      where: { id: 1 },
      update: {},
      create: {
        companyId: company1.id,
        practiceTypeId: industrial.id,
        periodId: period.id,
        title: "Разработчик веб-приложений",
        description: "Стажировка в отделе веб-разработки. Работа с React, Node.js, TypeScript. Наставник закреплён за каждым стажёром. Возможен перевод в штат после практики.",
        slotsTotal: 5, slotsTaken: 2, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 2 },
      update: {},
      create: {
        companyId: company1.id,
        practiceTypeId: preDiploma.id,
        periodId: period.id,
        title: "Разработка мобильного приложения",
        description: "Участие в разработке кросс-платформенного мобильного приложения на Flutter. Работа с REST API, Firebase.",
        slotsTotal: 3, slotsTaken: 0, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 3 },
      update: {},
      create: {
        companyId: company2.id,
        practiceTypeId: industrial.id,
        periodId: period.id,
        title: "Аналитик данных",
        description: "Работа с большими данными: сбор, очистка, анализ, визуализация. Стек: Python, pandas, Power BI. Выдаётся корпоративный ноутбук.",
        slotsTotal: 4, slotsTaken: 1, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 4 },
      update: {},
      create: {
        companyId: company2.id,
        practiceTypeId: educational.id,
        periodId: periodEdu.id,
        title: "Администратор баз данных",
        description: "Знакомство с администрированием PostgreSQL и Microsoft SQL Server. Резервное копирование, мониторинг, оптимизация запросов.",
        slotsTotal: 2, slotsTaken: 0, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 5 },
      update: {},
      create: {
        companyId: company3.id,
        practiceTypeId: industrial.id,
        periodId: period.id,
        title: "DevOps-инженер",
        description: "Настройка CI/CD пайплайнов, работа с Docker, Kubernetes, GitLab CI. Участие в реальных проектах команды инфраструктуры.",
        slotsTotal: 3, slotsTaken: 3, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 6 },
      update: {},
      create: {
        companyId: company3.id,
        practiceTypeId: preDiploma.id,
        periodId: period.id,
        title: "Тестировщик ПО (QA)",
        description: "Ручное и автоматизированное тестирование. Работа с Selenium, Postman. Составление тест-кейсов и баг-репортов.",
        slotsTotal: 6, slotsTaken: 2, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 7 },
      update: {},
      create: {
        companyId: company4.id,
        practiceTypeId: industrial.id,
        periodId: period.id,
        title: "Специалист по информационной безопасности",
        description: "Аудит безопасности, работа с SIEM-системами, анализ уязвимостей. Наставник — сертифицированный специалист CISSP.",
        slotsTotal: 2, slotsTaken: 0, createdBy: admin.id, isPublished: true,
      },
    });

    await prisma.practiceOffer.upsert({
      where: { id: 8 },
      update: {},
      create: {
        companyId: company4.id,
        practiceTypeId: educational.id,
        periodId: periodEdu.id,
        title: "Системный аналитик",
        description: "Участие в сборе и формализации требований, создание UML-диаграмм, работа с командой разработки. Офис в центре Казани.",
        slotsTotal: 4, slotsTaken: 1, createdBy: admin.id, isPublished: true,
      },
    });
  }

  console.log("✅ Seed выполнен успешно");
  console.log("   Логины:");
  console.log("   admin@praktik.ru    / admin123");
  console.log("   curator@praktik.ru  / curator123");
  console.log("   student@praktik.ru  / student123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
