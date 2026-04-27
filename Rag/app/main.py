from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("📦 Importando router...")
from app.api.endpoints import router as api_router
print("✅ Router importado correctamente")

print("📦 Creando instancia de FastAPI...")
app = FastAPI(title="Generador RAG Evaluaciones Técnicas")
print("✅ App creada")

print("📦 Configurando CORS...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("✅ CORS configurado")

print("📦 Incluyendo router...")
app.include_router(api_router, prefix="/api")
print("✅ Router incluido")

@app.get("/")
def read_root():
    print("👉 Endpoint raíz llamado")
    return {
        "message": "API RAG Activada y en formato de red local. Dirigirse a /docs para consultar documentación de endpoints provistos en formato Swagger."
    }