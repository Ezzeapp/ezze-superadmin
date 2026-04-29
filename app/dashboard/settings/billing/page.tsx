import { redirect } from "next/navigation";

// Раздел переехал в /dashboard/tariffs (объединили «Конструктор тарифов» и «Тарифы и платежи»)
export default function BillingRedirect() {
  redirect("/dashboard/tariffs");
}
