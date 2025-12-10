from flask import Blueprint, send_from_directory, current_app, redirect, url_for
import os

web_collection_bp = Blueprint('web_collection', __name__)

@web_collection_bp.route('/questionario')
def questionario():
    return send_from_directory(os.path.join(current_app.root_path, 'app', 'templates'), 'index.html')

@web_collection_bp.route('/logout')
def logout_redirect():
    # Redirect legacy logout path to standard logout or login page
    return redirect('/?action=logout')
