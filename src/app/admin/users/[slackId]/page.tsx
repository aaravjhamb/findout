import AdminUserDetail from "@/components/AdminUserDetail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "FindOut — Admin User",
};

export default function AdminUserDetailPage({ params }: { params: { slackId: string } }) {
  return <AdminUserDetail slackId={params.slackId} />;
}
