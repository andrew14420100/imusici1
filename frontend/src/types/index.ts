export enum UserRole {
  ADMIN = 'amministratore',
  TEACHER = 'insegnante',
  STUDENT = 'allievo'
}

export enum AttendanceStatus {
  PRESENT = 'presente',
  ABSENT = 'assente',
  JUSTIFIED = 'giustificato'
}

export enum PaymentStatus {
  PENDING = 'in_attesa',
  PAID = 'pagato',
  OVERDUE = 'scaduto'
}

export enum PaymentType {
  MONTHLY = 'mensile',
  ANNUAL = 'annuale',
  TEACHER_COMPENSATION = 'compenso_insegnante'
}

export enum NotificationType {
  GENERAL = 'generale',
  PAYMENT = 'pagamento',
  LESSON = 'lezione'
}

export enum RecipientType {
  ALL = 'tutti',
  SPECIFIC = 'singoli'
}

export const INSTRUMENTS = [
  { value: 'pianoforte', label: 'Pianoforte', icon: 'musical-notes' },
  { value: 'canto', label: 'Canto', icon: 'mic' },
  { value: 'percussioni', label: 'Percussioni', icon: 'disc' },
  { value: 'violino', label: 'Violino', icon: 'musical-note' },
  { value: 'chitarra', label: 'Chitarra', icon: 'musical-notes' },
  { value: 'chitarra_elettrica', label: 'Chitarra Elettrica', icon: 'flash' },
] as const;

export interface UserDetail {
  id: string;
  utente_id: string;
  // Student fields
  telefono?: string;
  data_nascita?: string;
  corso_principale?: string;
  // Teacher fields
  specializzazione?: string;
  compenso_orario?: number;
  note?: string;
}

export interface User {
  id: string;
  ruolo: UserRole | string;
  nome: string;
  cognome: string;
  email: string;
  attivo: boolean;
  first_login?: boolean;
  data_nascita?: string;
  data_creazione?: string;
  ultimo_accesso?: string;
  note_admin?: string;
  dettaglio?: UserDetail;
  // Legacy/compatibility fields
  name?: string;
  picture?: string;
}

export interface Course {
  id: string;
  nome: string;
  strumento: string;
  insegnante_id: string;
  descrizione?: string;
  attivo: boolean;
  data_creazione: string;
  insegnante?: { nome: string; cognome: string };
}

export interface Lesson {
  id: string;
  corso_id: string;
  insegnante_id: string;
  data: string;
  ora: string;
  durata: number;
  note?: string;
  data_creazione: string;
  corso?: { nome: string; strumento: string };
  insegnante?: { nome: string; cognome: string };
}

export interface Attendance {
  id: string;
  corso_id?: string;
  lezione_id?: string;
  allievo_id: string;
  insegnante_id: string;
  data: string;
  stato: AttendanceStatus | string;
  recupero_data?: string;
  note?: string;
  data_creazione: string;
}

export interface TeacherCompensation {
  id: string;
  insegnante_id: string;
  corso_id?: string;
  quota_per_presenza: number;
  data_creazione: string;
}

export interface Assignment {
  id: string;
  insegnante_id: string;
  allievo_id: string;
  titolo: string;
  descrizione: string;
  data_scadenza: string;
  completato: boolean;
  data_creazione: string;
}

export interface Payment {
  id: string;
  utente_id: string;
  tipo: PaymentType | string;
  importo: number;
  descrizione: string;
  data_scadenza: string;
  stato: PaymentStatus | string;
  data_pagamento?: string;
  data_inizio_validita?: string;
  data_fine_validita?: string;
  tolleranza_giorni?: number;
  visibile_utente: boolean;
  data_creazione: string;
}

export interface Notification {
  notification_id?: string; // Legacy
  id: string;
  titolo: string;
  title?: string; // Legacy
  messaggio: string;
  message?: string; // Legacy
  tipo: string;
  notification_type?: string; // Legacy
  destinatari_tipo?: string;
  destinatari_ids: string[];
  recipient_ids?: string[]; // Legacy
  filtro_pagamento?: string;
  attivo: boolean;
  is_active?: boolean; // Legacy
  data_creazione: string;
  created_at?: string; // Legacy
}

export interface AdminStats {
  allievi_attivi: number;
  insegnanti_attivi: number;
  pagamenti_non_pagati: number;
  notifiche_attive: number;
  presenze_oggi: number;
  corsi_attivi?: number;
}

export interface Settings {
  payment_due_day: number;
  payment_tolerance_days: number;
  default_monthly_fee: number;
  annual_reminder_days: number;
}
