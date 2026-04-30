"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sa_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sa_theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className={`flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
