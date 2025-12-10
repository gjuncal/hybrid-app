import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # DB Config
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASS = os.environ.get('DB_PASS', 'password')
    DB_NAME = os.environ.get('DB_NAME', 'redacted_db')
    INSTANCE_CONNECTION_NAME = os.environ.get('INSTANCE_CONNECTION_NAME')
    
    # Security
    SESSION_COOKIE_SECURE = os.environ.get('IS_PROD', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
