from flask import Blueprint, jsonify
from ..utils.decorators import token_required

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Service is running'})

# Example protected route
@api_bp.route('/protected', methods=['GET'])
@token_required
def protected(current_user):
    return jsonify({'message': f'Hello {current_user.username}'})
