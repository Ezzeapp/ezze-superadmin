# ezze-superadmin

Суперадминка для управления контентом лендингов всех продуктов Ezze.

## Стек
Next.js 16 + TypeScript + Tailwind CSS + Lucide React + Supabase
`output: 'export'` (статический HTML/CSS/JS), `trailingSlash: true`

## Репо и деплой
- Репо: `git@github.com:Ezzeapp/ezze-superadmin.git`
- URL: `https://admin.ezze.site`
- VPS: `/var/www/ezze-superadmin/`
- Деплой: `npm run build` → `scp -r out/* root@72.62.119.187:/var/www/ezze-superadmin/`
- ⚠️ .env.local ДОЛЖЕН содержать реальный ANON_KEY (не placeholder!) иначе логин не работает

## Переменные окружения (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://ezze.site
NEXT_PUBLIC_SUPABASE_ANON_KEY=<реальный ключ из /app/supabase/.env на VPS>
```

## Авторизация
- Email/пароль → Supabase Auth → проверка `public.users.is_admin = true`
- Аккаунт: `admin@ezze.site`, `is_admin=true` установлен в БД

## Ключевые файлы
```
app/
  login/page.tsx                        — форма входа
  dashboard/
    layout.tsx                          — auth guard + sidebar с Lucide иконками
    page.tsx                            — сетка продуктов
    [product]/
      page.tsx                          — server wrapper (generateStaticParams)
      client.tsx                        — "use client" UI: таблица секций
    [product]/[section]/
      page.tsx                          — server wrapper (generateStaticParams)
      client.tsx                        — "use client" UI: JSON редактор
  lib/
    constants.ts                        — PRODUCTS, SECTIONS, LANGS (без "use client"!)
    supabase.ts                         — "use client" + re-exports из constants.ts
```

## Критический паттерн: server wrapper + client component
`output: 'export'` требует `generateStaticParams` для динамических роутов.
`generateStaticParams` нельзя использовать в `"use client"` файлах.
**Решение:** `page.tsx` (server, generateStaticParams) → `client.tsx` ("use client", UI)

```tsx
// page.tsx — server
import { PRODUCTS } from "../../lib/constants"; // НЕ из supabase.ts!
import ProductClient from "./client";
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ product: p.slug }));
}
export default async function Page({ params }) {
  const { product } = await params;
  return <ProductClient product={product} />;
}
```

## Иконки
Все иконки — `lucide-react`. НЕ использовать эмодзи.
- Бренд: `Zap` | Main: `Globe` | Beauty: `Scissors` | Workshop: `Shirt`
- Clinic: `Stethoscope` | Farm: `Leaf` | Edu: `GraduationCap` | Event: `CalendarDays`
- Food: `UtensilsCrossed` | Hotel: `Building2` | Transport: `Car` | Build: `Hammer`

## Таблица landing_sections (в Supabase ezze-app)
```sql
UNIQUE (product, section, lang)
```
Редактирование через JSON textarea, upsert при сохранении.
