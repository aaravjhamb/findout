"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              active
                ? "border-[#61453a] bg-[#61453a] text-[#fcf1e5]"
                : "border-[#61453a]/20 hover:bg-white/60"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="rounded-full border border-[#61453a]/20 px-4 py-2 text-sm font-medium hover:bg-white/60"
      >
        Back to app
      </Link>
    </nav>
  );
}
