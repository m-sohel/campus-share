import { getSupabaseAdminClient } from "../client";
import { Notification, NotificationType } from "@/types";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
}

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      link: params.link || null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data as Notification;
}

/**
 * Fetches recent notifications for a user, ordered by creation time descending.
 */
export async function getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data as Notification[];
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}
