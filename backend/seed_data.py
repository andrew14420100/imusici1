"""
Script per popolare il database con utenti di test per l'Accademia de 'I Musici'
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

async def seed_database():
    """Popola il database con utenti e dati di test"""
    print("🌱 Inizio popolamento database...")
    
    # Clear existing data
    await db.utenti.delete_many({})
    await db.accesso_amministrazione.delete_many({})
    await db.allievi_dettaglio.delete_many({})
    await db.insegnanti_dettaglio.delete_many({})
    await db.sessioni.delete_many({})
    await db.corsi.delete_many({})
    await db.presenze.delete_many({})
    await db.pagamenti.delete_many({})
    await db.notifiche.delete_many({})
    await db.compiti.delete_many({})
    await db.lezioni.delete_many({})
    await db.compensi.delete_many({})
    print("✅ Database pulito")
    
    # 1. AMMINISTRATORE
    admin_id = str(uuid.uuid4())
    admin_user = {
        "id": admin_id,
        "ruolo": "amministratore",
        "nome": "Admin",
        "cognome": "Accademia",
        "email": "acc.imusici@gmail.com",
        "password_hash": hash_password("Accademia2026"),
        "data_nascita": None,
        "attivo": True,
        "first_login": False,
        "data_creazione": datetime.now(timezone.utc),
        "ultimo_accesso": None,
        "note_admin": "Amministratore principale"
    }
    await db.utenti.insert_one(admin_user)
    
    # Admin access (PIN + Google)
    admin_access = {
        "id": str(uuid.uuid4()),
        "utente_id": admin_id,
        "pin_hash": hash_password("1234"),  # PIN di default
        "pin_attivo": True,
        "google_id": None,
        "ultimo_accesso": None
    }
    await db.accesso_amministrazione.insert_one(admin_access)
    print(f"✅ Amministratore creato: acc.imusici@gmail.com / Accademia2026")
    
    # 2. INSEGNANTI
    teachers = [
        {"nome": "Mario", "cognome": "Rossi", "email": "mario.rossi@musici.it", "strumento": "pianoforte"},
        {"nome": "Lucia", "cognome": "Bianchi", "email": "lucia.bianchi@musici.it", "strumento": "violino"},
        {"nome": "Paolo", "cognome": "Verdi", "email": "paolo.verdi@musici.it", "strumento": "chitarra"},
        {"nome": "Anna", "cognome": "Neri", "email": "anna.neri@musici.it", "strumento": "canto"},
    ]
    
    teacher_ids = {}
    for teacher in teachers:
        teacher_id = str(uuid.uuid4())
        teacher_ids[teacher["strumento"]] = teacher_id
        
        user = {
            "id": teacher_id,
            "ruolo": "insegnante",
            "nome": teacher["nome"],
            "cognome": teacher["cognome"],
            "email": teacher["email"],
            "password_hash": hash_password("teacher123"),
            "data_nascita": None,
            "attivo": True,
            "first_login": False,
            "data_creazione": datetime.now(timezone.utc),
            "ultimo_accesso": None,
            "note_admin": None,
            "strumento": teacher["strumento"]
        }
        await db.utenti.insert_one(user)
        
        # Teacher detail
        teacher_detail = {
            "id": str(uuid.uuid4()),
            "utente_id": teacher_id,
            "specializzazione": teacher["strumento"],
            "compenso_orario": 30.0,
            "note": None
        }
        await db.insegnanti_dettaglio.insert_one(teacher_detail)
        
        print(f"✅ Insegnante creato: {teacher['email']} / teacher123 ({teacher['strumento']})")
    
    # 3. ALLIEVI
    students = [
        {"nome": "Giulia", "cognome": "Ferrari", "email": "giulia.ferrari@email.it", "strumento": "pianoforte"},
        {"nome": "Marco", "cognome": "Romano", "email": "marco.romano@email.it", "strumento": "pianoforte"},
        {"nome": "Sara", "cognome": "Conti", "email": "sara.conti@email.it", "strumento": "violino"},
        {"nome": "Luca", "cognome": "Esposito", "email": "luca.esposito@email.it", "strumento": "chitarra"},
        {"nome": "Anna", "cognome": "Bruno", "email": "anna.bruno@email.it", "strumento": "canto"},
    ]
    
    for student in students:
        student_id = str(uuid.uuid4())
        
        user = {
            "id": student_id,
            "ruolo": "allievo",
            "nome": student["nome"],
            "cognome": student["cognome"],
            "email": student["email"],
            "password_hash": hash_password("student123"),
            "data_nascita": "2005-01-01",
            "attivo": True,
            "first_login": False,
            "data_creazione": datetime.now(timezone.utc),
            "ultimo_accesso": None,
            "note_admin": None,
            "insegnante_id": teacher_ids.get(student["strumento"])
        }
        await db.utenti.insert_one(user)
        
        # Student detail
        student_detail = {
            "id": str(uuid.uuid4()),
            "utente_id": student_id,
            "telefono": "3331234567",
            "data_nascita": "2005-01-01",
            "corso_principale": student["strumento"],
            "note": None
        }
        await db.allievi_dettaglio.insert_one(student_detail)
        
        print(f"✅ Allievo creato: {student['email']} / student123 ({student['strumento']})")
    
    # 4. CORSI
    for strumento, teacher_id in teacher_ids.items():
        corso_id = str(uuid.uuid4())
        corso = {
            "id": corso_id,
            "nome": f"Corso di {strumento.capitalize()}",
            "strumento": strumento,
            "insegnante_id": teacher_id,
            "descrizione": f"Corso completo di {strumento}",
            "attivo": True,
            "data_creazione": datetime.now(timezone.utc)
        }
        await db.corsi.insert_one(corso)
        print(f"✅ Corso creato: {strumento}")
    
    print("\n🎉 Database popolato con successo!")
    print("\n📋 CREDENZIALI DI ACCESSO:")
    print("\n🔐 Amministratore:")
    print("   Email: acc.imusici@gmail.com")
    print("   Password: Accademia2026")
    print("   PIN: 1234")
    print("\n👨‍🏫 Insegnanti:")
    print("   Email: [nome].[cognome]@musici.it")
    print("   Password: teacher123")
    print("\n🎓 Allievi:")
    print("   Email: [nome].[cognome]@email.it")
    print("   Password: student123")

if __name__ == "__main__":
    asyncio.run(seed_database())
