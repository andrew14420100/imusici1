import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Attendance, Assignment, Payment, Notification, AdminStats } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth - Student/Teacher login (email + password)
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  // Admin 2-factor: Step 1 - PIN verification
  adminPinVerify: async (email: string, pin: string) => {
    const response = await api.post('/auth/admin/pin', { email, pin });
    return response.data;
  },
  
  // Admin 2-factor: Step 2 - Google verification
  adminGoogleVerify: async (email: string, sessionId: string) => {
    const response = await api.post('/auth/admin/google', { email, session_id: sessionId });
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data as User;
  },
  
  logout: async () => {
    await api.post('/auth/logout');
  },
};

// Users (Admin only)
export const usersApi = {
  getAll: async (ruolo?: string, attivo?: boolean) => {
    const params = new URLSearchParams();
    if (ruolo) params.append('ruolo', ruolo);
    if (attivo !== undefined) params.append('attivo', String(attivo));
    const response = await api.get(`/utenti?${params}`);
    return response.data as User[];
  },
  get: async (userId: string) => {
    const response = await api.get(`/utenti/${userId}`);
    return response.data as User;
  },
  create: async (data: { 
    ruolo: string; 
    nome: string; 
    cognome: string; 
    email: string; 
    password: string;
    note_admin?: string;
  }) => {
    const response = await api.post('/utenti', data);
    return response.data as User;
  },
  update: async (userId: string, data: Partial<User> & { password?: string }) => {
    const response = await api.put(`/utenti/${userId}`, data);
    return response.data as User;
  },
  delete: async (userId: string) => {
    await api.delete(`/utenti/${userId}`);
  },
  // Student detail
  updateStudentDetail: async (userId: string, data: {
    telefono?: string;
    data_nascita?: string;
    corso_principale?: string;
    note?: string;
  }) => {
    const response = await api.post(`/utenti/${userId}/dettaglio-allievo`, data);
    return response.data;
  },
  // Teacher detail
  updateTeacherDetail: async (userId: string, data: {
    specializzazione?: string;
    compenso_orario?: number;
    note?: string;
  }) => {
    const response = await api.post(`/utenti/${userId}/dettaglio-insegnante`, data);
    return response.data;
  },
  // Check duplicates
  checkDuplicates: async (data: {
    email?: string;
    nome?: string;
    cognome?: string;
    data_nascita?: string;
  }) => {
    const params = new URLSearchParams();
    if (data.email) params.append('email', data.email);
    if (data.nome) params.append('nome', data.nome);
    if (data.cognome) params.append('cognome', data.cognome);
    if (data.data_nascita) params.append('data_nascita', data.data_nascita);
    const response = await api.get(`/utenti/check-duplicates?${params}`);
    return response.data as { exists: boolean; message?: string };
  },
};

// Attendance
export const attendanceApi = {
  getAll: async (filters?: {
    allievo_id?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await api.get(`/presenze?${params}`);
    return response.data as Attendance[];
  },
  create: async (data: {
    allievo_id: string;
    data: string;
    stato: string;
    note?: string;
  }) => {
    const response = await api.post('/presenze', data);
    return response.data as Attendance;
  },
  update: async (attendanceId: string, data: { stato?: string; note?: string }) => {
    const response = await api.put(`/presenze/${attendanceId}`, data);
    return response.data as Attendance;
  },
  delete: async (attendanceId: string) => {
    await api.delete(`/presenze/${attendanceId}`);
  },
};

// Assignments
export const assignmentsApi = {
  getAll: async (filters?: {
    allievo_id?: string;
    completato?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await api.get(`/compiti?${params}`);
    return response.data as Assignment[];
  },
  create: async (data: {
    allievo_id: string;
    titolo: string;
    descrizione: string;
    data_scadenza: string;
  }) => {
    const response = await api.post('/compiti', data);
    return response.data as Assignment;
  },
  update: async (assignmentId: string, data: Partial<Assignment>) => {
    const response = await api.put(`/compiti/${assignmentId}`, data);
    return response.data as Assignment;
  },
  delete: async (assignmentId: string) => {
    await api.delete(`/compiti/${assignmentId}`);
  },
};

// Payments
export const paymentsApi = {
  getAll: async (filters?: {
    utente_id?: string;
    tipo?: string;
    stato?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await api.get(`/pagamenti?${params}`);
    return response.data as Payment[];
  },
  create: async (data: {
    utente_id: string;
    tipo: string;
    importo: number;
    descrizione: string;
    data_scadenza: string;
  }) => {
    const response = await api.post('/pagamenti', data);
    return response.data as Payment;
  },
  update: async (paymentId: string, data: Partial<Payment>) => {
    const response = await api.put(`/pagamenti/${paymentId}`, data);
    return response.data as Payment;
  },
  delete: async (paymentId: string) => {
    await api.delete(`/pagamenti/${paymentId}`);
  },
};

// Notifications
export const notificationsApi = {
  getAll: async (attivoOnly: boolean = true) => {
    const response = await api.get(`/notifiche?attivo_only=${attivoOnly}`);
    return response.data as Notification[];
  },
  create: async (data: {
    titolo: string;
    messaggio: string;
    tipo?: string;
    destinatari_tipo?: string;
    destinatari_ids?: string[];
    filtro_pagamento?: string;
  }) => {
    const response = await api.post('/notifiche', data);
    return response.data as Notification;
  },
  update: async (notificationId: string, data: Partial<Notification>) => {
    const response = await api.put(`/notifiche/${notificationId}`, data);
    return response.data as Notification;
  },
  delete: async (notificationId: string) => {
    await api.delete(`/notifiche/${notificationId}`);
  },
};

// Teacher specific
export const teacherApi = {
  getStudents: async () => {
    const response = await api.get('/insegnante/allievi');
    return response.data as User[];
  },
};

// Stats
export const statsApi = {
  getAdminStats: async () => {
    const response = await api.get('/stats/admin');
    return response.data as AdminStats;
  },
};

// Seed
export const seedApi = {
  seed: async () => {
    const response = await api.post('/seed');
    return response.data;
  },
};

export default api;
