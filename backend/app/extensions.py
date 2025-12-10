from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

db = SQLAlchemy()
# SocketIO is initialized in __init__.py but we might want it here if we refactor harder.
# For now, let's keep db here to avoid circular imports.
