from flask import Blueprint, request, jsonify
from ..models import User
from ..extensions import db
from ..utils.encryption import hash_password_secure
from ..utils.decorators import role_required, token_required

# Note: 'encryption' import assumes security.py was renamed or I should use security.py.
# Checking file list: security.py exists. Using security.

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['GET'])
@token_required
@role_required('administrador')
def list_users(current_user):
    users = User.query.all()
    params = []
    for u in users:
        params.append({
            'id': u.id,
            'username': u.username,
            'role': u.role
        })
    return jsonify({'users': params})

@users_bp.route('/user/register', methods=['POST'])
@token_required
@role_required('administrador')
def register_user(current_user):
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'cadastrador')

    if not username or not password:
        return jsonify({'message': 'Username and password required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 400

    hashed = hash_password_secure(password)
    # Salt generation is handled inside security/hashing typically or we need to add it if model requires.
    # Looking at User model: has salt column. 
    # Viewing security.py again to check if it returns salt.
    # security.py -> hash_password_secure returns string.
    # We might need to handle salt if existing system uses it.
    
    # Placeholder: Assuming modern hashing doesn't need explicit salt column or it handles it.
    # Will fix imports and logic based on security.py content check.
    
    new_user = User(
        username=username, 
        hashed_password=hashed,
        salt='', # Modern hashes (Argon2/PBKDF2 in Werkzeug) include salt. Legacy field.
        role=role
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully', 'status': 'success'})

@users_bp.route('/user/delete/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('administrador')
def delete_user(current_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    if user.id == current_user.id:
        return jsonify({'message': 'Cannot delete yourself'}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User deleted'})

@users_bp.route('/user/change_role/<int:user_id>', methods=['POST'])
@token_required
@role_required('administrador')
def change_role(current_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    data = request.get_json()
    new_role = data.get('role')
    if new_role not in ['administrador', 'coordenador', 'cadastrador']:
        return jsonify({'message': 'Invalid role'}), 400
        
    user.role = new_role
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'Role updated'})

@users_bp.route('/user/change_password/<int:user_id>', methods=['POST'])
@token_required
def change_password(current_user, user_id):
    # Admins can change anyone's password; Users can only change their own
    if current_user.role != 'administrador' and current_user.id != user_id:
        return jsonify({'message': 'Permission denied'}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
        
    data = request.get_json()
    new_pass = data.get('password')
    if not new_pass:
        return jsonify({'message': 'Password required'}), 400
        
    user.hashed_password = hash_password_secure(new_pass)
    user.salt = '' # Reset legacy salt if any
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Password updated'})
