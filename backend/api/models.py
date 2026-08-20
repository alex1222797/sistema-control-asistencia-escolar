# =====================================================================
# Modelos SQLAlchemy — reflejan exactamente las tablas de base guardar.sql
# =====================================================================
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.sql import func
from database import Base


class Docente(Base):
    __tablename__ = "docentes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(50), unique=True, nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    direccion = Column(String(255), nullable=False)
    clave_hash = Column(String(255), nullable=False)
    creado_en = Column(DateTime, server_default=func.now())


class Grado(Base):
    __tablename__ = "grados"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(30), unique=True, nullable=False)


class Seccion(Base):
    __tablename__ = "secciones"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(5), unique=True, nullable=False)


class GradoSeccion(Base):
    __tablename__ = "grado_seccion"
    id = Column(Integer, primary_key=True, autoincrement=True)
    grado_id = Column(Integer, ForeignKey("grados.id", ondelete="CASCADE"), nullable=False)
    seccion_id = Column(Integer, ForeignKey("secciones.id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (UniqueConstraint("grado_id", "seccion_id", name="uq_grado_seccion"),)


class Estudiante(Base):
    __tablename__ = "estudiantes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    direccion = Column(String(255))
    telefono = Column(String(20))
    responsable = Column(String(150))
    foto_url = Column(String(255))
    grado_seccion_id = Column(Integer, ForeignKey("grado_seccion.id", ondelete="CASCADE"), nullable=False)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, server_default=func.now())


class Asistencia(Base):
    __tablename__ = "asistencia"
    id = Column(Integer, primary_key=True, autoincrement=True)
    estudiante_id = Column(Integer, ForeignKey("estudiantes.id", ondelete="CASCADE"), nullable=False)
    docente_id = Column(Integer, ForeignKey("docentes.id", ondelete="RESTRICT"), nullable=False)
    fecha = Column(Date, nullable=False)
    estado = Column(Enum("presente", "ausente", "tarde", name="estado_enum"), nullable=False)
    registrado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (UniqueConstraint("estudiante_id", "fecha", name="uq_estudiante_fecha"),)