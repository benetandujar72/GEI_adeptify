# Script para instalar dependencias de Python
# Ejecutar después de instalar Python

Write-Host "=== Instalación de Dependencias de Python ===" -ForegroundColor Green

# Actualizar pip
Write-Host "Actualizando pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Instalar dependencias básicas
Write-Host "Instalando dependencias básicas..." -ForegroundColor Yellow
pip install virtualenv
pip install pipenv
pip install poetry

# Crear entorno virtual
Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
python -m venv venv

# Activar entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Instalar dependencias para AI y ML
Write-Host "Instalando dependencias de AI/ML..." -ForegroundColor Yellow
pip install numpy
pip install pandas
pip install scikit-learn
pip install tensorflow
pip install torch
pip install transformers
pip install openai
pip install anthropic
pip install langchain
pip install langchain-openai
pip install langchain-anthropic

# Instalar dependencias para procesamiento de datos
Write-Host "Instalando dependencias de procesamiento..." -ForegroundColor Yellow
pip install matplotlib
pip install seaborn
pip install plotly
pip install jupyter
pip install ipykernel

# Instalar dependencias para APIs
Write-Host "Instalando dependencias de APIs..." -ForegroundColor Yellow
pip install fastapi
pip install uvicorn
pip install requests
pip install aiohttp
pip install httpx

# Instalar dependencias para bases de datos
Write-Host "Instalando dependencias de bases de datos..." -ForegroundColor Yellow
pip install psycopg2-binary
pip install pymongo
pip install redis
pip install sqlalchemy
pip install alembic
pip install sqlite3

# Instalar dependencias para procesamiento de texto
Write-Host "Instalando dependencias de NLP..." -ForegroundColor Yellow
pip install nltk
pip install spacy
pip install textblob
pip install gensim

# Instalar dependencias para análisis de datos educativos
Write-Host "Instalando dependencias educativas..." -ForegroundColor Yellow
pip install edx-dl
pip install coursera-dl
pip install moodle-dl

# Instalar dependencias para testing
Write-Host "Instalando dependencias de testing..." -ForegroundColor Yellow
pip install pytest
pip install pytest-asyncio
pip install pytest-cov
pip install pytest-mock

# Instalar dependencias para desarrollo
Write-Host "Instalando dependencias de desarrollo..." -ForegroundColor Yellow
pip install black
pip install flake8
pip install mypy
pip install pre-commit
pip install ipython

# Crear requirements.txt
Write-Host "Generando requirements.txt..." -ForegroundColor Yellow
pip freeze > requirements.txt

# Instalar dependencias específicas del proyecto
Write-Host "Instalando dependencias específicas del proyecto..." -ForegroundColor Yellow

# Dependencias para microservicios de AI
if (Test-Path "microservices/ai-services") {
    Set-Location "microservices/ai-services"
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    }
    Set-Location "../../"
}

# Dependencias para análisis predictivo
if (Test-Path "microservices/predictive-analytics") {
    Set-Location "microservices/predictive-analytics"
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    }
    Set-Location "../../"
}

# Dependencias para generación de contenido
if (Test-Path "microservices/content-generation") {
    Set-Location "microservices/content-generation"
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    }
    Set-Location "../../"
}

Write-Host "`n=== Instalación de Python completada ===" -ForegroundColor Green
Write-Host "`nEntorno virtual activado en: venv/" -ForegroundColor Cyan
Write-Host "Para activar el entorno virtual en el futuro:" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "`nPara desactivar el entorno virtual:" -ForegroundColor White
Write-Host "  deactivate" -ForegroundColor Yellow 