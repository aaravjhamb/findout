import AdminUserList from "@/components/AdminUserList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FindOut — Admin Users",
};

export default function AdminUsersPage() {
  return <AdminUserList />;
}
