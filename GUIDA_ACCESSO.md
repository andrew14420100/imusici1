# 🎵 Accademia de "I Musici" - Guida di Accesso

## 🌐 URL DELL'APPLICAZIONE

L'applicazione è ora attiva e accessibile tramite:

**URL Web (Desktop/Mobile):**  
Usa l'URL fornito da Emergent Agent per accedere all'app

**Backend API:**  
L'API è disponibile all'endpoint `/api` dello stesso dominio

---

## 👤 CREDENZIALI DI ACCESSO

### 🔐 Amministratore
- **Email:** acc.imusici@gmail.com
- **Password:** Accademia2026
- **PIN:** 1234 (per funzionalità avanzate)
- **Funzioni:** 
  - Gestione completa degli utenti (crea, modifica, elimina)
  - Gestione corsi e lezioni
  - Registro presenze
  - Gestione pagamenti
  - Invio notifiche
  - Statistiche complete

### 👨‍🏫 Insegnanti

1. **Mario Rossi** (Pianoforte)
   - Email: mario.rossi@musici.it
   - Password: teacher123
   - Strumento: Pianoforte

2. **Lucia Bianchi** (Violino)
   - Email: lucia.bianchi@musici.it
   - Password: teacher123
   - Strumento: Violino

3. **Paolo Verdi** (Chitarra)
   - Email: paolo.verdi@musici.it
   - Password: teacher123
   - Strumento: Chitarra

4. **Anna Neri** (Canto)
   - Email: anna.neri@musici.it
   - Password: teacher123
   - Strumento: Canto

**Funzioni Insegnanti:**
- Visualizzazione allievi assegnati
- Registro presenze lezioni
- Gestione compiti
- Visualizzazione compensi

### 🎓 Allievi

1. **Giulia Ferrari** (Pianoforte)
   - Email: giulia.ferrari@email.it
   - Password: student123

2. **Marco Romano** (Pianoforte)
   - Email: marco.romano@email.it
   - Password: student123

3. **Sara Conti** (Violino)
   - Email: sara.conti@email.it
   - Password: student123

4. **Luca Esposito** (Chitarra)
   - Email: luca.esposito@email.it
   - Password: student123

5. **Anna Bruno** (Canto)
   - Email: anna.bruno@email.it
   - Password: student123

**Funzioni Allievi:**
- Visualizzazione corsi
- Registro presenze personale
- Visualizzazione pagamenti
- Ricezione notifiche
- Visualizzazione compiti

---

## 📱 COME ACCEDERE

1. Apri il browser e vai all'URL fornito
2. Seleziona il tipo di utente (Amministratore/Insegnante/Allievo)
3. Inserisci email e password
4. Clicca su "Accedi"

---

## 🔧 FUNZIONALITÀ PRINCIPALI

### Per Amministratori:
- ✅ **Dashboard completa** con statistiche in tempo reale
- ✅ **Gestione utenti** (amministratori, insegnanti, allievi)
- ✅ **Gestione corsi** per strumento
- ✅ **Registro presenze** con stati (presente, assente, giustificato)
- ✅ **Gestione pagamenti** (mensili, annuali, compensi insegnanti)
- ✅ **Sistema notifiche** con filtri destinatari
- ✅ **Statistiche e report**

### Per Insegnanti:
- ✅ **Visualizzazione allievi** assegnati per strumento
- ✅ **Registro presenze** con gestione recuperi
- ✅ **Gestione compiti** per gli allievi
- ✅ **Visualizzazione compensi** in base alle presenze

### Per Allievi:
- ✅ **Area personale** con info corsi
- ✅ **Visualizzazione presenze** personali
- ✅ **Stato pagamenti** e scadenze
- ✅ **Notifiche** dall'accademia
- ✅ **Compiti assegnati** dagli insegnanti

---

## 🛠️ INFORMAZIONI TECNICHE

### Stack Tecnologico:
- **Frontend:** Expo React Native (Mobile-first, responsive)
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Autenticazione:** JWT con cookie/Bearer token

### Architettura:
- **Mobile App:** Ottimizzata per dispositivi mobili con navigazione tab-based
- **API RESTful:** Endpoint organizzati per ruolo utente
- **Database NoSQL:** MongoDB per flessibilità nella gestione dati

### Sicurezza:
- Password hashate con bcrypt
- Sessioni JWT con scadenza 7 giorni
- Autenticazione a 2 fattori per amministratori (PIN + Google)
- Controllo accessi basato su ruoli (RBAC)

---

## 🎨 STRUMENTI DISPONIBILI

L'accademia supporta i seguenti strumenti musicali:

1. 🎹 **Pianoforte**
2. 🎤 **Canto**
3. 🥁 **Percussioni**
4. 🎻 **Violino**
5. 🎸 **Chitarra**
6. ⚡ **Chitarra Elettrica**

---

## 📊 FUNZIONALITÀ AVANZATE

### Automazione Pagamenti
- Creazione automatica pagamenti mensili per tutti gli allievi
- Aggiornamento automatico pagamenti scaduti
- Promemoria pagamenti in scadenza

### Calcolo Compensi Insegnanti
- Compenso basato su presenze effettive
- Regole:
  - ✅ Presente = pagato
  - ✅ Assente = pagato
  - ❌ Giustificato = NON pagato
  - ✅ Recupero = pagato nella data di recupero

### Sistema Notifiche
- Notifiche generali per tutti
- Notifiche mirate per ruolo
- Notifiche automatiche per pagamenti in scadenza
- Filtri personalizzabili per destinatari

---

## 📝 NOTE IMPORTANTI

- ⚠️ Le credenziali di test devono essere cambiate in produzione
- 🔒 L'app utilizza HTTPS e cookie sicuri
- 📱 Ottimizzata per dispositivi mobili ma funziona anche su desktop
- 🌐 Supporta accesso da qualsiasi dispositivo con browser moderno

---

## 🆘 SUPPORTO

In caso di problemi:
1. Verifica le credenziali di accesso
2. Controlla la connessione internet
3. Contatta l'amministrazione per assistenza tecnica
4. Per bug o problemi tecnici, controlla i log del sistema

---

## 🔄 AGGIORNAMENTI E MANUTENZIONE

### Database:
Per ripopolare il database con i dati di test:
```bash
cd /app/backend
python seed_data.py
```

### Servizi:
Per riavviare i servizi:
```bash
# Backend
sudo supervisorctl restart backend

# Frontend
sudo supervisorctl restart expo

# Tutti i servizi
sudo supervisorctl restart all
```

---

**Data creazione:** 8 Gennaio 2025  
**Versione:** 1.0.0  
**Stato:** ✅ OPERATIVO

---

© 2025 Accademia de "I Musici" - Tutti i diritti riservati
