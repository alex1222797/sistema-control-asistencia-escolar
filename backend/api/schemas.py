# =====================================================================
# Esquemas Pydantic — forma de los datos que entran y salen de la API
# =====================================================================
from datetime import date
from typing import Optional, List
from pydantic import BaseModel


class EstudianteOut(BaseModel):
    id: int
    nombre: str
    apellido: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    foto: Optional[str] = None
    grado: str
    seccion: str
    estado_actual: Optional[str] = None

    class Config:
        from_attributes = True


class AsistenciaEstadoOut(BaseModel):
    estudiante_id: int
    nombre: str
    apellido: str
    estado: Optional[str] = None


class RegistroAsistencia(BaseModel):
    estudiante_id: int
    estado: str  # "presente" | "ausente" | "tarde"


class GuardarAsistenciaIn(BaseModel):
    fecha: date
    grado: str
    seccion: str
    registros: List[RegistroAsistencia]


class ReporteOut(BaseModel):
    fecha: date
    nombre: str
    apellido: str
    estado: str


class EstadisticasHoyOut(BaseModel):
    total: int
    presentes: int
    tardes: int
    ausentes: int


# ---------------------------------------------------------------------
# AUTENTICACIÓN
# ---------------------------------------------------------------------
class DocenteRegistroIn(BaseModel):
    usuario: str
    correo: str
    direccion: str
    clave: str


class DocenteLoginIn(BaseModel):
    usuario: str
    clave: str


class DocenteOut(BaseModel):
    id: int
    usuario: str
    correo: str

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    docente: DocenteOut
    
class GradoOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


class SeccionOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True