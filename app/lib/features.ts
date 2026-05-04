// Зеркало ezze-app/src/config/features.ts — синхронизировать вручную при
// добавлении/удалении фичи. Источник правды — фронт продуктов; superadmin
// управляет включением/выключением и тарифом, но конфиг (label, description,
// defaultPlan) рендерится отсюда.

export type FeaturePlan = "free" | "pro" | "enterprise";

export type FeatureSection =
  | "navigation"
  | "integrations"
  | "analytics"
  | "catalog"
  | "tools"
  | "marketing"
  | "settings";

export interface FeatureConfig {
  key: string;
  label: string;
  description: string;
  defaultPlan: FeaturePlan;
  section: FeatureSection;
}

export const FEATURES: FeatureConfig[] = [
  // Навигация
  { key: "inventory",       label: "Склад",            description: "Управление товарами, материалами и складским учётом",                              defaultPlan: "free", section: "navigation" },
  { key: "calendar",        label: "Календарь",        description: "Просмотр записей в календарном виде",                                              defaultPlan: "free", section: "navigation" },
  { key: "clients",         label: "Клиенты",          description: "CRM — база клиентов, история визитов",                                             defaultPlan: "free", section: "navigation" },
  { key: "schedule",        label: "Расписание",       description: "Настройка рабочего времени и перерывов",                                            defaultPlan: "free", section: "navigation" },
  { key: "public_booking",  label: "Онлайн-запись",    description: "Публичная страница для самозаписи клиентов",                                       defaultPlan: "pro",  section: "navigation" },
  { key: "teams",           label: "Команда мастеров", description: "Объединение мастеров в команду, совместная аналитика, приглашения",                defaultPlan: "pro",  section: "navigation" },

  // Интеграции
  { key: "telegram",        label: "Telegram-бот",                  description: "Уведомления о новых записях через Telegram",                                                                          defaultPlan: "pro", section: "integrations" },
  { key: "client_cabinet",  label: "Кабинет клиента (Telegram)",    description: "Личный кабинет клиента в Telegram Mini App — история записей, повторная запись, отмена",                              defaultPlan: "pro", section: "integrations" },

  // Аналитика
  { key: "analytics_revenue", label: "Статистика выручки",  description: "Графики дохода, средний чек, динамика",                  defaultPlan: "pro",        section: "analytics" },
  { key: "analytics_clients", label: "Аналитика клиентов",  description: "Новые vs возвращающиеся, источники, LTV",                defaultPlan: "enterprise", section: "analytics" },

  // Справочники
  { key: "global_services_catalog", label: "Глобальный справочник услуг",  description: "Добавление услуг из общего справочника платформы",            defaultPlan: "free", section: "catalog" },
  { key: "global_products_catalog", label: "Глобальный справочник товаров", description: "Добавление товаров/материалов из общего справочника",        defaultPlan: "pro",  section: "catalog" },

  // Инструменты
  { key: "appointment_notes",     label: "Заметки в записи",         description: "Поле для заметок и пожеланий клиента в форме создания записи",                              defaultPlan: "free", section: "tools" },
  { key: "appointment_recurring", label: "Повторяющаяся запись",     description: "Возможность создать серию повторяющихся записей по расписанию",                              defaultPlan: "free", section: "tools" },
  { key: "service_materials",     label: "Материалы к услугам",      description: "Привязка расходных материалов из склада к услугам для автоматического учёта",               defaultPlan: "pro",  section: "tools" },
  { key: "date_blocks",           label: "Блокировка дат",           description: "Блокировка дней и временных интервалов — отгул, отпуск, недоступность",                      defaultPlan: "free", section: "tools" },
  { key: "data_transfer",         label: "Перенос данных",           description: "Генерация кода для копирования услуг, категорий, материалов и склада другому мастеру",       defaultPlan: "pro",  section: "tools" },

  // Маркетинг
  { key: "marketing",   label: "Маркетинг",  description: "Раздел маркетинга — рассылки клиентам, авто-уведомления, отзывы",                            defaultPlan: "free", section: "marketing" },
  { key: "reviews",     label: "Отзывы",     description: "Сбор и управление отзывами клиентов после визита",                                            defaultPlan: "free", section: "marketing" },
  { key: "promo_codes", label: "Промокоды",  description: "Создание скидочных кодов и спецпредложений для клиентов",                                    defaultPlan: "pro",  section: "marketing" },
  { key: "loyalty",     label: "Лояльность", description: "Программа лояльности — баллы, уровни клиентов, реферальная система",                          defaultPlan: "pro",  section: "marketing" },

  // Настройки (вкладки в /settings) — суперадмин управляет видимостью per-product.
  // Аккаунт и Интерфейс не отключаемые (базовые), здесь не указаны.
  { key: "settings_schedule",      label: "Настройки → Расписание",     description: "Вкладка «Расписание» в /settings (часы работы, перерывы, блокировки дат). Для cleaning/workshop часто не нужна.", defaultPlan: "free", section: "settings" },
  { key: "settings_public_page",   label: "Настройки → Моя страница",   description: "Вкладка «Моя страница» — управление публичным лендингом /p/{slug}.",                                              defaultPlan: "free", section: "settings" },
  { key: "settings_booking",       label: "Настройки → Онлайн-запись",  description: "Вкладка «Онлайн-запись» — настройки слот-бронирования (только для appointment-based продуктов).",                  defaultPlan: "free", section: "settings" },
  { key: "settings_order_types",   label: "Настройки → Приёмка / Типы устройств", description: "Cleaning: «Приёмка» (цена доставки, % срочной надбавки). Workshop: «Типы устройств» (каталог). Сами типы заказов cleaning редактируются в Справочнике суперадмина.", defaultPlan: "free", section: "settings" },
  { key: "settings_receipt",       label: "Настройки → Квитанция",      description: "Вкладка «Квитанция» — реквизиты организации, оферта, формат печати.",                                              defaultPlan: "free", section: "settings" },
  { key: "settings_notifications", label: "Настройки → Уведомления",    description: "Вкладка «Уведомления» — шаблоны TG-сообщений клиенту по статусам заказа.",                                       defaultPlan: "free", section: "settings" },
];

export const PLAN_ORDER: FeaturePlan[] = ["free", "pro", "enterprise"];

export const PLAN_LABELS: Record<FeaturePlan, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PLAN_COLORS: Record<FeaturePlan, string> = {
  free:       "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pro:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export const SECTION_LABELS: Record<FeatureSection, string> = {
  navigation:   "Навигация",
  integrations: "Интеграции",
  analytics:    "Аналитика",
  catalog:      "Справочники",
  tools:        "Инструменты",
  marketing:    "Маркетинг",
  settings:     "Настройки (вкладки)",
};
