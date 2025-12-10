import os
import hashlib
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from argon2 import PasswordHasher
    PH = PasswordHasher(time_cost=1, memory_cost=65536, parallelism=2)
    HAS_ARGON2 = True
except ImportError:
    HAS_ARGON2 = False

def generate_salt():
    return os.urandom(16).hex()

def hash_password_secure(password: str) -> str:
    if HAS_ARGON2:
        return PH.hash(password)
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

def verify_password(user, password: str) -> bool:
    """Verifies password and handles legacy migration check logic if needed."""
    hp = user.hashed_password or ''
    is_argon2 = hp.startswith('$argon2')
    is_pbkdf2 = hp.startswith('pbkdf2:sha256')

    if is_argon2 and HAS_ARGON2:
        try:
            return PH.verify(hp, password)
        except:
            return False
    elif is_pbkdf2:
        return check_password_hash(hp, password)
    else:
        salt = user.salt or ''
        legacy_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
        return legacy_hash == hp

