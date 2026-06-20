/**
 * Дополнительные тестовые данные:
 * - 3 новых специальности + группы (Экономика, Юриспруденция, Менеджмент)
 * - 3 новых куратора
 * - 11 новых студентов (3+3+3 по группам + 2 ИТ)
 * - 5 новых компаний (не-ИТ)
 * - 11 новых предложений (Экономика, Юриспруденция, Менеджмент, Маркетинг, + 2 ИТ)
 * - 11 практик с разными статусами
 * - 4 отзыва о местах практики
 */
import { PrismaClient, PracticeStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const STUDENT_PW = "student123";
const CURATOR_PW = "curator123";

function past(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

async function main() {
  const [sh, ch] = await Promise.all([
    bcrypt.hash(STUDENT_PW, 10),
    bcrypt.hash(CURATOR_PW, 10),
  ]);

  // ── Типы практик и периоды (должны существовать из основного seed) ──────────
  const [industrial, educational, preDiploma, period1, period2] = await Promise.all([
    prisma.practiceType.findFirstOrThrow({ where: { code: "industrial" } }),
    prisma.practiceType.findFirstOrThrow({ where: { code: "educational" } }),
    prisma.practiceType.findFirstOrThrow({ where: { code: "pre_diploma" } }),
    prisma.practicePeriod.findFirstOrThrow({ where: { id: 1 } }),
    prisma.practicePeriod.findFirstOrThrow({ where: { id: 2 } }),
  ]);

  const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });

  // ── Специальности ─────────────────────────────────────────────────────────
  const specEcon = await prisma.specialty.upsert({
    where: { id: 2 }, update: {},
    create: { institutionId: 1, code: "38.02.01", name: "Экономика и бухгалтерский учёт" },
  });
  const specLaw = await prisma.specialty.upsert({
    where: { id: 3 }, update: {},
    create: { institutionId: 1, code: "40.02.01", name: "Право и организация социального обеспечения" },
  });
  const specMgmt = await prisma.specialty.upsert({
    where: { id: 4 }, update: {},
    create: { institutionId: 1, code: "38.02.07", name: "Банковское дело и менеджмент" },
  });

  // ── Группы ────────────────────────────────────────────────────────────────
  const groupEkon = await prisma.group.upsert({
    where: { id: 2 }, update: {},
    create: { specialtyId: specEcon.id, name: "ЭК-21", course: 2, enrollmentYear: 2024 },
  });
  const groupLaw = await prisma.group.upsert({
    where: { id: 3 }, update: {},
    create: { specialtyId: specLaw.id, name: "ЮР-31", course: 3, enrollmentYear: 2023 },
  });
  const groupMgmt = await prisma.group.upsert({
    where: { id: 4 }, update: {},
    create: { specialtyId: specMgmt.id, name: "МНЖ-21", course: 2, enrollmentYear: 2024 },
  });

  // ── Кураторы ──────────────────────────────────────────────────────────────
  const [cu2u, cu3u, cu4u] = await Promise.all([
    prisma.user.upsert({ where: { email: "curator2@praktik.ru" }, update: {},
      create: { email: "curator2@praktik.ru", passwordHash: ch, fullName: "Петрова Анна Сергеевна", role: "curator" } }),
    prisma.user.upsert({ where: { email: "curator3@praktik.ru" }, update: {},
      create: { email: "curator3@praktik.ru", passwordHash: ch, fullName: "Смирнов Дмитрий Владимирович", role: "curator" } }),
    prisma.user.upsert({ where: { email: "curator4@praktik.ru" }, update: {},
      create: { email: "curator4@praktik.ru", passwordHash: ch, fullName: "Николаева Светлана Борисовна", role: "curator" } }),
  ]);

  const [cur2, cur3, cur4] = await Promise.all([
    prisma.curator.upsert({ where: { userId: cu2u.id }, update: {},
      create: { userId: cu2u.id, position: "Преподаватель экономики", department: "Кафедра экономики" } }),
    prisma.curator.upsert({ where: { userId: cu3u.id }, update: {},
      create: { userId: cu3u.id, position: "Преподаватель правовых дисциплин", department: "Кафедра юриспруденции" } }),
    prisma.curator.upsert({ where: { userId: cu4u.id }, update: {},
      create: { userId: cu4u.id, position: "Преподаватель менеджмента", department: "Кафедра управления" } }),
  ]);

  for (const [gid, cid] of [[groupEkon.id, cur2.id], [groupLaw.id, cur3.id], [groupMgmt.id, cur4.id]] as [number, number][]) {
    await prisma.groupCurator.upsert({
      where: { groupId_curatorId: { groupId: gid, curatorId: cid } },
      update: {}, create: { groupId: gid, curatorId: cid },
    });
  }

  // ── Студенты ──────────────────────────────────────────────────────────────
  const studentData: [string, string, string, number, string][] = [
    // email, fullName, recordBookNo, groupId
    ["student2@praktik.ru",  "Миронова Алина Андреевна",      "2024-EK-001", groupEkon.id, sh],
    ["student3@praktik.ru",  "Власов Кирилл Станиславович",   "2024-EK-002", groupEkon.id, sh],
    ["student4@praktik.ru",  "Орлова Дарья Максимовна",       "2024-EK-003", groupEkon.id, sh],
    ["student5@praktik.ru",  "Герасимов Артём Игоревич",      "2023-YR-001", groupLaw.id,  sh],
    ["student6@praktik.ru",  "Воробьёва Наталья Сергеевна",   "2023-YR-002", groupLaw.id,  sh],
    ["student7@praktik.ru",  "Зайцев Максим Дмитриевич",      "2023-YR-003", groupLaw.id,  sh],
    ["student8@praktik.ru",  "Лебедева Татьяна Олеговна",     "2024-MN-001", groupMgmt.id, sh],
    ["student9@praktik.ru",  "Куликов Евгений Павлович",      "2024-MN-002", groupMgmt.id, sh],
    ["student10@praktik.ru", "Морозова Ирина Викторовна",     "2024-MN-003", groupMgmt.id, sh],
    ["student11@praktik.ru", "Сорокин Антон Алексеевич",      "2023-IT-002", 1,            sh], // ИСП-31
    ["student12@praktik.ru", "Белова Юлия Николаевна",        "2023-IT-003", 1,            sh], // ИСП-31
  ];

  const studentById: Record<string, number> = {};
  for (const [email, fullName, recordBookNo, groupId, pwHash] of studentData) {
    const u = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, passwordHash: pwHash, fullName, role: "student" },
    });
    const s = await prisma.student.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, groupId, recordBookNo },
    });
    studentById[email] = s.id;
  }

  // ── Компании ──────────────────────────────────────────────────────────────
  const [sber, lexPravo, konsalt, minfin, mediaProf] = await Promise.all([
    prisma.company.upsert({ where: { id: 5 }, update: {},
      create: { name: 'ПАО "Сбербанк России"', inn: "7707083893",
        address: "г. Москва, ул. Вавилова, д. 19",
        contactPerson: "Соколова Екатерина Игоревна", contactPhone: "+7 (495) 500-55-50" } }),
    prisma.company.upsert({ where: { id: 6 }, update: {},
      create: { name: 'ООО "ЛексПраво"', inn: "7702891234",
        address: "г. Москва, Садовая-Кудринская, д. 11",
        contactPerson: "Громов Илья Вячеславович", contactPhone: "+7 (495) 321-76-54" } }),
    prisma.company.upsert({ where: { id: 7 }, update: {},
      create: { name: 'ООО "КонсалтПлюс"', inn: "7715345678",
        address: "г. Москва, Тверской бульвар, д. 5",
        contactPerson: "Фёдорова Анастасия Петровна", contactPhone: "+7 (495) 456-90-12" } }),
    prisma.company.upsert({ where: { id: 8 }, update: {},
      create: { name: "Министерство финансов Московской области", inn: "5024076571",
        address: "г. Красногорск, бульвар Строителей, д. 1",
        contactPerson: "Громова Людмила Анатольевна", contactPhone: "+7 (498) 602-02-00" } }),
    prisma.company.upsert({ where: { id: 9 }, update: {},
      create: { name: 'ООО "МедиаПроф"', inn: "7728456789",
        address: "г. Москва, ул. Мясницкая, д. 22",
        contactPerson: "Исаева Вероника Романовна", contactPhone: "+7 (495) 678-23-45" } }),
  ]);

  // ── Направление IT для существующих предложений ───────────────────────────
  await prisma.practiceOffer.updateMany({
    where: { id: { in: [1, 2, 3, 4, 5, 6, 7, 8] }, direction: null },
    data: { direction: "IT" },
  });

  // ── Новые предложения ─────────────────────────────────────────────────────
  type OfferInput = {
    id: number; companyId: number; practiceTypeId: number; periodId: number;
    title: string; description: string; direction: string;
    slotsTotal: number; slotsTaken: number;
  };

  const offersData: OfferInput[] = [
    { id: 9,  companyId: sber.id,      practiceTypeId: industrial.id,  periodId: period1.id,
      title: "Специалист финансового отдела",
      description: "Участие в финансовом анализе, работа с корпоративными системами. Обучение основам банковского учёта и отчётности. Официальная стажировка со справкой.",
      direction: "Экономика", slotsTotal: 4, slotsTaken: 1 },
    { id: 10, companyId: sber.id,      practiceTypeId: preDiploma.id,  periodId: period1.id,
      title: "Кредитный аналитик (стажёр)",
      description: "Анализ кредитных заявок, работа с базами данных клиентов. Изучение методик оценки кредитоспособности физических и юридических лиц.",
      direction: "Экономика", slotsTotal: 3, slotsTaken: 1 },
    { id: 11, companyId: lexPravo.id,  practiceTypeId: industrial.id,  periodId: period1.id,
      title: "Помощник юриста",
      description: "Составление правовых документов, участие в судебных заседаниях в качестве наблюдателя. Работа с правовыми базами КонсультантПлюс и Гарант.",
      direction: "Юриспруденция", slotsTotal: 4, slotsTaken: 1 },
    { id: 12, companyId: lexPravo.id,  practiceTypeId: educational.id, periodId: period2.id,
      title: "Специалист по документообороту",
      description: "Ведение юридического архива, регистрация входящей и исходящей документации. Знакомство с договорной работой и корпоративным правом.",
      direction: "Юриспруденция", slotsTotal: 3, slotsTaken: 1 },
    { id: 13, companyId: konsalt.id,   practiceTypeId: industrial.id,  periodId: period1.id,
      title: "Ассистент менеджера проектов",
      description: "Участие в управлении проектами по Scrum. Работа в Jira, составление отчётов о ходе проектов. Взаимодействие с командами разработки и заказчиками.",
      direction: "Менеджмент", slotsTotal: 5, slotsTaken: 1 },
    { id: 14, companyId: konsalt.id,   practiceTypeId: educational.id, periodId: period2.id,
      title: "HR-стажёр",
      description: "Участие в подборе и адаптации персонала, работа с кадровой документацией. Знакомство с системой мотивации и оценки сотрудников.",
      direction: "Менеджмент", slotsTotal: 3, slotsTaken: 1 },
    { id: 15, companyId: minfin.id,    practiceTypeId: preDiploma.id,  periodId: period1.id,
      title: "Специалист бюджетного планирования",
      description: "Участие в составлении проектов бюджета, анализ исполнения госпрограмм. Работа с информационными системами исполнения бюджета Московской области.",
      direction: "Экономика", slotsTotal: 2, slotsTaken: 1 },
    { id: 16, companyId: mediaProf.id, practiceTypeId: industrial.id,  periodId: period1.id,
      title: "SMM-специалист",
      description: "Ведение социальных сетей бренда, создание контент-плана, анализ вовлечённости аудитории. Работа с аналитикой и таргетированной рекламой.",
      direction: "Маркетинг", slotsTotal: 4, slotsTaken: 1 },
    { id: 17, companyId: mediaProf.id, practiceTypeId: educational.id, periodId: period2.id,
      title: "Менеджер рекламных кампаний",
      description: "Планирование и запуск таргетированной рекламы. Работа с Яндекс.Директ и ВКонтакте Ads. Аналитика эффективности и оптимизация бюджета кампаний.",
      direction: "Маркетинг", slotsTotal: 3, slotsTaken: 0 },
    { id: 18, companyId: 1,            practiceTypeId: industrial.id,  periodId: period1.id,
      title: "Frontend-разработчик (React)",
      description: "Разработка UI на React + TypeScript, участие в code review, написание unit-тестов. Гибкий график. Возможность перехода на частичную занятость.",
      direction: "IT", slotsTotal: 3, slotsTaken: 1 },
    { id: 19, companyId: 2,            practiceTypeId: industrial.id,  periodId: period1.id,
      title: "Python-разработчик (ML)",
      description: "Работа с ML-моделями: обработка данных, обучение и валидация. Стек: Python, scikit-learn, TensorFlow, Jupyter Notebook. Выдаётся корпоративный ноутбук.",
      direction: "IT", slotsTotal: 3, slotsTaken: 1 },
  ];

  const offers: Record<number, { id: number }> = {};
  for (const { id, ...rest } of offersData) {
    offers[id] = await prisma.practiceOffer.upsert({
      where: { id }, update: {},
      create: { ...rest, createdBy: admin.id, isPublished: true },
    });
  }

  // ── Практики ──────────────────────────────────────────────────────────────
  // Формат: [email студента, offerId, companyId, typeId, periodId, status, grade?, submittedAt?, dateStart?, dateEnd?]
  type PracticeRow = {
    email: string; offerId: number; companyId: number;
    typeId: number; periodId: number; status: PracticeStatus;
    grade?: string; submittedAt?: Date; dateStart?: Date; dateEnd?: Date;
  };

  const practiceRows: PracticeRow[] = [
    // ЭК-21
    { email: "student2@praktik.ru",  offerId: 9,  companyId: sber.id,      typeId: industrial.id, periodId: period1.id,
      status: "completed", grade: "5", submittedAt: past(45), dateStart: past(60), dateEnd: past(5) },
    { email: "student3@praktik.ru",  offerId: 10, companyId: sber.id,      typeId: preDiploma.id, periodId: period1.id,
      status: "approved",  submittedAt: past(20), dateStart: past(30), dateEnd: new Date("2026-07-31") },
    { email: "student4@praktik.ru",  offerId: 15, companyId: minfin.id,    typeId: preDiploma.id, periodId: period1.id,
      status: "submitted", submittedAt: past(3),  dateStart: past(10), dateEnd: new Date("2026-07-31") },
    // ЮР-31
    { email: "student5@praktik.ru",  offerId: 11, companyId: lexPravo.id,  typeId: industrial.id, periodId: period1.id,
      status: "completed", grade: "4", submittedAt: past(50), dateStart: past(65), dateEnd: past(10) },
    { email: "student6@praktik.ru",  offerId: 12, companyId: lexPravo.id,  typeId: educational.id, periodId: period2.id,
      status: "needs_revision", submittedAt: past(7), dateStart: new Date("2026-09-01"), dateEnd: new Date("2026-09-30") },
    { email: "student7@praktik.ru",  offerId: 12, companyId: lexPravo.id,  typeId: educational.id, periodId: period2.id,
      status: "draft" },
    // МНЖ-21
    { email: "student8@praktik.ru",  offerId: 16, companyId: mediaProf.id, typeId: industrial.id, periodId: period1.id,
      status: "completed", grade: "5", submittedAt: past(40), dateStart: past(55), dateEnd: past(8) },
    { email: "student9@praktik.ru",  offerId: 13, companyId: konsalt.id,   typeId: industrial.id, periodId: period1.id,
      status: "approved",  submittedAt: past(18), dateStart: past(25), dateEnd: new Date("2026-07-31") },
    { email: "student10@praktik.ru", offerId: 14, companyId: konsalt.id,   typeId: educational.id, periodId: period2.id,
      status: "submitted", submittedAt: past(2),  dateStart: new Date("2026-09-01"), dateEnd: new Date("2026-09-30") },
    // ИСП-31 доп.
    { email: "student11@praktik.ru", offerId: 18, companyId: 1,            typeId: industrial.id, periodId: period1.id,
      status: "completed", grade: "4", submittedAt: past(38), dateStart: past(50), dateEnd: past(6) },
    { email: "student12@praktik.ru", offerId: 19, companyId: 2,            typeId: industrial.id, periodId: period1.id,
      status: "approved",  submittedAt: past(15), dateStart: past(22), dateEnd: new Date("2026-07-31") },
  ];

  const practiceIds: Record<string, number> = {};
  for (const row of practiceRows) {
    const p = await prisma.practice.create({
      data: {
        studentId: studentById[row.email],
        practiceTypeId: row.typeId,
        periodId: row.periodId,
        offerId: row.offerId,
        companyId: row.companyId,
        status: row.status,
        grade: row.grade ?? null,
        submittedAt: row.submittedAt ?? null,
        dateStart: row.dateStart ?? null,
        dateEnd: row.dateEnd ?? null,
      },
    });
    practiceIds[row.email] = p.id;
  }

  // ── Отзывы ────────────────────────────────────────────────────────────────
  type ReviewRow = { email: string; offerId: number; rating: number; comment: string };
  const reviewRows: ReviewRow[] = [
    { email: "student2@praktik.ru", offerId: 9,
      rating: 5, comment: "Отличная стажировка! Наставник всегда помогал разобраться в сложных вопросах. Получила реальный опыт финансового анализа и работы с корпоративными системами. Рекомендую Сбербанк для практики." },
    { email: "student5@praktik.ru", offerId: 11,
      rating: 4, comment: "Интересный опыт, познакомился с реальными делами. Присутствовал на двух судебных заседаниях — это незаменимо. Минус — иногда не хватало обратной связи от куратора в фирме." },
    { email: "student8@praktik.ru", offerId: 16,
      rating: 5, comment: "Творческая команда, интересные проекты с реальными брендами. Научилась аналитике, составляла контент-план и запускала рекламные кампании. После практики предложили сотрудничество на фрилансе!" },
    { email: "student11@praktik.ru", offerId: 18,
      rating: 4, comment: "Хорошая компания для старта в IT. Писал реальный код, который попал в прод. Команда дружелюбная, современный стек. Минус — задачи иногда были слишком простыми для 3-го курса." },
  ];

  for (const { email, offerId, rating, comment } of reviewRows) {
    const practiceId = practiceIds[email];
    const studentId = studentById[email];
    await prisma.offerReview.upsert({
      where: { practiceId },
      update: {},
      create: { offerId, practiceId, studentId, rating, comment },
    });
  }

  console.log("✅ Дополнительные данные загружены");
  console.log("");
  console.log("Кураторы (пароль: curator123):");
  console.log("  curator2@praktik.ru  — Петрова А.С.  (ЭК-21)");
  console.log("  curator3@praktik.ru  — Смирнов Д.В.  (ЮР-31)");
  console.log("  curator4@praktik.ru  — Николаева С.Б. (МНЖ-21)");
  console.log("");
  console.log("Студенты (пароль: student123):");
  console.log("  student2-4@praktik.ru   — ЭК-21 (Миронова, Власов, Орлова)");
  console.log("  student5-7@praktik.ru   — ЮР-31 (Герасимов, Воробьёва, Зайцев)");
  console.log("  student8-10@praktik.ru  — МНЖ-21 (Лебедева, Куликов, Морозова)");
  console.log("  student11-12@praktik.ru — ИСП-31 (Сорокин, Белова)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
