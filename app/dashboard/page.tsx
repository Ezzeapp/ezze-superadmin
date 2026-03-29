"use client";
import Link from "next/link";
import { PRODUCTS } from "../lib/supabase";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Лендинги</h1>
        <p className="text-sm text-gray-500 mt-1">Выберите продукт для редактирования контента</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PRODUCTS.map((p) => (
          <Link
            key={p.slug}
            href={`/dashboard/${p.slug}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">{p.icon}</div>
            <div className="font-medium text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
              {p.label}
            </div>
            <div className="text-xs text-gray-400 mt-1">{p.slug}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
