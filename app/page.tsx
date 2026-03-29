"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-gray-400 text-sm">Загрузка...</div>
    </div>
  );
}
