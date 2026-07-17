export type Lang = "uz" | "ru" | "en" | "kaa"

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "uz",  label: "O'zbekcha" },
  { code: "ru",  label: "Русский" },
  { code: "en",  label: "English" },
  { code: "kaa", label: "Qaraqalpaqsha" },
]

export const DEFAULT_LANG: Lang = "uz"

/**
 * Flat key -> per-language matn lug'ati. Yangi bo'lim tarjima qilinganda
 * shu yerga qo'shiladi; kalit topilmasa DEFAULT_LANG (uz)ga qaytadi.
 */
export const dictionary: Record<string, Record<Lang, string>> = {
  // ── Sidebar ──────────────────────────────────────────────────────────
  "sidebar.appSubtitle":      { uz: "Masofaviy Ta'lim",           ru: "Дистанционное обучение",         en: "Distance Learning",        kaa: "Attan bilim beriw" },
  "sidebar.searchPlaceholder": { uz: "Qidiruv",                    ru: "Поиск",                           en: "Search",                    kaa: "Izlew" },
  "sidebar.dashboard":        { uz: "Boshqaruv paneli",           ru: "Панель управления",              en: "Dashboard",                 kaa: "Basqarıw paneli" },
  "sidebar.adminPanel":       { uz: "Admin panel",                ru: "Панель администратора",          en: "Admin Panel",               kaa: "Admin paneli" },
  "sidebar.meeting":          { uz: "Meeting",                    ru: "Meeting",                         en: "Meeting",                   kaa: "Meeting" },

  "sidebar.section.studyPlan": { uz: "O'quv reja",                ru: "Учебный план",                    en: "Study Plan",                kaa: "Oqıw jobası" },
  "sidebar.item.studyPlan":    { uz: "O'quv reja",                ru: "Учебный план",                    en: "Study Plan",                kaa: "Oqıw jobası" },
  "sidebar.item.schedule":     { uz: "Dars jadvali",              ru: "Расписание занятий",              en: "Class Schedule",            kaa: "Sabaq kestesi" },
  "sidebar.item.controlSchedule": { uz: "Nazorat jadvali",        ru: "График контроля",                 en: "Control Schedule",          kaa: "Bahalaw kestesi" },
  "sidebar.item.subjectResources": { uz: "Fanlar resurslari",     ru: "Ресурсы предметов",               en: "Subject Resources",         kaa: "Pán resursları" },
  "sidebar.item.attendance":   { uz: "Davomat",                   ru: "Посещаемость",                    en: "Attendance",                kaa: "Qatnasıw" },
  "sidebar.item.performance":  { uz: "O'zlashtirish",             ru: "Успеваемость",                    en: "Performance",               kaa: "Ózlestiriw" },
  "sidebar.item.exams":        { uz: "Imtihonlar",                ru: "Экзамены",                        en: "Exams",                     kaa: "Emtihanlar" },
  "sidebar.item.rating":       { uz: "Reyting daftarcha",         ru: "Рейтинговая книжка",              en: "Rating Book",               kaa: "Reyting depteri" },

  "sidebar.section.retake":    { uz: "Qayta o'qish",              ru: "Пересдача",                       en: "Retake",                    kaa: "Qayta oqıw" },
  "sidebar.item.retakeApplication": { uz: "Ariza qayta o'qish",   ru: "Заявка на пересдачу",             en: "Retake Application",        kaa: "Qayta oqıw arizası" },
  "sidebar.item.retakeLessons":     { uz: "Q.O'qish mashg'ulotlari", ru: "Занятия пересдачи",             en: "Retake Lessons",            kaa: "Qayta oqıw sabaqları" },
  "sidebar.item.retakeControlSchedule": { uz: "Q.O'qish nazorat jadvali", ru: "График контроля пересдачи", en: "Retake Control Schedule",  kaa: "Qayta oqıw bahalaw kestesi" },
  "sidebar.item.retakePerformance": { uz: "Q.O'qish o'zlashtirish", ru: "Успеваемость пересдачи",        en: "Retake Performance",        kaa: "Qayta oqıw ózlestiriwi" },
  "sidebar.item.retakeList":        { uz: "Qayta o'qish ro'yxati", ru: "Список пересдач",                en: "Retake List",               kaa: "Qayta oqıw dizimi" },

  "sidebar.section.studentInfo": { uz: "Talaba ma'lumoti",        ru: "Информация о студенте",           en: "Student Info",              kaa: "Student maǵlıwmatı" },
  "sidebar.item.resume":         { uz: "Rezyume",                 ru: "Резюме",                          en: "Resume",                    kaa: "Rezyume" },
  "sidebar.item.orders":         { uz: "Buyruqlar",               ru: "Приказы",                         en: "Orders",                    kaa: "Buyrıqlar" },
  "sidebar.item.contracts":      { uz: "Shartnomalar",            ru: "Договоры",                        en: "Contracts",                 kaa: "Shártnamalar" },
  "sidebar.item.references":     { uz: "Ma'lumotnomalar",         ru: "Справки",                         en: "References",                kaa: "Anıqtamalar" },
  "sidebar.item.studentDocument": { uz: "Talaba hujjati",         ru: "Документ студента",               en: "Student Document",          kaa: "Student hújjeti" },
  "sidebar.item.graduationSheet": { uz: "Bitiruv varaqa",         ru: "Выпускной лист",                  en: "Graduation Sheet",          kaa: "Pitiriw qaǵazı" },
  "sidebar.item.gpa":            { uz: "Talaba GPA bali",         ru: "GPA балл студента",               en: "Student GPA",               kaa: "Student GPA balı" },
  "sidebar.item.subjectCertificates": { uz: "Fan sertifikatlari", ru: "Сертификаты по предметам",        en: "Subject Certificates",      kaa: "Pán sertifikatları" },
  "sidebar.item.plagiarism":     { uz: "Plagiat ma'lumotlari",    ru: "Данные о плагиате",               en: "Plagiarism Info",           kaa: "Plagiat maǵlıwmatı" },
  "sidebar.item.personalInfo":   { uz: "Shaxsiy ma'lumotlar",     ru: "Личные данные",                   en: "Personal Info",             kaa: "Jeke maǵlıwmatlar" },
  "sidebar.item.thesis":         { uz: "Bitiruv ishi",            ru: "Дипломная работа",                en: "Thesis",                    kaa: "Pitiriw jumısı" },
  "sidebar.item.socialActivity": { uz: "Ijtimoiy faollik arizasi", ru: "Заявка на соц. активность",      en: "Social Activity Application", kaa: "Jámiyetlik belsendilik arizası" },
  "sidebar.item.grantApplication": { uz: "Student Grant Application", ru: "Заявка на грант",             en: "Student Grant Application", kaa: "Student Grant arizası" },

  "sidebar.section.finance":     { uz: "Moliyaviy to'lov",        ru: "Финансовая оплата",               en: "Finance",                   kaa: "Moliya tólemi" },
  "sidebar.item.contractsList":  { uz: "Kontraktlar ro'yxati",    ru: "Список контрактов",               en: "Contracts List",            kaa: "Kontraktlar dizimi" },
  "sidebar.item.scholarship":    { uz: "Stipendiya hisobi",       ru: "Счёт стипендии",                  en: "Scholarship Account",       kaa: "Stipendiya esabı" },

  "sidebar.section.system":      { uz: "Tizim",                   ru: "Система",                         en: "System",                    kaa: "Sistema" },
  "sidebar.item.profile":        { uz: "Profil",                  ru: "Профиль",                         en: "Profile",                   kaa: "Profil" },
  "sidebar.item.hemisSurvey":    { uz: "Hemis so'rovnoma",        ru: "Опрос HEMIS",                     en: "HEMIS Survey",              kaa: "HEMIS sorawnaması" },
  "sidebar.item.globalSurvey":   { uz: "Global so'rovnoma",       ru: "Глобальный опрос",                en: "Global Survey",             kaa: "Global sorawnama" },
  "sidebar.item.loginHistory":   { uz: "Kirish tarixi",           ru: "История входов",                  en: "Login History",             kaa: "Kiriw tariyxı" },
  "sidebar.item.settings":       { uz: "Sozlamalar",              ru: "Настройки",                       en: "Settings",                  kaa: "Sazlamalar" },

  "sidebar.section.faceId":         { uz: "Face ID",              ru: "Face ID",                         en: "Face ID",                   kaa: "Face ID" },
  "sidebar.item.faceIdStatus":      { uz: "Face ID holati",       ru: "Статус Face ID",                  en: "Face ID Status",            kaa: "Face ID jaǵdayı" },
  "sidebar.item.faceIdRegister":    { uz: "Yuzni ro'yxatdan o'tkazish", ru: "Регистрация лица",          en: "Register Face",             kaa: "Júzdi dizimnen ótkeriw" },
  "sidebar.item.faceIdReregister":  { uz: "Qayta ro'yxatdan o'tish", ru: "Повторная регистрация",        en: "Re-register Face",          kaa: "Qayta dizimnen ótiw" },
  "sidebar.item.applications":      { uz: "Arizalar",             ru: "Заявки",                          en: "Applications",              kaa: "Arizalar" },

  "sidebar.section.subjectBase":   { uz: "Fanlar bazasi",         ru: "База предметов",                  en: "Subject Base",              kaa: "Pánler bazası" },
  "sidebar.item.subjectTopics":    { uz: "Fan mavzulari",         ru: "Темы предмета",                   en: "Subject Topics",            kaa: "Pán temaları" },
  "sidebar.item.grading":          { uz: "Baholash",              ru: "Оценивание",                      en: "Grading",                   kaa: "Bahalaw" },
  "sidebar.item.topicResults":     { uz: "Mavzular bo'yicha natijalar", ru: "Результаты по темам",       en: "Topic Results",             kaa: "Temalar boyınsha nátiyjeler" },

  "sidebar.section.studyProcess":  { uz: "O'quv jarayoni",        ru: "Учебный процесс",                 en: "Study Process",             kaa: "Oqıw procesi" },
  "sidebar.item.examsList":        { uz: "Imtihonlar ro'yxati",   ru: "Список экзаменов",                en: "Exams List",                kaa: "Emtihanlar dizimi" },
  "sidebar.item.subjectExams":     { uz: "Fan imtihonlari",       ru: "Экзамены по предмету",            en: "Subject Exams",             kaa: "Pán emtihanları" },

  "sidebar.item.personalRecordEntry": { uz: "Shaxsiy qaydnoma kiritish", ru: "Ввод личной записи",       en: "Enter Personal Record",     kaa: "Jeke jazba kirgiziw" },
  "sidebar.item.gradingRequests":  { uz: "Baholash so'rovlari",   ru: "Запросы на оценивание",           en: "Grading Requests",          kaa: "Bahalaw sorawları" },

  "sidebar.section.lessons":       { uz: "Mashg'ulotlar",         ru: "Занятия",                         en: "Lessons",                   kaa: "Sabaqlar" },

  // ── Qayta o'qish o'zlashtirish sahifasi ─────────────────────────────
  "retakePerf.subtitle":  { uz: "Qayta o'qish baholar ko'rsatkichi", ru: "Показатель оценок пересдачи",  en: "Retake grade indicator",    kaa: "Qayta oqıw baalar kórsetkishi" },
  "retakePerf.notFound":  { uz: "O'zlashtirish ma'lumotlari topilmadi", ru: "Данные об успеваемости не найдены", en: "No performance data found", kaa: "Ózlestiriw maǵlıwmatı tabılmadı" },
  "retakePerf.noneYet":   { uz: "Qayta o'qish baholar ma'lumotlari hali mavjud emas", ru: "Данные оценок пересдачи пока отсутствуют", en: "Retake grade data is not available yet", kaa: "Qayta oqıw baalar maǵlıwmatı áli joq" },

  // ── Davomat sahifasi ─────────────────────────────────────────────────
  "davomat.title":            { uz: "Davomat",                   ru: "Посещаемость",                    en: "Attendance",                kaa: "Qatnasıw" },
  "davomat.subtitle":         { uz: "Darslarga davomat tarixi",  ru: "История посещаемости занятий",    en: "Class attendance history",  kaa: "Sabaqlarǵa qatnasıw tariyxı" },

  "davomat.tab.hemis":        { uz: "HEMIS davomati",            ru: "Посещаемость HEMIS",              en: "HEMIS attendance",          kaa: "HEMIS qatnasıwı" },
  "davomat.tab.platform":     { uz: "Platformadan keldi",        ru: "Отмечено на платформе",           en: "From platform",             kaa: "Platformadan kelgen" },
  "davomat.tab.sessions":     { uz: "Kirish tarixi",             ru: "История входов",                  en: "Login history",             kaa: "Kiriw tariyxı" },

  "davomat.subjectSelect":    { uz: "Fanlarni tanlang",          ru: "Выберите предмет",                en: "Select subject",            kaa: "Pándi tańlań" },
  "davomat.searchHemis":      { uz: "Fan / Xodim bo'yicha qidirish", ru: "Поиск по предмету / сотруднику", en: "Search by subject / staff", kaa: "Pán / Qizmetker boyınsha izlew" },
  "davomat.searchPlatform":   { uz: "Fan bo'yicha qidirish",     ru: "Поиск по предмету",               en: "Search by subject",         kaa: "Pán boyınsha izlew" },

  "davomat.col.number":       { uz: "#",                         ru: "№",                                en: "#",                          kaa: "№" },
  "davomat.col.semester":     { uz: "Semestr",                   ru: "Семестр",                          en: "Semester",                   kaa: "Semestr" },
  "davomat.col.lessonDate":   { uz: "Dars sanasi",               ru: "Дата занятия",                    en: "Lesson Date",               kaa: "Sabaq sánesi" },
  "davomat.col.subject":      { uz: "Fanlar",                    ru: "Предметы",                        en: "Subject",                    kaa: "Pánler" },
  "davomat.col.lessonType":   { uz: "Mashg'ulot",                ru: "Занятие",                          en: "Lesson Type",                kaa: "Sabaq túri" },
  "davomat.col.reason":       { uz: "Sababli",                   ru: "Причина",                          en: "Reason",                     kaa: "Sebepli" },
  "davomat.col.hours":        { uz: "Soatlar",                   ru: "Часы",                             en: "Hours",                      kaa: "Saatlar" },
  "davomat.col.staff":        { uz: "Xodim",                     ru: "Сотрудник",                        en: "Staff",                      kaa: "Qizmetker" },
  "davomat.col.date":         { uz: "Sana",                      ru: "Дата",                             en: "Date",                        kaa: "Sáne" },
  "davomat.col.status":       { uz: "Holat",                     ru: "Статус",                           en: "Status",                     kaa: "Jaǵday" },
  "davomat.col.comment":      { uz: "Izoh",                      ru: "Комментарий",                     en: "Comment",                    kaa: "Pikir" },
  "davomat.col.loginTime":    { uz: "Kirish vaqti",              ru: "Время входа",                     en: "Login time",                 kaa: "Kiriw waqtı" },
  "davomat.col.logoutTime":   { uz: "Chiqish vaqti",             ru: "Время выхода",                    en: "Logout time",                kaa: "Shıǵıw waqtı" },
  "davomat.col.duration":     { uz: "Davomiyligi",               ru: "Продолжительность",               en: "Duration",                    kaa: "Dawamlılıǵı" },

  "davomat.status.excused":       { uz: "Sababli",   ru: "Уважительная", en: "Excused",   kaa: "Sebepli" },
  "davomat.status.unexcused":     { uz: "Sababsiz",  ru: "Неуважительная", en: "Unexcused", kaa: "Sebepsiz" },
  "davomat.status.present":       { uz: "Keldi",     ru: "Пришёл",       en: "Present",    kaa: "Keldi" },
  "davomat.status.late":          { uz: "Kech keldi", ru: "Опоздал",     en: "Late",       kaa: "Keship keldi" },
  "davomat.status.absent":        { uz: "Kelmadi",   ru: "Не пришёл",    en: "Absent",     kaa: "Kelmedi" },
  "davomat.status.notLoggedOut":  { uz: "Hali chiqmagan", ru: "Ещё не вышел", en: "Not logged out yet", kaa: "Áli shıqpaǵan" },

  "davomat.empty.hemis":     { uz: "Davomat yozuvlari topilmadi", ru: "Записи о посещаемости не найдены", en: "No attendance records found", kaa: "Qatnasıw jazıwları tabılmadı" },
  "davomat.empty.platform":  { uz: "Platformadan davomat yozuvlari topilmadi", ru: "Записи о посещаемости с платформы не найдены", en: "No platform attendance records found", kaa: "Platformadan qatnasıw jazıwları tabılmadı" },
  "davomat.empty.sessions":  { uz: "Kirish tarixi topilmadi", ru: "История входов не найдена", en: "No login history found", kaa: "Kiriw tariyxı tabılmadı" },
  "davomat.notLoaded":       { uz: "Ma'lumot yuklanmadi.", ru: "Данные не загружены.", en: "Data failed to load.", kaa: "Maǵlıwmat júklenbedi." },
  "davomat.retry":           { uz: "Qayta urinish", ru: "Повторить", en: "Retry", kaa: "Qayta urınıw" },
  "davomat.totalRecords":    { uz: "Jami: {n} ta yozuv", ru: "Всего: {n} записей", en: "Total: {n} records", kaa: "Barlıǵı: {n} jazıw" },
  "davomat.totalLogins":     { uz: "Jami: {n} ta kirish", ru: "Всего: {n} входов", en: "Total: {n} logins", kaa: "Barlıǵı: {n} kiriw" },
  "davomat.minutes":         { uz: "{n} daqiqa", ru: "{n} мин.", en: "{n} min", kaa: "{n} minut" },

  // ── Dashboard ────────────────────────────────────────────────────────
  "dashboard.systemOverview": { uz: "Tizim umumiy ko'rinishi", ru: "Общий обзор системы", en: "System overview", kaa: "Sistemanıń jalpı kórinisi" },
  "dashboard.welcome":        { uz: "Xush kelibsiz",           ru: "Добро пожаловать",     en: "Welcome",         kaa: "Qosh keldińiz" },
  "dashboard.studentCabinet": { uz: "Talaba kabineti",         ru: "Кабинет студента",     en: "Student cabinet", kaa: "Student kabineti" },
  "dashboard.group":          { uz: "Guruh: {name}",           ru: "Группа: {name}",       en: "Group: {name}",   kaa: "Gruppa: {name}" },
  "dashboard.grades":         { uz: "Baholar",                 ru: "Оценки",               en: "Grades",          kaa: "Baalar" },
  "dashboard.finance":        { uz: "Moliyaviy",               ru: "Финансы",              en: "Finance",         kaa: "Moliya" },

  "dashboard.quickLinks":     { uz: "Tezkor havolalar",        ru: "Быстрые ссылки",       en: "Quick links",     kaa: "Tez siltemeler" },
  "dashboard.recentActivity": { uz: "So'nggi faoliyat",        ru: "Недавняя активность",  en: "Recent activity", kaa: "Aqırǵı belsendilik" },
  "dashboard.totalAdmins":    { uz: "Jami adminlar",           ru: "Всего админов",        en: "Total admins",    kaa: "Barlıq adminler" },
  "dashboard.moderators":     { uz: "Moderatorlar",            ru: "Модераторы",           en: "Moderators",      kaa: "Moderatorlar" },
  "dashboard.sellers":        { uz: "Sotuvchilar",             ru: "Продавцы",             en: "Sellers",         kaa: "Satıwshılar" },
  "dashboard.masters":        { uz: "Ustalar",                 ru: "Мастера",              en: "Masters",         kaa: "Ustalar" },
  "dashboard.groups":         { uz: "Guruhlar",                ru: "Группы",               en: "Groups",          kaa: "Gruppalar" },
  "dashboard.documents":      { uz: "Hujjatlar",               ru: "Документы",            en: "Documents",       kaa: "Hújjetler" },

  "dashboard.teacherCabinet": { uz: "O'qituvchi kabineti",     ru: "Кабинет преподавателя", en: "Teacher cabinet", kaa: "Oqıtıwshı kabineti" },
  "dashboard.hemisDataFor":   { uz: "{name} uchun HEMIS ma'lumotlari", ru: "Данные HEMIS для {name}", en: "HEMIS data for {name}", kaa: "{name} ushın HEMIS maǵlıwmatları" },
  "dashboard.hemisLoading":   { uz: "HEMIS o'qituvchi profili yuklanmoqda", ru: "Загрузка профиля преподавателя HEMIS", en: "Loading HEMIS teacher profile", kaa: "HEMIS oqıtıwshı profili júklenbekte" },
  "dashboard.lessonsSection": { uz: "Mashg'ulotlar",           ru: "Занятия",              en: "Lessons",         kaa: "Sabaqlar" },
  "dashboard.controlsSection": { uz: "Nazoratlar",             ru: "Контроли",             en: "Controls",        kaa: "Bahalawlar" },
  "dashboard.attendanceJournal": { uz: "Davomat jurnali",      ru: "Журнал посещаемости",  en: "Attendance journal", kaa: "Qatnasıw jurnalı" },
  "dashboard.mySchedule":     { uz: "Mening dars jadvalim",    ru: "Моё расписание",       en: "My schedule",     kaa: "Meniń sabaq kestem" },
  "dashboard.lessonList":     { uz: "Darslar ro'yxati",        ru: "Список занятий",       en: "Lesson list",     kaa: "Sabaqlar dizimi" },
  "dashboard.midtermControl": { uz: "Oraliq nazorat",          ru: "Промежуточный контроль", en: "Midterm control", kaa: "Aralıq bahalaw" },
  "dashboard.finalControl":   { uz: "Yakuniy nazorat",         ru: "Итоговый контроль",    en: "Final control",   kaa: "Juwmaqlawshı bahalaw" },
  "dashboard.otherControls":  { uz: "Boshqa nazoratlar",       ru: "Другие контроли",      en: "Other controls",  kaa: "Basqa bahalawlar" },
  "dashboard.subjectResources": { uz: "Fan resurslari",        ru: "Ресурсы предмета",     en: "Subject resources", kaa: "Pán resursları" },
  "dashboard.subjectTasks":   { uz: "Fan topshiriqlari",       ru: "Задания по предмету",  en: "Subject tasks",   kaa: "Pán tapsırmaları" },
  "dashboard.calendarPlan":   { uz: "Kalendar reja",           ru: "Календарный план",     en: "Calendar plan",   kaa: "Kalendar josparı" },
  "dashboard.personalRecord": { uz: "Shaxsiy qaydnoma",        ru: "Личная запись",        en: "Personal record", kaa: "Jеke jazba" },
}

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const entry = dictionary[key]
  let text = entry ? (entry[lang] ?? entry[DEFAULT_LANG]) : key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}
