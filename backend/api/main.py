# =====================================================================
# Sistema de Control de Asistencia Escolar — API (FastAPI)
# Corre con:  uvicorn main:app --reload --port 8000
# Documentación interactiva en: http://127.0.0.1:8000/docs
# =====================================================================
import os
import uuid
from datetime import date
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
import schemas
import auth
from io import BytesIO
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SCAE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

CARPETA_UPLOADS = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(CARPETA_UPLOADS, "fotos"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=CARPETA_UPLOADS), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# =====================================================================
# AUTENTICACIÓN
# =====================================================================
@app.post("/registro", response_model=schemas.DocenteOut)
def registro(datos: schemas.DocenteRegistroIn, db: Session = Depends(get_db)):
    if len(datos.usuario.strip()) < 3:
        raise HTTPException(status_code=400, detail="El usuario debe tener al menos 3 caracteres.")

    if len(datos.clave) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

    if db.query(models.Docente).filter(models.Docente.usuario == datos.usuario).first():
        raise HTTPException(status_code=400, detail="Ese usuario ya está registrado.")

    if db.query(models.Docente).filter(models.Docente.correo == datos.correo).first():
        raise HTTPException(status_code=400, detail="Ese correo ya está registrado.")

    nuevo = models.Docente(
        usuario=datos.usuario.strip(),
        correo=datos.correo.strip(),
        direccion=datos.direccion.strip(),
        clave_hash=auth.hash_password(datos.clave),
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@app.post("/login", response_model=schemas.TokenOut)
def login(datos: schemas.DocenteLoginIn, db: Session = Depends(get_db)):
    docente = db.query(models.Docente).filter(models.Docente.usuario == datos.usuario).first()

    if not docente or not auth.verify_password(datos.clave, docente.clave_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")

    token = auth.crear_token({"sub": docente.usuario})
    return schemas.TokenOut(access_token=token, docente=docente)


# =====================================================================
# Helpers internos
# =====================================================================
def obtener_o_crear_grado_seccion(db: Session, grado_nombre: str, seccion_nombre: str) -> models.GradoSeccion:
    grado = db.query(models.Grado).filter(models.Grado.nombre == grado_nombre).first()
    if not grado:
        grado = models.Grado(nombre=grado_nombre)
        db.add(grado)
        db.flush()

    seccion = db.query(models.Seccion).filter(models.Seccion.nombre == seccion_nombre).first()
    if not seccion:
        seccion = models.Seccion(nombre=seccion_nombre)
        db.add(seccion)
        db.flush()

    gs = (
        db.query(models.GradoSeccion)
        .filter(models.GradoSeccion.grado_id == grado.id, models.GradoSeccion.seccion_id == seccion.id)
        .first()
    )
    if not gs:
        gs = models.GradoSeccion(grado_id=grado.id, seccion_id=seccion.id)
        db.add(gs)
        db.flush()

    return gs


def guardar_foto(archivo: UploadFile) -> str:
    extension = os.path.splitext(archivo.filename or "")[1] or ".jpg"
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_absoluta = os.path.join(CARPETA_UPLOADS, "fotos", nombre_archivo)
    with open(ruta_absoluta, "wb") as f:
        f.write(archivo.file.read())
    return f"/uploads/fotos/{nombre_archivo}"


def estudiante_a_schema(db: Session, est: models.Estudiante) -> schemas.EstudianteOut:
    gs = db.query(models.GradoSeccion).filter(models.GradoSeccion.id == est.grado_seccion_id).first()
    grado = db.query(models.Grado).filter(models.Grado.id == gs.grado_id).first()
    seccion = db.query(models.Seccion).filter(models.Seccion.id == gs.seccion_id).first()

    ultimo = (
        db.query(models.Asistencia)
        .filter(models.Asistencia.estudiante_id == est.id)
        .order_by(models.Asistencia.fecha.desc())
        .first()
    )

    return schemas.EstudianteOut(
        id=est.id,
        nombre=est.nombre,
        apellido=est.apellido,
        direccion=est.direccion,
        telefono=est.telefono,
        responsable=est.responsable,
        foto=est.foto_url,
        grado=grado.nombre,
        seccion=seccion.nombre,
        estado_actual=ultimo.estado if ultimo else None,
    )


# =====================================================================
# ESTUDIANTES (protegidas)
# =====================================================================
@app.get("/api/estudiantes", response_model=List[schemas.EstudianteOut])
def listar_estudiantes(
    grado: str,
    seccion: str,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    gs = obtener_o_crear_grado_seccion(db, grado, seccion)
    db.commit()
    lista = (
        db.query(models.Estudiante)
        .filter(models.Estudiante.grado_seccion_id == gs.id, models.Estudiante.activo == True)  # noqa: E712
        .order_by(models.Estudiante.id)
        .all()
    )
    return [estudiante_a_schema(db, e) for e in lista]


@app.post("/api/estudiantes", response_model=schemas.EstudianteOut)
def crear_estudiante(
    nombre: str = Form(...),
    apellido: str = Form(...),
    grado: str = Form(...),
    seccion: str = Form(...),
    direccion: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    responsable: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    gs = obtener_o_crear_grado_seccion(db, grado, seccion)

    foto_url = guardar_foto(foto) if (foto and foto.filename) else None

    nuevo = models.Estudiante(
        nombre=nombre,
        apellido=apellido,
        direccion=direccion,
        telefono=telefono,
        responsable=responsable,
        foto_url=foto_url,
        grado_seccion_id=gs.id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return estudiante_a_schema(db, nuevo)


@app.put("/api/estudiantes/{estudiante_id}", response_model=schemas.EstudianteOut)
def actualizar_estudiante(
    estudiante_id: int,
    nombre: str = Form(...),
    apellido: str = Form(...),
    direccion: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    responsable: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    est = db.query(models.Estudiante).filter(models.Estudiante.id == estudiante_id).first()
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    est.nombre = nombre
    est.apellido = apellido
    est.direccion = direccion
    est.telefono = telefono
    est.responsable = responsable
    if foto and foto.filename:
        est.foto_url = guardar_foto(foto)

    db.commit()
    db.refresh(est)
    return estudiante_a_schema(db, est)


@app.delete("/api/estudiantes/{estudiante_id}")
def eliminar_estudiante(
    estudiante_id: int,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    est = db.query(models.Estudiante).filter(models.Estudiante.id == estudiante_id).first()
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    db.delete(est)
    db.commit()
    return {"ok": True}


# =====================================================================
# ASISTENCIA (protegidas)
# =====================================================================
@app.get("/api/asistencia", response_model=List[schemas.AsistenciaEstadoOut])
def obtener_asistencia_por_fecha(
    grado: str,
    seccion: str,
    fecha: date,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    gs = obtener_o_crear_grado_seccion(db, grado, seccion)
    db.commit()
    estudiantes = (
        db.query(models.Estudiante)
        .filter(models.Estudiante.grado_seccion_id == gs.id, models.Estudiante.activo == True)  # noqa: E712
        .order_by(models.Estudiante.id)
        .all()
    )

    resultado = []
    for est in estudiantes:
        registro = (
            db.query(models.Asistencia)
            .filter(models.Asistencia.estudiante_id == est.id, models.Asistencia.fecha == fecha)
            .first()
        )
        resultado.append(
            schemas.AsistenciaEstadoOut(
                estudiante_id=est.id,
                nombre=est.nombre,
                apellido=est.apellido,
                estado=registro.estado if registro else None,
            )
        )
    return resultado

# =====================================================================
# GRADOS / SECCIONES (protegidas)
# =====================================================================
@app.get("/api/grados", response_model=List[schemas.GradoOut])
def listar_grados(
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    return db.query(models.Grado).order_by(models.Grado.nombre).all()


@app.get("/api/secciones", response_model=List[schemas.SeccionOut])
def listar_secciones(
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    return db.query(models.Seccion).order_by(models.Seccion.nombre).all()


# =====================================================================
# REPORTE EN PDF (protegida)
# =====================================================================
@app.get("/api/reportes/pdf")
def descargar_reporte_pdf(
    grado: str,
    seccion: str,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    gs = obtener_o_crear_grado_seccion(db, grado, seccion)
    db.commit()

    filas = (
        db.query(models.Asistencia, models.Estudiante)
        .join(models.Estudiante, models.Asistencia.estudiante_id == models.Estudiante.id)
        .filter(models.Estudiante.grado_seccion_id == gs.id)
        .order_by(models.Asistencia.fecha.desc())
        .all()
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    estilos = getSampleStyleSheet()

    elementos = [
        Paragraph(f"Reporte de asistencia — {grado} {seccion}", estilos["Title"]),
        Spacer(1, 14),
    ]

    datos_tabla = [["Fecha", "Estudiante", "Estado"]]
    for a, e in filas:
        datos_tabla.append([str(a.fecha), f"{e.nombre} {e.apellido}", a.estado])

    if len(datos_tabla) == 1:
        elementos.append(Paragraph("No hay asistencia registrada todavía.", estilos["Normal"]))
    else:
        tabla = Table(datos_tabla, colWidths=[100, 260, 100])
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B3A4B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F0")]),
        ]))
        elementos.append(tabla)

    doc.build(elementos)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte-asistencia.pdf"},
    )


@app.post("/api/asistencia")
def guardar_asistencia(
    datos: schemas.GuardarAsistenciaIn,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    for reg in datos.registros:
        existente = (
            db.query(models.Asistencia)
            .filter(
                models.Asistencia.estudiante_id == reg.estudiante_id,
                models.Asistencia.fecha == datos.fecha,
            )
            .first()
        )
        if existente:
            existente.estado = reg.estado
            existente.docente_id = docente_actual.id
        else:
            db.add(
                models.Asistencia(
                    estudiante_id=reg.estudiante_id,
                    docente_id=docente_actual.id,
                    fecha=datos.fecha,
                    estado=reg.estado,
                )
            )

    db.commit()
    return {"ok": True, "guardados": len(datos.registros)}


# =====================================================================
# REPORTES (protegidas)
# =====================================================================
@app.get("/api/reportes", response_model=List[schemas.ReporteOut])
def obtener_reportes(
    grado: str,
    seccion: str,
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    gs = obtener_o_crear_grado_seccion(db, grado, seccion)
    db.commit()

    filas = (
        db.query(models.Asistencia, models.Estudiante)
        .join(models.Estudiante, models.Asistencia.estudiante_id == models.Estudiante.id)
        .filter(models.Estudiante.grado_seccion_id == gs.id)
        .order_by(models.Asistencia.fecha.desc())
        .all()
    )

    return [
        schemas.ReporteOut(fecha=a.fecha, nombre=e.nombre, apellido=e.apellido, estado=a.estado)
        for a, e in filas
    ]


@app.get("/api/estadisticas/hoy", response_model=schemas.EstadisticasHoyOut)
def estadisticas_hoy(
    db: Session = Depends(get_db),
    docente_actual: models.Docente = Depends(auth.obtener_docente_actual),
):
    hoy = date.today()
    registros_hoy = db.query(models.Asistencia).filter(models.Asistencia.fecha == hoy).all()
    return schemas.EstadisticasHoyOut(
        total=len(registros_hoy),
        presentes=sum(1 for r in registros_hoy if r.estado == "presente"),
        tardes=sum(1 for r in registros_hoy if r.estado == "tarde"),
        ausentes=sum(1 for r in registros_hoy if r.estado == "ausente"),
    )