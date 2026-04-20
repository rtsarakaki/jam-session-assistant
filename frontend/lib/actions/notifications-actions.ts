"use server";

import { revalidatePath } from "next/cache";
import { listMyNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/platform";
import type { AppNotificationItem } from "@/lib/platform";

export async function loadMyNotificationsAction(limit = 30): Promise<{
  error: string | null;
  items?: AppNotificationItem[];
  unreadCount?: number;
}> {
  try {
    const { items, unreadCount } = await listMyNotifications(limit);
    return { error: null, items, unreadCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load notifications.";
    return { error: message };
  }
}

export async function markNotificationReadAction(notificationId: string): Promise<{ error: string | null }> {
  try {
    await markNotificationRead(notificationId);
    revalidatePath("/app");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not mark notification as read.";
    return { error: message };
  }
}

export async function markAllNotificationsReadAction(): Promise<{ error: string | null }> {
  try {
    await markAllNotificationsRead();
    revalidatePath("/app");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not mark all notifications as read.";
    return { error: message };
  }
}
