"use server";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: string) {
  // 检查权限
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    throw new Error("Unauthorized");
  }

  // 更新用户角色
  await db
    .update(user)
    .set({ 
      role: newRole,
      updatedAt: new Date()
    })
    .where(eq(user.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}

export async function banUser(userId: string, banned: boolean, reason?: string) {
  // 检查权限
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    throw new Error("Unauthorized");
  }

  // 更新用户禁用状态
  await db
    .update(user)
    .set({ 
      banned,
      banReason: banned ? reason : null,
      banExpires: null, // 可以扩展支持临时禁用
      updatedAt: new Date()
    })
    .where(eq(user.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserCredits(userId: string, credits: number) {
  // 检查权限
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    throw new Error("Unauthorized");
  }

  // 确保积分不为负数
  if (credits < 0) {
    throw new Error("Credits cannot be negative");
  }

  // 更新用户积分
  await db
    .update(user)
    .set({ 
      credits,
      updatedAt: new Date()
    })
    .where(eq(user.id, userId));

  // TODO: 可以在这里添加积分变更日志到 creditLedger 表

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  // 检查权限
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    throw new Error("Unauthorized");
  }

  // 注意：由于外键约束，删除用户会级联删除相关数据
  // 建议使用软删除（banned状态）而不是真正删除
  await db
    .delete(user)
    .where(eq(user.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}