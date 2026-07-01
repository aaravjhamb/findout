import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 text-center bg-[#fcf1e5] text-[#61453a]">
        <div className="max-w-sm">
          <h1 className="font-bells text-3xl mb-2">Admin</h1>
          <p className="text-[#61453a]/70">
            {admin.status === 401
              ? "Please sign in to continue."
              : "You don’t have admin access."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-[#61453a] px-5 py-2 text-sm font-medium text-[#fcf1e5]"
          >
            Back to FindOut
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#fcf1e5] text-[#61453a]">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-bells text-4xl leading-none">Admin</h1>
            <p className="mt-1 text-sm text-[#61453a]/60">Signed in as {admin.email}</p>
          </div>
          <AdminNav />
        </header>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</div>
    </div>
  );
}
