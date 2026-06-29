import { db } from "@/lib/db";
import { creditLedger, user } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { CreditsTable } from "@/features/admin/components/credits-table";

export default async function AdminCreditsPage() {
  // 获取所有积分流水
  const creditTransactions = await db
    .select({
      id: creditLedger.id,
      userId: creditLedger.userId,
      userName: user.name,
      userEmail: user.email,
      delta: creditLedger.delta,
      reason: creditLedger.reason,
      paymentId: creditLedger.paymentId,
      createdAt: creditLedger.createdAt,
      userCredits: user.credits,
    })
    .from(creditLedger)
    .leftJoin(user, sql`${creditLedger.userId} = ${user.id}`)
    .orderBy(sql`${creditLedger.createdAt} desc`)
    .limit(100); // 只显示最近100条

  // 统计数据
  const stats = await db
    .select({
      totalCreditsIssued: sql<number>`COALESCE(sum(case when ${creditLedger.delta} > 0 then ${creditLedger.delta} else 0 end), 0)`,
      totalCreditsUsed: sql<number>`COALESCE(sum(case when ${creditLedger.delta} < 0 then abs(${creditLedger.delta}) else 0 end), 0)`,
      totalTransactions: sql<number>`count(*)`,
      averageUsage: sql<number>`COALESCE(avg(case when ${creditLedger.delta} < 0 then abs(${creditLedger.delta}) else null end), 0)`,
    })
    .from(creditLedger);

  // 获取用户积分排行
  const topUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
    })
    .from(user)
    .orderBy(sql`${user.credits} desc`)
    .limit(10);

  return <CreditsTable 
    transactions={creditTransactions} 
    stats={stats[0]} 
    topUsers={topUsers}
  />;
}