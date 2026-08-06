import { notificationApi as sharedNotificationApi } from '@urbanmind/shared-api';

export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

export interface NotificationPage {
  items: Notification[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const notificationApi = {
  /** Paginated notification list, optionally filtered by read state */
  async list(pageNumber = 1, pageSize = 20, isRead?: boolean): Promise<NotificationPage> {
    return sharedNotificationApi.getNotifications(pageNumber, pageSize, isRead) as Promise<NotificationPage>;
  },

  /** Mark a single notification as read */
  async markRead(notificationId: string): Promise<void> {
    await sharedNotificationApi.markNotificationAsRead(notificationId);
  },

  /** Mark all notifications as read */
  async markAllRead(): Promise<void> {
    await sharedNotificationApi.markAllNotificationsAsRead();
  },
};
