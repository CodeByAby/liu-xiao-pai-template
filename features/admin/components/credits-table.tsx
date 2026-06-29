"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Database,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Coins,
} from "lucide-react";

interface CreditTransaction {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  delta: number;
  reason: string;
  paymentId: string | null;
  createdAt: Date;
  userCredits: number | null;
}

interface TopUser {
  id: string;
  name: string | null;
  email: string | null;
  credits: number;
}

interface CreditsTableProps {
  transactions: CreditTransaction[];
  stats: {
    totalCreditsIssued: number;
    totalCreditsUsed: number;
    totalTransactions: number;
    averageUsage: number;
  };
  topUsers: TopUser[];
}

export function CreditsTable({ transactions: initialTransactions, stats, topUsers }: CreditsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [transactionPage, setTransactionPage] = useState(1);
  const t = useTranslations("Admin.credits");
  const locale = useLocale();
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredTransactions = initialTransactions.filter((transaction) => {
    const matchesSearch = 
      transaction.userName?.toLowerCase().includes(normalizedSearchTerm) ||
      transaction.userEmail?.toLowerCase().includes(normalizedSearchTerm) ||
      transaction.reason.toLowerCase().includes(normalizedSearchTerm);
    
    const matchesType = 
      typeFilter === "all" ||
      (typeFilter === "earned" && transaction.delta > 0) ||
      (typeFilter === "spent" && transaction.delta < 0);
    
    return matchesSearch && matchesType;
  });

  const transactionsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage));
  const currentPage = Math.min(transactionPage, totalPages);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);
  const topUsersToDisplay = topUsers.slice(0, 10);
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

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "subscription_cycle":
        return t("subscriptionCycle");
      case "subscription_schedule":
        return t("subscriptionSchedule");
      case "one_time_pack":
        return t("oneTimePack");
      case "chat_usage":
        return t("chatUsage");
      case "adjustment":
        return t("adjustment");
      default:
        return reason;
    }
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
                {t("totalIssued")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                +{stats.totalCreditsIssued.toLocaleString()}
              </p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("totalUsed")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                -{stats.totalCreditsUsed.toLocaleString()}
              </p>
            </div>
            <div className="bg-red-600 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("totalTransactions")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.totalTransactions.toLocaleString()}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("avgUsage")}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {Math.round(stats.averageUsage)}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 积分排行榜 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t("topUsers")}
          </h2>

          <div className="bg-background rounded-lg border border-border">
            <div className="divide-y divide-border">
              {topUsersToDisplay.map((user, index) => (
                <div key={user.id} className="p-4 hover:bg-hover transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        index === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                        index === 1 ? "bg-secondary text-muted-foreground" :
                        index === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {user.name || t("unknownUser")}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {user.credits.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 积分流水表格 */}
        <div className="space-y-4">
          {/* 筛选栏 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setTransactionPage(1);
                }}
                className="w-full pl-11 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setTransactionPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{t("allTypes")}</option>
              <option value="earned">{t("earned")}</option>
              <option value="spent">{t("spent")}</option>
            </select>
          </div>

          {/* 流水表格 */}
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("user")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("change")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("reason")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("balance")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("date")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-hover">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {transaction.userName || t("unknownUser")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          transaction.delta > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {transaction.delta > 0 ? "+" : ""}{transaction.delta}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {getReasonLabel(transaction.reason)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-foreground">
                          {transaction.userCredits ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: locale !== 'zh'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t("noTransactions")}
                  </p>
                </div>
              )}
            </div>
            
            {filteredTransactions.length > 0 && (
              <nav
                className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary"
                aria-label={t("pagination.page", { current: currentPage, total: totalPages })}
              >
                <button
                  type="button"
                  onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("pagination.previous")}
                </button>

                <div className="flex items-center gap-2">
                  {pageNumbers[0] > 1 && (
                    <button
                      type="button"
                      onClick={() => setTransactionPage(1)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-hover ${currentPage === 1 ? "bg-foreground text-background" : "text-muted-foreground"}`}
                    >
                      1
                    </button>
                  )}
                  {pageNumbers[0] > 2 && <span className="text-sm text-muted-foreground">...</span>}

                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setTransactionPage(pageNumber)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-hover ${
                        currentPage === pageNumber ? "bg-foreground text-background" : "text-muted-foreground"
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
                      onClick={() => setTransactionPage(totalPages)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-hover ${currentPage === totalPages ? "bg-foreground text-background" : "text-muted-foreground"}`}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setTransactionPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("pagination.next")}
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
