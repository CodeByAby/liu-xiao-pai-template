import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { AdminHeader } from "@/features/admin/components/admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 检查管理员权限
  await requireAdmin();

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex">
        {/* 侧边栏 */}
        <AdminSidebar />

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col">
          <AdminHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}