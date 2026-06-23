import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash    = await bcrypt.hash("admin123",    10);
  const curatorHash  = await bcrypt.hash("curator123",  10);
  const studentHash  = await bcrypt.hash("student123",  10);

  // ─── Справочники ──────────────────────────────────────────────────────────
  await prisma.practiceType.createMany({
    skipDuplicates: true,
    data: [
      { code: "educational", name: "Учебная практика" },
      { code: "industrial",  name: "Производственная практика" },
      { code: "pre_diploma", name: "Преддипломная практика" },
    ],
  });

  await prisma.documentType.createMany({
    skipDuplicates: true,
    data: [
      { code: "contract",    name: "Договор",                          isRequired: true  },
      { code: "referral",    name: "Направление",                      isRequired: true  },
      { code: "diary",       name: "Дневник практики",                 isRequired: true  },
      { code: "report",      name: "Отчёт о практике",                 isRequired: true  },
      { code: "reference",   name: "Характеристика с места практики",  isRequired: false },
      { code: "attestation", name: "Аттестационный лист",              isRequired: true  },
    ],
  });

  // ─── Учебное заведение ────────────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where:  { id: 1 },
    update: {},
    create: { name: "Технический колледж информационных технологий", shortName: "ТКИТ" },
  });

  // ─── Специальности ────────────────────────────────────────────────────────
  const specISP = await prisma.specialty.upsert({
    where:  { id: 1 },
    update: {},
    create: { institutionId: institution.id, code: "09.02.07", name: "Информационные системы и программирование" },
  });

  const specSA = await prisma.specialty.upsert({
    where:  { id: 2 },
    update: {},
    create: { institutionId: institution.id, code: "09.02.06", name: "Сетевое и системное администрирование" },
  });

  // ─── Группы ───────────────────────────────────────────────────────────────
  //   ИСП (09.02.07)
  const gISP31 = await prisma.group.upsert({
    where:  { id: 1 },
    update: { name: "ИСП-31", course: 3, enrollmentYear: 2023 },
    create: { specialtyId: specISP.id, name: "ИСП-31", course: 3, enrollmentYear: 2023 },
  });

  const gISP21 = await prisma.group.upsert({
    where:  { id: 2 },
    update: {},
    create: { specialtyId: specISP.id, name: "ИСП-21", course: 2, enrollmentYear: 2024 },
  });

  const gISP11 = await prisma.group.upsert({
    where:  { id: 3 },
    update: {},
    create: { specialtyId: specISP.id, name: "ИСП-11", course: 1, enrollmentYear: 2025 },
  });

  //   СА (09.02.06)
  const gSA31 = await prisma.group.upsert({
    where:  { id: 4 },
    update: {},
    create: { specialtyId: specSA.id, name: "СА-31", course: 3, enrollmentYear: 2023 },
  });

  const gSA21 = await prisma.group.upsert({
    where:  { id: 5 },
    update: {},
    create: { specialtyId: specSA.id, name: "СА-21", course: 2, enrollmentYear: 2024 },
  });

  // ─── Администратор ────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where:  { email: "admin@praktik.ru" },
    update: {},
    create: { email: "admin@praktik.ru", passwordHash: adminHash, fullName: "Администратор Системы", role: "admin" },
  });

  // ─── Кураторы ─────────────────────────────────────────────────────────────
  const mkCurator = async (
    email: string,
    fullName: string,
    position: string,
    department: string,
  ) => {
    const u = await prisma.user.upsert({
      where:  { email },
      update: { fullName },
      create: { email, passwordHash: curatorHash, fullName, role: "curator" },
    });
    const c = await prisma.curator.upsert({
      where:  { userId: u.id },
      update: { position, department },
      create: { userId: u.id, position, department },
    });
    return c;
  };

  // curator@praktik.ru — «системный» логин куратора для демо
  const cur1 = await mkCurator(
    "curator@praktik.ru",
    "Иванов Иван Иванович",
    "Преподаватель информатики",
    "Кафедра информационных технологий",
  );

  const cur2 = await mkCurator(
    "smirnova@praktik.ru",
    "Смирнова Елена Александровна",
    "Преподаватель программирования",
    "Кафедра информационных технологий",
  );

  const cur3 = await mkCurator(
    "petrov.d@praktik.ru",
    "Петров Дмитрий Сергеевич",
    "Старший преподаватель",
    "Кафедра информационных технологий",
  );

  const cur4 = await mkCurator(
    "kozlovskaya@praktik.ru",
    "Козловская Наталья Викторовна",
    "Преподаватель сетевых технологий",
    "Кафедра сетевых и системных технологий",
  );

  // ─── Привязка кураторов к группам ─────────────────────────────────────────
  //  Иванов    → ИСП-31, СА-21
  //  Смирнова  → ИСП-21
  //  Петров Д. → ИСП-11
  //  Козловская → СА-31, СА-21 (совместно с Ивановым)
  const assignCurator = async (groupId: number, curatorId: number) =>
    prisma.groupCurator.upsert({
      where:  { groupId_curatorId: { groupId, curatorId } },
      update: {},
      create: { groupId, curatorId },
    });

  await assignCurator(gISP31.id, cur1.id);
  await assignCurator(gISP21.id, cur2.id);
  await assignCurator(gISP11.id, cur3.id);
  await assignCurator(gSA31.id,  cur4.id);
  await assignCurator(gSA21.id,  cur1.id);
  await assignCurator(gSA21.id,  cur4.id);

  // ─── Студенты ─────────────────────────────────────────────────────────────
  const mkStudent = async (
    email: string,
    fullName: string,
    groupId: number,
    recordBookNo: string,
  ) => {
    const u = await prisma.user.upsert({
      where:  { email },
      update: { fullName },
      create: { email, passwordHash: studentHash, fullName, role: "student" },
    });
    await prisma.student.upsert({
      where:  { userId: u.id },
      update: { groupId, recordBookNo },
      create: { userId: u.id, groupId, recordBookNo },
    });
    return u;
  };

  // ИСП-31 (7 студентов)
  await mkStudent("student@praktik.ru",      "Петров Пётр Петрович",          gISP31.id, "2023-001");
  await mkStudent("alekseev.m@praktik.ru",   "Алексеев Михаил Олегович",      gISP31.id, "2023-002");
  await mkStudent("voronova.a@praktik.ru",   "Воронова Анастасия Сергеевна",  gISP31.id, "2023-003");
  await mkStudent("gromov.d@praktik.ru",     "Громов Дмитрий Андреевич",      gISP31.id, "2023-004");
  await mkStudent("davydova.y@praktik.ru",   "Давыдова Юлия Николаевна",      gISP31.id, "2023-005");
  await mkStudent("ershov.a@praktik.ru",     "Ершов Артём Владимирович",      gISP31.id, "2023-006");
  await mkStudent("zaitseva.v@praktik.ru",   "Зайцева Виктория Игоревна",     gISP31.id, "2023-007");

  // ИСП-21 (6 студентов)
  await mkStudent("kuznetsov.i@praktik.ru",  "Кузнецов Илья Романович",       gISP21.id, "2024-001");
  await mkStudent("lebedeva.p@praktik.ru",   "Лебедева Полина Дмитриевна",    gISP21.id, "2024-002");
  await mkStudent("morozov.p@praktik.ru",    "Морозов Павел Алексеевич",      gISP21.id, "2024-003");
  await mkStudent("nikitina.d@praktik.ru",   "Никитина Дарья Евгеньевна",     gISP21.id, "2024-004");
  await mkStudent("orlov.a@praktik.ru",      "Орлов Антон Сергеевич",         gISP21.id, "2024-005");
  await mkStudent("popova.e@praktik.ru",     "Попова Екатерина Владимировна", gISP21.id, "2024-006");

  // ИСП-11 (5 студентов)
  await mkStudent("romanov.d@praktik.ru",    "Романов Денис Игоревич",        gISP11.id, "2025-001");
  await mkStudent("sorokina.a@praktik.ru",   "Сорокина Алина Михайловна",     gISP11.id, "2025-002");
  await mkStudent("tarasov.v@praktik.ru",    "Тарасов Вадим Олегович",        gISP11.id, "2025-003");
  await mkStudent("ulyanova.m@praktik.ru",   "Ульянова Мария Андреевна",      gISP11.id, "2025-004");
  await mkStudent("fedorov.k@praktik.ru",    "Фёдоров Кирилл Николаевич",     gISP11.id, "2025-005");

  // СА-31 (5 студентов)
  await mkStudent("kharitonov.e@praktik.ru", "Харитонов Егор Вадимович",      gSA31.id,  "2023-101");
  await mkStudent("tsvetkova.k@praktik.ru",  "Цветкова Ксения Романовна",     gSA31.id,  "2023-102");
  await mkStudent("chernov.a@praktik.ru",    "Чернов Александр Петрович",     gSA31.id,  "2023-103");
  await mkStudent("shilova.n@praktik.ru",    "Шилова Надежда Сергеевна",      gSA31.id,  "2023-104");
  await mkStudent("shcherbakov.m@praktik.ru","Щербаков Максим Андреевич",     gSA31.id,  "2023-105");

  // СА-21 (4 студента)
  await mkStudent("abramov.s@praktik.ru",    "Абрамов Степан Викторович",     gSA21.id,  "2024-101");
  await mkStudent("belova.k@praktik.ru",     "Белова Карина Дмитриевна",      gSA21.id,  "2024-102");
  await mkStudent("vlasov.n@praktik.ru",     "Власов Никита Олегович",        gSA21.id,  "2024-103");
  await mkStudent("golubeva.a@praktik.ru",   "Голубева Алина Сергеевна",      gSA21.id,  "2024-104");

  // ─── Пользователи компаний ────────────────────────────────────────────────
  const companyHash = await bcrypt.hash("company123", 10);

  const companyUser1 = await prisma.user.upsert({
    where:  { email: "company@praktik.ru" },
    update: {},
    create: { email: "company@praktik.ru", passwordHash: companyHash, fullName: "Сидоров Сергей Сергеевич", role: "company" },
  });
  const companyUser2 = await prisma.user.upsert({
    where:  { email: "it-solutions@praktik.ru" },
    update: {},
    create: { email: "it-solutions@praktik.ru", passwordHash: companyHash, fullName: "Козлова Марина Владимировна", role: "company" },
  });

  // ─── Предприятия ──────────────────────────────────────────────────────────
  const company1 = await prisma.company.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      name: 'ООО "Технологии Будущего"', inn: "7712345678",
      address: "г. Москва, ул. Ленина, д. 1",
      contactPerson: "Сидоров Сергей Сергеевич", contactPhone: "+7 (495) 123-45-67",
      ownerUserId: companyUser1.id,
    },
  });

  const company2 = await prisma.company.upsert({
    where:  { id: 2 },
    update: {},
    create: {
      name: 'АО "ИТ-Решения"', inn: "7734567890",
      address: "г. Москва, Проспект Мира, д. 45",
      contactPerson: "Козлова Марина Владимировна", contactPhone: "+7 (495) 987-65-43",
      ownerUserId: companyUser2.id,
    },
  });

  const company3 = await prisma.company.upsert({
    where:  { id: 3 },
    update: {},
    create: {
      name: 'ПАО "ЦифраСофт"', inn: "7756789012",
      address: "г. Санкт-Петербург, Невский проспект, д. 100",
      contactPerson: "Новиков Алексей Борисович", contactPhone: "+7 (812) 456-78-90",
    },
  });

  const company4 = await prisma.company.upsert({
    where:  { id: 4 },
    update: {},
    create: {
      name: 'ООО "ДатаБридж"', inn: "7778901234",
      address: "г. Казань, ул. Кремлёвская, д. 35",
      contactPerson: "Захарова Ольга Петровна", contactPhone: "+7 (843) 234-56-78",
    },
  });

  // ─── Периоды практик ──────────────────────────────────────────────────────
  const period = await prisma.practicePeriod.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      name: "Производственная практика, лето 2026",
      dateStart: new Date("2026-06-01"), dateEnd: new Date("2026-07-31"), isOpen: true,
    },
  });

  const periodEdu = await prisma.practicePeriod.upsert({
    where:  { id: 2 },
    update: {},
    create: {
      name: "Учебная практика, осень 2026",
      dateStart: new Date("2026-09-01"), dateEnd: new Date("2026-09-30"), isOpen: true,
    },
  });

  // ─── Вакансии ─────────────────────────────────────────────────────────────
  const industrial  = await prisma.practiceType.findFirst({ where: { code: "industrial"  } });
  const educational = await prisma.practiceType.findFirst({ where: { code: "educational" } });
  const preDiploma  = await prisma.practiceType.findFirst({ where: { code: "pre_diploma" } });

  if (industrial && educational && preDiploma) {
    const offers = [
      {
        id: 1, companyId: company1.id, practiceTypeId: industrial.id, periodId: period.id,
        title: "Разработчик веб-приложений",
        description: "Стажировка в отделе веб-разработки. Работа с React, Node.js, TypeScript. Наставник закреплён за каждым стажёром. Возможен перевод в штат после практики.",
        slotsTotal: 5, slotsTaken: 2,
      },
      {
        id: 2, companyId: company1.id, practiceTypeId: preDiploma.id, periodId: period.id,
        title: "Разработка мобильного приложения",
        description: "Участие в разработке кросс-платформенного мобильного приложения на Flutter. Работа с REST API, Firebase.",
        slotsTotal: 3, slotsTaken: 0,
      },
      {
        id: 3, companyId: company2.id, practiceTypeId: industrial.id, periodId: period.id,
        title: "Аналитик данных",
        description: "Работа с большими данными: сбор, очистка, анализ, визуализация. Стек: Python, pandas, Power BI. Выдаётся корпоративный ноутбук.",
        slotsTotal: 4, slotsTaken: 1,
      },
      {
        id: 4, companyId: company2.id, practiceTypeId: educational.id, periodId: periodEdu.id,
        title: "Администратор баз данных",
        description: "Знакомство с администрированием PostgreSQL и Microsoft SQL Server. Резервное копирование, мониторинг, оптимизация запросов.",
        slotsTotal: 2, slotsTaken: 0,
      },
      {
        id: 5, companyId: company3.id, practiceTypeId: industrial.id, periodId: period.id,
        title: "DevOps-инженер",
        description: "Настройка CI/CD пайплайнов, работа с Docker, Kubernetes, GitLab CI. Участие в реальных проектах команды инфраструктуры.",
        slotsTotal: 3, slotsTaken: 3,
      },
      {
        id: 6, companyId: company3.id, practiceTypeId: preDiploma.id, periodId: period.id,
        title: "Тестировщик ПО (QA)",
        description: "Ручное и автоматизированное тестирование. Работа с Selenium, Postman. Составление тест-кейсов и баг-репортов.",
        slotsTotal: 6, slotsTaken: 2,
      },
      {
        id: 7, companyId: company4.id, practiceTypeId: industrial.id, periodId: period.id,
        title: "Специалист по информационной безопасности",
        description: "Аудит безопасности, работа с SIEM-системами, анализ уязвимостей. Наставник — сертифицированный специалист CISSP.",
        slotsTotal: 2, slotsTaken: 0,
      },
      {
        id: 8, companyId: company4.id, practiceTypeId: educational.id, periodId: periodEdu.id,
        title: "Системный аналитик",
        description: "Участие в сборе и формализации требований, создание UML-диаграмм, работа с командой разработки. Офис в центре Казани.",
        slotsTotal: 4, slotsTaken: 1,
      },
    ];

    for (const o of offers) {
      await prisma.practiceOffer.upsert({
        where:  { id: o.id },
        update: {},
        create: { ...o, createdBy: admin.id, isPublished: true },
      });
    }
  }

  console.log("✅ Seed выполнен успешно");
  console.log("");
  console.log("  Логины (пароль curator123 / student123):");
  console.log("  admin@praktik.ru           / admin123");
  console.log("  curator@praktik.ru         / curator123  — Иванов И.И.     (ИСП-31, СА-21)");
  console.log("  smirnova@praktik.ru        / curator123  — Смирнова Е.А.   (ИСП-21)");
  console.log("  petrov.d@praktik.ru        / curator123  — Петров Д.С.     (ИСП-11)");
  console.log("  kozlovskaya@praktik.ru     / curator123  — Козловская Н.В. (СА-31, СА-21)");
  console.log("");
  console.log("  company@praktik.ru         / company123  — ООО «Технологии Будущего»");
  console.log("  it-solutions@praktik.ru    / company123  — АО «ИТ-Решения»");
  console.log("");
  console.log("  student@praktik.ru         / student123  — Петров П.П.     (ИСП-31)");
  console.log("  alekseev.m@praktik.ru      / student123  — Алексеев М.О.   (ИСП-31)");
  console.log("  kuznetsov.i@praktik.ru     / student123  — Кузнецов И.Р.   (ИСП-21)");
  console.log("  romanov.d@praktik.ru       / student123  — Романов Д.И.    (ИСП-11)");
  console.log("  kharitonov.e@praktik.ru    / student123  — Харитонов Е.В.  (СА-31)");
  console.log("  abramov.s@praktik.ru       / student123  — Абрамов С.В.    (СА-21)");
  console.log("  ... и ещё 21 студент");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
