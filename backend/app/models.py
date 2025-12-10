from .extensions import db
from datetime import datetime, date, time, timedelta

class Base(db.Model):
    __abstract__ = True

    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, (datetime, date, time)):
                value = value.isoformat()
            elif isinstance(value, timedelta):
                value = str(value)
            d[column.name] = value
        return d

class User(Base):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    hashed_password = db.Column(db.String(128), nullable=False)
    salt = db.Column(db.String(32), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='cadastrador')
    session_token = db.Column(db.String(64), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role
        }

# --- Presence System Models ---
class Participante(Base):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    cpf = db.Column(db.String(14), nullable=False, unique=True)
    idade = db.Column(db.Integer)
    nucleo = db.Column(db.String(100))
    whatsapp = db.Column(db.String(20))
    grupo = db.Column(db.String(100))
    grupo_id = db.Column(db.Integer)
    subgrupo_id = db.Column(db.Integer)
    pontos = db.Column(db.Integer, default=0)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    presencas = db.relationship('Presenca', backref='participante', cascade="all, delete-orphan")

class Atividade(Base):
    id = db.Column(db.Integer, primary_key=True)
    grupo = db.Column(db.String(100), nullable=False)
    grupo_id = db.Column(db.Integer)
    subgrupo_id = db.Column(db.Integer)
    data = db.Column(db.DateTime, nullable=False)
    topico = db.Column(db.String(255), nullable=False)
    responsavel = db.Column(db.String(255))
    pontos_por_participante = db.Column(db.Integer, default=10)
    presencas = db.relationship('Presenca', backref='atividade', cascade="all, delete-orphan")
    inscricoes = db.relationship('InscricaoAtividade', backref='atividade', cascade="all, delete-orphan")

class Presenca(Base):
    id = db.Column(db.Integer, primary_key=True)
    participante_id = db.Column(db.Integer, db.ForeignKey('participante.id'), nullable=False)
    atividade_id = db.Column(db.Integer, db.ForeignKey('atividade.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    pontos_ganhos = db.Column(db.Integer, nullable=False, default=1)
    registrado_por_membro_id = db.Column(db.Integer, nullable=True)

class InscricaoAtividade(Base):
    id = db.Column(db.Integer, primary_key=True)
    cpf = db.Column(db.String(14), nullable=False)
    nome = db.Column(db.String(255), nullable=False)
    whatsapp = db.Column(db.String(20))
    grupo_interesse = db.Column(db.String(100))
    atividade_id = db.Column(db.Integer, db.ForeignKey('atividade.id'), nullable=False)
    data_inscricao = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='pendente')

class GrupoTematico(Base):
    __tablename__ = 'grupo_tematico'
    id = db.Column('grupo_tematico_id', db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    descricao = db.Column(db.Text)
    imagem_url = db.Column(db.String(500))
    subgrupos = db.relationship('SubGrupoTematico', backref='grupo', lazy=True, cascade="all, delete-orphan")

class SubGrupoTematico(Base):
    __tablename__ = 'subgrupo_tematico'
    id = db.Column('subgrupo_id', db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    imagem_url = db.Column(db.String(500))
    grupo_id = db.Column(
        'grupo_tematico_id',
        db.Integer,
        db.ForeignKey('grupo_tematico.grupo_tematico_id'),
        nullable=False
    )

# --- Data Collection & Analysis Models ---
# Models used by the Flask application for socioeconomic data collection
# and reporting.

class Cadastro(Base):
    id = db.Column(db.String(50), primary_key=True)
    projeto = db.Column(db.String(100))
    nucleo = db.Column(db.String(100))
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # Storage for flexible form data (sections like "despesas", "lazer", etc.)
    # preventing the need for hundreds of individual columns.
    dados_extras = db.Column(db.JSON, default={})
    
    # Relationships
    dados_responsaveis = db.relationship('DadosResponsaveis', backref='cadastro', uselist=False, cascade="all, delete-orphan")

class DadosResponsaveis(Base):
    id = db.Column(db.Integer, primary_key=True)
    nomeResponsavel1 = db.Column(db.String(255))
    cpfResponsavel1 = db.Column(db.String(14))
    cadastro_id = db.Column(db.String(50), db.ForeignKey('cadastro.id'), nullable=False, unique=True)
