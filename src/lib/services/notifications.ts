export type OutboundNotification = {
  channel: "email" | "sms" | "in_app";
  to: string;
  title: string;
  body: string;
};

export interface NotificationService {
  send(notification: OutboundNotification): Promise<{ delivered: boolean; provider: string }>;
}

export const mockNotificationService: NotificationService = {
  async send(notification) {
    console.info("[notifications:mock]", notification.channel, notification.title);
    return { delivered: true, provider: "mock" };
  },
};

export function getNotificationService(): NotificationService {
  return mockNotificationService;
}
