"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyCoursesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/courses?tab=created"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to My Created courses...</div>;
}
