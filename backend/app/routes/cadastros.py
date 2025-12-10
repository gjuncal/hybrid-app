from flask import Blueprint, request, jsonify
from ..models import Cadastro, DadosResponsaveis, db
from ..extensions import socketio
from ..utils.decorators import token_required
from sqlalchemy import or_
from flask_socketio import emit

cadastros_bp = Blueprint('cadastros', __name__)

# --- REST API Endpoints ---

@cadastros_bp.route('/cadastro/save', methods=['POST'])
@token_required
def save_cadastro(current_user):
    data = request.get_json()
    section_data = data.get('sectionData', {})
    cadastro_id = section_data.get('cadastroId')
    section = section_data.get('section')
    form_data = section_data.get('data', {})

    if not cadastro_id:
        return jsonify({'message': 'Cadastro ID required'}), 400

    cadastro = Cadastro.query.get(cadastro_id)
    if not cadastro:
        # Create new cadastro if it doesn't exist (usually happens on first save)
        cadastro = Cadastro(id=cadastro_id, created_by_user_id=current_user.id)
        db.session.add(cadastro)
    
    # Update relational fields if they exist in this section
    if 'projeto' in form_data:
        cadastro.projeto = form_data['projeto']
    if 'nucleo' in form_data:
        cadastro.nucleo = form_data['nucleo']

    # Handle DadosResponsaveis (relational for searchability)
    if section in ['identificadores', 'dados-responsaveis']:
        dr = cadastro.dados_responsaveis
        if not dr:
            dr = DadosResponsaveis(cadastro_id=cadastro_id)
            db.session.add(dr)
        
        # Map known fields
        if 'nomeResponsavel1' in form_data:
            dr.nomeResponsavel1 = form_data['nomeResponsavel1']
        if 'cpfResponsavel1' in form_data:
            dr.cpfResponsavel1 = form_data['cpfResponsavel1']

    # Update JSON storage (merge new data)
    current_extras = cadastro.dados_extras or {}
    current_extras[section] = form_data
    # Force update tracking for JSON in some SQLA versions
    cadastro.dados_extras = dict(current_extras) 
    
    try:
        db.session.commit()
        return jsonify({'status': 'success', 'message': f'Section {section} saved'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@cadastros_bp.route('/cadastro/<cadastro_id>', methods=['GET'])
@token_required
def get_cadastro(current_user, cadastro_id):
    cadastro = Cadastro.query.get(cadastro_id)
    if not cadastro:
        return jsonify({'message': 'Not found'}), 404
    
    # Construct response merging relational and JSON data
    resp = cadastro.dados_extras.copy() if cadastro.dados_extras else {}
    resp['id'] = cadastro.id
    resp['projeto'] = cadastro.projeto
    resp['nucleo'] = cadastro.nucleo
    
    if cadastro.dados_responsaveis:
        resp['dados_responsaveis'] = {
            'nomeResponsavel1': cadastro.dados_responsaveis.nomeResponsavel1,
            'cpfResponsavel1': cadastro.dados_responsaveis.cpfResponsavel1
        }
    
    return jsonify({'status': 'success', 'cadastro': resp})

@cadastros_bp.route('/cadastros/search', methods=['GET'])
@token_required
def search_cadastros(current_user):
    q = request.args.get('q', '').strip()
    limit = int(request.args.get('limit', 50))
    
    query = db.session.query(Cadastro).outerjoin(DadosResponsaveis)
    
    if q:
        search_filter = or_(
            Cadastro.id.ilike(f'%{q}%'),
            Cadastro.nucleo.ilike(f'%{q}%'),
            DadosResponsaveis.nomeResponsavel1.ilike(f'%{q}%'),
            DadosResponsaveis.cpfResponsavel1.ilike(f'%{q}%')
        )
        query = query.filter(search_filter)
    
    results = query.limit(limit).all()
    
    output = []
    for c in results:
        name = c.dados_responsaveis.nomeResponsavel1 if c.dados_responsaveis else 'N/A'
        output.append({
            'cadastroId': c.id,
            'nomeCompleto': name,
            'nucleo': c.nucleo,
            'projeto': c.projeto
        })
        
    return jsonify({'status': 'success', 'results': output})

# --- SocketIO Handlers ---

@socketio.on('get_cadastros')
def handle_get_cadastros(data):
    # Basic pagination implementation
    page = data.get('page', 1)
    per_page = data.get('page_size', 40)
    
    paginated = Cadastro.query.order_by(Cadastro.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    results = []
    for c in paginated.items:
        name = c.dados_responsaveis.nomeResponsavel1 if c.dados_responsaveis else 'N/A'
        results.append({
            'cadastroId': c.id,
            'nomeCompleto': name,
            'nucleo': c.nucleo
        })
        
    emit('cadastros_list', {'cadastros': results, 'total': paginated.total, 'pages': paginated.pages})

@socketio.on('get_statistics')
def handle_statistics(data):
    # proper statistics requiring aggregation queries
    # For portfolio, we return mocked or basic stats to verify connectivity
    total = Cadastro.query.count()
    emit('statistics_data', {'total_cadastros': total, 'by_nucleo': {}})
