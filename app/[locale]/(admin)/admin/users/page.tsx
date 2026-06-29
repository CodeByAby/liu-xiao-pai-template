import { getTranslations } from "next-intl/server";
import { UsersTable } from "@/features/admin/components/users-table";
import {
  type AdminUsersDirectorySearchParams,
  getAdminUsersDirectory,
} from "@/lib/admin-user-directory";
import type { Locale } from "@/i18n.config";

interface AdminUsersPageProps {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams?: Promise<AdminUsersDirectorySearchParams>;
}

export default async function AdminUsersPage(props: AdminUsersPageProps) {
  const params = await props.params;

  const {
    locale
  } = params;

  const searchParams = await props.searchParams;
  const t = await getTranslations({ locale, namespace: "Admin.users" });
  const directory = await getAdminUsersDirectory(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("title")}
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {directory.query
              ? t("matchingUsers", {
                  count: directory.totalUsers,
                  query: directory.query,
                })
              : t("totalUsers", { count: directory.totalUsers })}
          </div>
        </div>
      </div>

      <UsersTable
        currentPage={directory.currentPage}
        pageSize={directory.pageSize}
        query={directory.query}
        totalPages={directory.totalPages}
        totalUsers={directory.totalUsers}
        users={directory.users}
      />
    </div>
  );
}
