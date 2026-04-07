"use client";
import Link from "next/link";
import { PRODUCTS } from "../lib/supabase";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Лендинги</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Выберите продукт для редактирования контента</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.slug}
              href={`/dashboard/${p.slug}`}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {p.label}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{p.slug}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
