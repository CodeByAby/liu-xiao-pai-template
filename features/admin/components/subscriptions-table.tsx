"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  planKey: string;
  status: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  stats: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    expiredSubscriptions: number;
  };
}

export function SubscriptionsTable({ subscriptions: initialSubscriptions, stats }: SubscriptionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const t = useTranslations("Admin.subscriptions");
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredSubscriptions = initialSubscriptions.filter((sub) => {
    const matchesSearch = 
      sub.userName?.toLowerCase().includes(normalizedSearchTerm) ||
      sub.userEmail?.toLowerCase().includes(normalizedSearchTerm) ||
      sub.planKey.toLowerCase().includes(normalizedSearchTerm);
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const subscriptionsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / subscriptionsPerPage));
  const currentPage = Math.min(subscriptionPage, totalPages);
  const startIndex = (currentPage - 1) * subscriptionsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, startIndex + subscriptionsPerPage);
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - halfWindow);
    let end = start + maxButtons - 1;

    if (end > totalPages) {
      end = totalPages;
      start = end - maxButtons + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "canceled":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "expired":
        return "bg-secondary text-muted-foreground";
      case "trial":
        return "bg-secondary text-muted-foreground";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getDaysUntilExpiry = (endDate: Date | null) => {
    if (!endDate) return null;
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("title")}
        </h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("totalSubscriptions")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.totalSubscriptions}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("activeSubscriptions")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.activeSubscriptions}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("canceledSubscriptions")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.canceledSubscriptions}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("expiredSubscriptions")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.expiredSubscriptions}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSubscriptionPage(1);
            }}
            className="w-full pl-11 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setSubscriptionPage(1);
          }}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t("allStatus")}</option>
          <option value="active">{t("active")}</option>
          <option value="canceled">{t("canceled")}</option>
          <option value="expired">{t("expired")}</option>
          <option value="trial">{t("trial")}</option>
        </select>
      </div>

      {/* 订阅表格 */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("user")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("plan")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("expiryDate")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("createdAt")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedSubscriptions.map((sub) => {
                const daysUntilExpiry = getDaysUntilExpiry(sub.currentPeriodEnd);

                return (
                  <tr key={sub.id} className="hover:bg-hover">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {sub.userName || t("unknownUser")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sub.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {sub.planKey}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(sub.status)}`}>
                        {t(sub.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {sub.currentPeriodEnd ? (
                        <div>
                          <div className="text-sm text-foreground">
                            {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                          </div>
                          {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {t("daysRemaining", { days: daysUntilExpiry })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {t("noSubscriptions")}
              </p>
            </div>
          )}
        </div>

        {filteredSubscriptions.length > 0 && (
          <nav
            className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary"
            aria-label={t("pagination.page", { current: currentPage, total: totalPages })}
          >
            <button
              type="button"
              onClick={() => setSubscriptionPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("pagination.previous")}
            </button>

            <div className="flex items-center gap-2">
              {pageNumbers[0] > 1 && (
                <button
                  type="button"
                  onClick={() => setSubscriptionPage(1)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-hover ${currentPage === 1 ? "bg-foreground text-background border-transparent" : "text-muted-foreground border-border"}`}
                >
                  1
                </button>
              )}
              {pageNumbers[0] > 2 && <span className="text-sm text-muted-foreground">...</span>}

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setSubscriptionPage(pageNumber)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-hover ${
                    currentPage === pageNumber ? "bg-foreground text-background border-transparent" : "text-muted-foreground border-border"
                  }`}
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="text-sm text-muted-foreground">...</span>
              )}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <button
                  type="button"
                  onClick={() => setSubscriptionPage(totalPages)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-hover ${currentPage === totalPages ? "bg-foreground text-background border-transparent" : "text-muted-foreground border-border"}`}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSubscriptionPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("pagination.next")}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
