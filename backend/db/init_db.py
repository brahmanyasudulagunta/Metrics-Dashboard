import os
import logging
from .database import engine, SessionLocal
from .models import Base, User
from api.security import hash_password

logger = logging.getLogger(__name__)

DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

def init_db():
    """Create tables and seed default admin user."""
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        default_pw = os.getenv("ADMIN_PASSWORD", "admin")

        if not admin:
            # First boot — create admin
            admin = User(
                username="admin",
                hashed_password=hash_password(default_pw),
                must_change_password=not DEV_MODE  # Skip change-password in dev
            )
            db.add(admin)
            db.commit()
            logger.info("Created default admin user.")
        elif DEV_MODE:
            # Dev mode — always reset password to env var value
            admin.hashed_password = hash_password(default_pw)
            admin.must_change_password = False
            db.commit()
            logger.info("DEV_MODE: Reset admin password to ADMIN_PASSWORD env var.")
        else:
            logger.info("Admin user already exists, skipping seed.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
