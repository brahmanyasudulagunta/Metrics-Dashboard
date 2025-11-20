from datetime import datetime, timedelta
from jose import jwt
import os

SECRET = os.getenv("JWT_SECRET", "devsecret")
ALGO = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MIN)
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, SECRET, algorithm=ALGO)
    return encoded

def get_current_user(token: str = None):
    # Placeholder: FastAPI dependency is recommended
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        return payload.get("sub")
    except Exception:
        return None
