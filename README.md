# 🎵 Accademia de "I Musici" - Sistema di Gestione

[![Status](https://img.shields.io/badge/status-operativo-success)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-red)](https://github.com)

Sistema completo di gestione per accademie musicali con app mobile-first, gestione utenti multi-ruolo, registro presenze, pagamenti e notifiche.

---

## 📋 Indice

- [Caratteristiche](#-caratteristiche)
- [Tecnologie](#-tecnologie)
- [Installazione](#-installazione)
- [Utilizzo](#-utilizzo)
- [Struttura Progetto](#-struttura-progetto)
- [API](#-api)
- [Database](#-database)
- [Credenziali di Test](#-credenziali-di-test)
- [Deployment](#-deployment)

---

## ✨ Caratteristiche

### 🎯 Funzionalità Principali

- **Sistema Multi-Ruolo:** Amministratori, Insegnanti e Allievi
- **Gestione Completa Utenti:** CRUD completo per tutti i tipi di utenti
- **Registro Presenze:** Tracciamento lezioni con stati (presente/assente/giustificato)
- **Gestione Pagamenti:** Sistema automatico per pagamenti mensili e compensi insegnanti
- **Sistema Notifiche:** Comunicazioni mirate per ruolo o utente specifico
- **Gestione Corsi:** Organizzazione per strumento musicale
- **Dashboard Statistiche:** KPI e metriche in tempo reale
- **App Mobile-First:** Ottimizzata per dispositivi mobili con Expo

### 🔐 Sicurezza

- Autenticazione JWT con refresh token
- Password hashate con bcrypt
- Autenticazione a 2 fattori per amministratori (PIN + Google OAuth)
- Controllo accessi basato su ruoli (RBAC)
- Cookie sicuri con flag httpOnly

---

## 🛠 Tecnologie

### Frontend
- **Framework:** Expo (React Native)
- **Routing:** Expo Router (file-based routing)
- **State Management:** Zustand + React Context
- **HTTP Client:** Axios
- **UI:** React Native Components + Ionicons
- **Storage:** AsyncStorage

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB (Motor driver async)
- **Autenticazione:** JWT (python-jose) + OAuth2
- **Password:** bcrypt + passlib
- **Validation:** Pydantic v2
- **CORS:** Configurato per cross-origin requests

### Infrastruttura
- **Process Manager:** Supervisor
- **Reverse Proxy:** Nginx (per routing API)
- **Database:** MongoDB standalone
- **Package Manager:** Yarn (frontend) + pip (backend)

---

## 📦 Installazione

### Prerequisiti
- Node.js 18+
- Python 3.11+
- MongoDB 5.0+
- Yarn 1.22+

### Setup Backend

```bash
cd backend

# Crea virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure
venv\Scripts\activate  # Windows

# Installa dipendenze
pip install -r requirements.txt

# Configura .env
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="accademia_musici"
SECRET_KEY="your-secret-key-change-in-production"
EOF

# Popola database con dati di test
python seed_data.py

# Avvia server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Setup Frontend

```bash
cd frontend

# Installa dipendenze
yarn install

# Configura .env
cat > .env << EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_PACKAGER_HOSTNAME=localhost
EXPO_PACKAGER_PROXY_URL=http://localhost:3000
EOF

# Avvia Expo
yarn start
```

---

## 🚀 Utilizzo

### Accesso all'Applicazione

1. Apri l'app su `http://localhost:3000` (web) oppure scansiona il QR code con Expo Go
2. Seleziona il tipo di utente (Amministratore/Insegnante/Allievo)
3. Inserisci le credenziali (vedi sezione [Credenziali](#-credenziali-di-test))
4. Esplora le funzionalità disponibili per il tuo ruolo

### Comandi Utili

```bash
# Backend
cd backend
python seed_data.py              # Ripopola database
uvicorn server:app --reload      # Dev server con hot-reload

# Frontend
cd frontend
yarn start                       # Avvia Expo
yarn build                       # Build produzione
yarn lint                        # Lint TypeScript

# Services (con Supervisor)
sudo supervisorctl status        # Stato servizi
sudo supervisorctl restart all   # Riavvia tutti
sudo supervisorctl restart backend  # Riavvia solo backend
sudo supervisorctl restart expo     # Riavvia solo frontend
```

---

## 📁 Struttura Progetto

```
app/
├── backend/
│   ├── server.py              # FastAPI app principale
│   ├── seed_data.py           # Script popolamento DB
│   ├── requirements.txt       # Dipendenze Python
│   └── .env                   # Configurazione ambiente
│
├── frontend/
│   ├── app/                   # Routes Expo Router
│   │   ├── index.tsx          # Login page
│   │   ├── _layout.tsx        # Root layout
│   │   └── (tabs)/            # Tab navigation
│   │       ├── _layout.tsx    # Tabs layout
│   │       ├── index.tsx      # Home/Dashboard
│   │       ├── users.tsx      # Gestione utenti (admin)
│   │       ├── attendance.tsx # Registro presenze
│   │       ├── payments.tsx   # Pagamenti
│   │       └── notifications.tsx  # Notifiche
│   │
│   ├── src/
│   │   ├── components/        # Componenti riutilizzabili
│   │   ├── contexts/          # React Contexts (Auth)
│   │   ├── services/          # API clients
│   │   └── types/             # TypeScript types
│   │
│   ├── package.json           # Dipendenze Node
│   ├── tsconfig.json          # Config TypeScript
│   ├── app.json               # Config Expo
│   └── .env                   # Variabili ambiente
│
├── GUIDA_ACCESSO.md           # Documentazione accesso
└── README.md                  # Questo file
```

---

## 🔌 API

### Endpoints Principali

#### Autenticazione
- `POST /api/auth/login` - Login standard (email + password)
- `POST /api/auth/admin/pin` - Verifica PIN admin
- `POST /api/auth/admin/google` - Verifica Google OAuth admin
- `GET /api/auth/me` - Ottieni utente corrente
- `POST /api/auth/logout` - Logout

#### Utenti (Admin)
- `GET /api/utenti` - Lista utenti (filtri: ruolo, attivo)
- `GET /api/utenti/{id}` - Dettaglio utente
- `POST /api/utenti` - Crea utente
- `PUT /api/utenti/{id}` - Aggiorna utente
- `DELETE /api/utenti/{id}` - Elimina utente

#### Presenze
- `GET /api/presenze` - Lista presenze (filtri: allievo, date)
- `POST /api/presenze` - Registra presenza
- `PUT /api/presenze/{id}` - Modifica presenza (solo admin)
- `DELETE /api/presenze/{id}` - Elimina presenza

#### Pagamenti
- `GET /api/pagamenti` - Lista pagamenti
- `POST /api/pagamenti` - Crea pagamento
- `PUT /api/pagamenti/{id}` - Aggiorna pagamento
- `DELETE /api/pagamenti/{id}` - Elimina pagamento

#### Notifiche
- `GET /api/notifiche` - Lista notifiche
- `POST /api/notifiche` - Crea notifica
- `PUT /api/notifiche/{id}` - Aggiorna notifica
- `DELETE /api/notifiche/{id}` - Elimina notifica

#### Statistiche
- `GET /api/stats/admin` - Dashboard admin

#### Automazione
- `POST /api/automazioni/crea-pagamenti-mensili` - Genera pagamenti mese
- `POST /api/automazioni/aggiorna-pagamenti-scaduti` - Aggiorna stati
- `POST /api/automazioni/avvisi-pagamento` - Invia promemoria

### Autenticazione API

```typescript
// Header per richieste autenticate
Authorization: Bearer {token}

// Oppure cookie automatico
Cookie: session_token={token}
```

---

## 💾 Database

### Collections MongoDB

- **utenti** - Anagrafica utenti (admin, insegnanti, allievi)
- **accesso_amministrazione** - PIN e Google ID per admin
- **sessioni** - Sessioni attive JWT
- **allievi_dettaglio** - Dettagli specifici allievi
- **insegnanti_dettaglio** - Dettagli specifici insegnanti
- **corsi** - Corsi per strumento
- **lezioni** - Calendario lezioni
- **presenze** - Registro presenze
- **pagamenti** - Pagamenti e compensi
- **notifiche** - Sistema notifiche
- **compiti** - Compiti assegnati
- **compensi** - Quote insegnanti
- **impostazioni** - Configurazione sistema

### Modelli Dati Principali

```python
# Utente
{
  "id": "uuid",
  "ruolo": "amministratore | insegnante | allievo",
  "nome": "string",
  "cognome": "string",
  "email": "string",
  "password_hash": "string",
  "attivo": boolean,
  "data_creazione": datetime
}

# Presenza
{
  "id": "uuid",
  "allievo_id": "uuid",
  "insegnante_id": "uuid",
  "data": datetime,
  "stato": "presente | assente | giustificato",
  "note": "string"
}

# Pagamento
{
  "id": "uuid",
  "utente_id": "uuid",
  "tipo": "mensile | annuale | compenso_insegnante",
  "importo": float,
  "data_scadenza": datetime,
  "stato": "in_attesa | pagato | scaduto"
}
```

---

## 🔑 Credenziali di Test

### Amministratore
```
Email: acc.imusici@gmail.com
Password: Accademia2026
PIN: 1234
```

### Insegnanti
```
Email: [mario.rossi | lucia.bianchi | paolo.verdi | anna.neri]@musici.it
Password: teacher123
```

### Allievi
```
Email: [giulia.ferrari | marco.romano | sara.conti | luca.esposito | anna.bruno]@email.it
Password: student123
```

⚠️ **IMPORTANTE:** Cambiare tutte le credenziali in produzione!

---

## 🌍 Deployment

### Requisiti Produzione

- Server con Docker o VM
- MongoDB Atlas o MongoDB self-hosted
- Domini e certificati SSL
- Environment variables sicure
- Backup automatici database

### Variables Ambiente Produzione

```bash
# Backend
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net"
DB_NAME="accademia_production"
SECRET_KEY="strong-random-secret-key"

# Frontend
EXPO_PUBLIC_BACKEND_URL="https://api.yourdomain.com"
```

### Checklist Pre-Produzione

- [ ] Cambiare tutte le credenziali di default
- [ ] Configurare backup automatici MongoDB
- [ ] Attivare HTTPS con certificati validi
- [ ] Configurare CORS con domini specifici
- [ ] Impostare rate limiting su API
- [ ] Configurare logging e monitoring
- [ ] Test completo funzionalità
- [ ] Piano di disaster recovery

---

## 📄 Licenza

Proprietaria - © 2025 Accademia de "I Musici"

---

## 📞 Supporto

Per assistenza tecnica o bug:
- Email: acc.imusici@gmail.com
- Documentazione: [GUIDA_ACCESSO.md](./GUIDA_ACCESSO.md)

---

**Versione:** 1.0.0  
**Data Rilascio:** 8 Gennaio 2025  
**Ultimo Aggiornamento:** 8 Gennaio 2025
