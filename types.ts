
export type Language = 'uz' | 'ru' | 'en';

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface DonationContent {
  title: string;
  desc: string;
  card: string;
  author: string;
}

export enum AppStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  ERROR = 'error'
}
