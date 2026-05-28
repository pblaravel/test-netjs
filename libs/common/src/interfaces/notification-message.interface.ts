export interface NotificationMessage {
  id: string;
  eventId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  metadata?: Record<string, unknown>;
  createdAt: string;
}
