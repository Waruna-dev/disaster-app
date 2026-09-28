import { Colors } from '../../constants/colors';

/** Design tokens for the District Officer web app — built on the app's existing green palette. */
export const O = {
  primary: Colors.primary, // #08775F
  primaryDark: '#0B3B36',
  sidebar: '#0B3B36',
  sidebarActive: 'rgba(255,255,255,0.12)',
  bg: '#F3F7F6',
  card: '#FFFFFF',
  border: '#E3ECE9',
  text: '#143D39',
  textMid: '#3B5A55',
  textMuted: '#7A918D',
  success: '#2E7D32',
  successBg: '#E6F4EA',
  warning: '#B7791F',
  warningBg: '#FFF4DC',
  danger: '#C62828',
  dangerBg: '#FCE8E8',
  info: '#1D6FC4',
  infoBg: '#E3F0FC',
  purple: '#7B3FA0',
  purpleBg: '#F1E7FB',
  neutral: '#647A76',
  neutralBg: '#EDF1F0',
  radius: 14,
  sidebarWidth: 248,
};

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'primary';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: O.success, bg: O.successBg },
  warning: { fg: O.warning, bg: O.warningBg },
  danger: { fg: O.danger, bg: O.dangerBg },
  info: { fg: O.info, bg: O.infoBg },
  purple: { fg: O.purple, bg: O.purpleBg },
  neutral: { fg: O.neutral, bg: O.neutralBg },
  primary: { fg: O.primary, bg: '#E3F3EE' },
};

const STATUS_TONE: Record<string, Tone> = {
  Available: 'success', Limited: 'warning', Full: 'danger', Closed: 'neutral',
  Pending: 'warning', Assigned: 'info', Rejected: 'danger', Completed: 'success',
  'On Mission': 'info', Unavailable: 'neutral', 'On the way': 'info', Pickup: 'purple',
  Active: 'danger', Expired: 'neutral', Cancelled: 'neutral',
  'In Progress': 'info', Success: 'success', Info: 'info',
  LOW: 'success', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger',
  High: 'danger', Medium: 'warning', Low: 'success',
};
export const toneFor = (status: string): Tone => STATUS_TONE[status] ?? 'neutral';

export const RISK_COLOR: Record<string, string> = {
  LOW: '#2E7D32', MEDIUM: '#F9A825', HIGH: '#E65100', CRITICAL: '#C62828',
};
