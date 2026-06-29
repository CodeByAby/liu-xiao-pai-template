import { db } from "@/lib/db";
import { subscription, user } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { SubscriptionsTable } from "@/features/admin/components/subscriptions-table";

export default async function AdminSubscriptionsPage() {
  // 获取所有订阅
  const subscriptions = await db
    .select({
      id: subscription.id,
      userId: subscription.userId,
      userName: user.name,
      userEmail: user.email,
      planKey: subscription.planKey,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    })
    .from(subscription)
    .leftJoin(user, sql`${subscription.userId} = ${user.id}`)
    .orderBy(sql`${subscription.createdAt} desc`);

  // 统计数据
  const stats = await db
    .select({
      totalSubscriptions: sql<number>`count(*)`,
      activeSubscriptions: sql<number>`count(case when ${subscription.status} = 'active' then 1 end)`,
      canceledSubscriptions: sql<number>`count(case when ${subscription.status} = 'canceled' then 1 end)`,
      expiredSubscriptions: sql<number>`count(case when ${subscription.status} = 'expired' then 1 end)`,
    })
    .from(subscription);

  return <SubscriptionsTable subscriptions={subscriptions} stats={stats[0]} />;
}