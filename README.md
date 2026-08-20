# SCAE - Sistema de Control de Asistencia Escolar

Sistema web desarrollado para gestionar el registro y control de alumnos y asistencias de una institución educativa.

El sistema permite administrar estudiantes, grados y secciones, además de registrar y consultar la asistencia escolar desde una interfaz web.

## Funcionalidades

- Registro e inicio de sesión de usuarios.
- Autenticación para acceder al sistema.
- Registro de estudiantes.
- Consulta de estudiantes registrados.
- Actualización de información de estudiantes.
- Eliminación de estudiantes.
- Registro de asistencia.
- Consulta de asistencias.
- Consulta de grados.
- Consulta de secciones.
- Estadísticas de asistencia.
- API REST documentada mediante Swagger.

## Tecnologías utilizadas

### Frontend

- HTML
- CSS
- JavaScript
- Nginx

### Backend

- Python
- FastAPI
- SQLAlchemy
- PyMySQL
- JWT para autenticación

### Base de datos

- MySQL 8.0

### Contenedores

- Docker
- Docker Compose

## Arquitectura del proyecto

El sistema se ejecuta utilizando tres contenedores Docker:

```text
Usuario
   |
   v
Frontend Web
Nginx :80
   |
   v
FastAPI :8000
   |
   v
MySQL :3306
```

Docker Compose se encarga de levantar y comunicar los servicios.

## Estructura general

```text
sistema-control-asistencia-escolar/
│
├── backend/
│   └── api/
│       ├── Dockerfile
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       └── requirements.txt
│
├── frontend/
│   ├── Dockerfile
│   └── ...
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Configuración

El backend utiliza variables de entorno para conectarse a MySQL.

Se debe crear un archivo `.env` dentro de:

```text
backend/api/.env
```

Con una configuración como:

```env
DB_USER=root
DB_PASSWORD=TU_PASSWORD
DB_HOST=mysql_db
DB_PORT=3306
DB_NAME=scae

SECRET_KEY=TU_SECRET_KEY
```

> El archivo `.env` no debe subirse al repositorio porque contiene información privada.

## Ejecutar el sistema con Docker

Primero se debe tener instalado Docker Desktop.

Desde una terminal, ubicarse en la carpeta principal del proyecto:

```bash
cd "ruta/del/proyecto"
```

Luego ejecutar:

```bash
docker compose up -d
```

Docker levantará los servicios necesarios:

```text
web_frontend
fastapi_api
mysql_db
```

Para comprobar que los contenedores están ejecutándose:

```bash
docker ps
```

Se deberían mostrar los tres contenedores activos.

## Abrir la aplicación web

Con los contenedores ejecutándose, abrir en el navegador:

```text
http://localhost
```

Desde la aplicación web se puede iniciar sesión y utilizar las funciones del sistema de control de asistencia.

## Abrir la API

La API de FastAPI está disponible en:

```text
http://localhost:8000
```

## Documentación Swagger

FastAPI genera automáticamente documentación interactiva de los endpoints.

Para acceder a Swagger:

```text
http://localhost:8000/docs
```

Desde Swagger se pueden probar los diferentes endpoints de la API, incluyendo:

```text
POST    /registro
POST    /login

GET     /api/estudiantes
POST    /api/estudiantes
PUT     /api/estudiantes/{estudiante_id}
DELETE  /api/estudiantes/{estudiante_id}

GET     /api/asistencia
POST    /api/asistencia

GET     /api/grados
GET     /api/secciones
```

Algunos endpoints requieren autenticación.

## Puertos utilizados

| Servicio | Puerto |
|---|---:|
| Aplicación web | 80 |
| FastAPI | 8000 |
| MySQL dentro de Docker | 3306 |
| MySQL desde Windows | 3307 |

La aplicación utiliza internamente:

```text
mysql_db:3306
```

mientras que el puerto `3307` permite acceder al contenedor de MySQL desde la computadora sin entrar en conflicto con una instalación local de MySQL que utilice el puerto `3306`.

## Detener el sistema

Para detener los contenedores:

```bash
docker compose down
```

Para volver a iniciar el sistema:

```bash
docker compose up -d
```

> No utilizar `docker compose down -v` salvo que se desee eliminar también los volúmenes y datos almacenados de MySQL.

## Objetivo del proyecto

SCAE busca facilitar el control de asistencia escolar mediante una plataforma centralizada en la que se puedan gestionar alumnos, grados, secciones y registros de asistencia.

El proyecto implementa una arquitectura separada entre frontend, API y base de datos, utilizando Docker Compose para facilitar su ejecución y configuración.

## Autor

**Alex**

Proyecto académico - Sistema de Control de Asistencia Escolar.
