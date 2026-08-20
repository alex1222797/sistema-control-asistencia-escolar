FROM python:3.10-slim

WORKDIR /app

# Copiamos las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo el código de la API (main.py, models.py, etc.)
COPY . .

EXPOSE 8000

# Iniciamos FastAPI con Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]