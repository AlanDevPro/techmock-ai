# Generador RAG de Simulacros de Entrevistas Técnicas

Este proyecto es una API backend construida con **FastAPI** y alimentada por **LangChain**, la cual se conecta a modelos de inteligencia artificial de forma 100% local a través de **Ollama**.

Su función principal es procesar documentación, contexto técnico y fragmentos de código para generar **simulaciones de entrevistas técnicas orientadas a perfiles Junior**. El sistema garantiza la entrega de las respuestas en una estructura validada y estricta bajo formato `JSON`. 

> Posee una arquitectura modularizada equipada con endpoints para perfiles de **Next.js** y **Vue.js**.

---

## Requisitos Previos

Antes de proceder con la ejecución del código, cerciórese de cumplir con estos requisitos básicos:

1. **Python 3.10 o superior** habilitado desde su terminal local.
2. **Ollama** instalado y ejecutándose de manera local (sitio oficial: [ollama.com](https://ollama.com/)).
3. El modelo de inferencia local `qwen2.5-coder:1.5b` descargado exitosamente. Debido a limitantes de hardware, se requiere el uso de este modelo ultra-rápido para asegurar tiempos mínimos. Ejecute el proceso base con el siguiente comando:
   ```powershell
   ollama run qwen2.5-coder:1.5b
   ```

---

## Pasos de Instalación

Acceda al panel de su terminal en el directorio maestro de su proyecto y observe lo pertinente:

### 1. (Opcional - Recomendado) Establecer entorno virtual
Configure un entorno separado para aislar el proceso y sus respectivas dependencias de su instalación principal de Python.
```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 2. Suministro de Dependencias
Instale el gestor de paquetes de manera global en el sistema virtual utilizando el archivo `requirements.txt`:
```powershell
python -m pip install -r requirements.txt
```

---

## Ejecución del Sistema

Para levantar el nodo base de su API, ejecute el script designado para el inicio del servidor:
```powershell
python run.py
```

El servidor será procesado y hosteado en red privada por Uvicorn. Deberá visualizar avisos de registro confirmando el levantamiento correcto de la infraestructura.

---

## Realización de Pruebas y Consumo mediante Interfaz Web (Swagger UI)

El presente marco de programación provee una interfaz gráfica nativa documentada y probada automáticamente, descartando el uso de integraciones estáticas externas como Postman.

1. Diríjase a su navegador e ingrese la dirección reservada a la documentación: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
2. Identificará los recursos registrados bajo: `/api/generar-preguntas/vue` y `/api/generar-preguntas/next`.
3. Expanda el endpoint escogido mediante interacciones estándar y accione la perilla que indica **"Try it out"**.
4. Luego de que la herramienta habilite los subdirectorios para pruebas, realice la inyección de sus requerimientos de estas dos formas:
   - **Campos de Texto Limitado:** Proceda a dictar los lineamientos estáticos del código requerido usando el text field `contexto`.
   - **Recursos Modulares Físicos/Archivos:** Suba un archivo de validación empleando la selección manual expuesta bajo el control de carga estipulado por el componente `file`.
5. Ejecute mediante la tecla designada como **Execute**.

El modelo de inferencia responderá a la solicitud y generará un esquema JSON final listo para exportación.
//////////////////////////////////////////////////////////////////////






Rag/
├── .env                          # 🟢 NUEVO - variables de entorno
├── .env.example                  # 🟢 NUEVO - plantilla pública
├── README.md
├── requirements.txt              # 🟡 MODIFICAR
├── run.py
├── alembic.ini                   # 🟢 NUEVO - migraciones de DB
│
├── alembic/                      # 🟢 NUEVO - carpeta de migraciones
│   ├── env.py
│   └── versions/
│
└── app/
    ├── main.py                   # 🟡 MODIFICAR - agregar lifespan/startup
    │
    ├── api/
    │   ├── __init__.py
    │   ├── endpoints.py          # 🟡 MODIFICAR - inyectar DB session
    │   └── deps.py               # 🟢 NUEVO - get_db() como dependencia
    │
    ├── core/
    │   ├── config.py             # 🟢 NUEVO - Settings con pydantic-settings
    │   └── prompts.py            # ✅ sin cambios
    │
    ├── db/                       # 🟢 NUEVO - carpeta completa
    │   ├── __init__.py
    │   ├── database.py           # engine async, SessionLocal
    │   ├── models.py             # tablas ORM (preguntas, sesiones, evaluaciones)
    │   └── repositories.py      # funciones CRUD
    │
    ├── schemas/
    │   ├── __init__.py
    │   └── evaluations.py        # 🟡 MODIFICAR - agregar sesion_id
    │
    ├── services/
    │   ├── __init__.py
    │   └── llm_service.py        # ✅ sin cambios
    │
    ├── models/                   # (si tenés modelos Pydantic separados)
    └── data/
        ├── vue_context.txt       # ✅ sin cambios
        └── next_context.txt      # ✅ sin cambios