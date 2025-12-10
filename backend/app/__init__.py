from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config

socketio = SocketIO()

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../../dist', static_url_path='')
    app.config.from_object(config_class)

    # Initialize extensions
    # allowed_origins = app.config.get('CORS_ORIGINS')
    # CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)
    CORS(app, supports_credentials=True) # Simply enable CORS for now, refine later
    
    socketio.init_app(app, cors_allowed_origins="*", async_mode='eventlet')

    # Register Blueprints
    from .routes.api import api_bp
    from .routes.auth import auth_bp
    from .routes.users import users_bp
    from .routes.cadastros import cadastros_bp
    from .routes.web_collection import web_collection_bp
    
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(cadastros_bp, url_prefix='/api')
    app.register_blueprint(web_collection_bp) # Served at root/questionario

    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    @app.route('/<path:path>')
    def catch_all(path):
        return app.send_static_file('index.html')

    return app
