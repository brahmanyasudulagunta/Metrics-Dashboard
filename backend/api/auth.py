from jose import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import os

SECRET = os.getenv("JWT_SECRET", "devsecret")
ALGO = os.getenv("JWT_ALGORITHM", "HS256")

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded = jwt.encode(to_encode, SECRET, algorithm=ALGO)
    return encoded


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO], options={"verify_exp": False})
        return payload.get("sub")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
