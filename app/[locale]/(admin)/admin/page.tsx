import { db } from "@/lib/db";
import { user, payment, chatSession, creditLedger } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function AdminPage() {
  // 获取统计数据
  const [
    totalUsers,
    activeUsers,
    totalPayments,
    totalRevenue,
    totalChats,
    totalCreditsUsed
  ] = await Promise.all([
    // 总用户数
    db.select({ count: sql<number>`count(*)` }).from(user),
    
    // 活跃用户数（30天内）
    db.select({ count: sql<number>`count(*)` }).from(user)
      .where(sql`${user.updatedAt} > NOW() - INTERVAL '30 days'`),
    
    // 总支付次数
    db.select({ count: sql<number>`count(*)` }).from(payment),
    
    // 总收入（分）
    db.select({ total: sql<number>`COALESCE(sum(${payment.amountCents}), 0)` }).from(payment)
      .where(sql`${payment.status} = 'succeeded'`),
    
    // 总对话数
    db.select({ count: sql<number>`count(*)` }).from(chatSession),
    
    // 总积分消耗
    db.select({ total: sql<number>`COALESCE(sum(abs(${creditLedger.delta})), 0)` })
      .from(creditLedger)
      .where(sql`${creditLedger.delta} < 0`)
  ]);

  // 获取最近的用户
  const recentUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(sql`${user.createdAt} desc`)
    .limit(5);

  // 获取最近的支付
  const recentPayments = await db
    .select({
      id: payment.id,
      userId: payment.userId,
      userName: user.name,
      userEmail: user.email,
      amountCents: payment.amountCents,
      status: payment.status,
      type: payment.type,
      createdAt: payment.createdAt,
    })
    .from(payment)
    .leftJoin(user, sql`${payment.userId} = ${user.id}`)
    .orderBy(sql`${payment.createdAt} desc`)
    .limit(5);

  const stats = {
    totalUsers: totalUsers[0].count,
    activeUsers: activeUsers[0].count,
    totalPayments: totalPayments[0].count,
    totalRevenue: totalRevenue[0].total / 100, // 转换为元
    totalChats: totalChats[0].count,
    totalCreditsUsed: totalCreditsUsed[0].total,
  };

  return <AdminDashboard stats={stats} recentUsers={recentUsers} recentPayments={recentPayments} />;
}