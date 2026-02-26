export const APP_NAME = "Khlus Trading Hub";

export const MAX_SERVER_MEMBERS = 500;
export const MAX_CHANNELS_PER_SERVER = 50;
export const MAX_CATEGORIES_PER_SERVER = 20;
export const MAX_ROLES_PER_SERVER = 25;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_VOICE_PARTICIPANTS = 50;
export const MAX_VIDEO_PARTICIPANTS = 50;
export const MAX_SCREEN_SHARE_VIEWERS = 50;

export const DEFAULT_CHANNEL_NAMES = {
  GENERAL: "genel-sohbet",
  ANNOUNCEMENTS: "duyurular",
  WELCOME: "hosgeldiniz",
} as const;

export const CHANNEL_TYPES = {
  TEXT: "text",
  VOICE: "voice",
  VIDEO: "video",
} as const;
