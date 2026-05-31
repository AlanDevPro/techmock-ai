rag-api-aws/
│
├── app/
│   ├── __init__.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                         ← get_db, get_current_user, etc.
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── generacion_preguntas.py     ← GET /preguntas/generar/{framework}
│   │       │                                  GET /preguntas/iniciar-sesion/{framework}
│   │       │                                  GET /sesion/{id}/pregunta
│   │       │
│   │       ├── evaluacion_codigo.py        ← POST /codigo/analizar
│   │       │                                  POST /codigo/borrador
│   │       │                                  GET  /sesion/{id}/resultado
│   │       │                                  GET  /sesion/{id}/analisis
│   │       │
│   │       ├── perfil_tecnico.py           ← GET /usuario/{id}/perfil
│   │       │                                  GET /usuario/{id}/debilidades
│   │       │                                  GET /usuario/{id}/fortalezas
│   │       │
│   │       └── reclutador.py               ← GET /reclutador/candidatos
│   │                                          GET /reclutador/candidato/{id}
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                       ← Settings, variables de entorno
│   │   ├── normalizers.py                  ← construir_contexto_proyecto, etc.
│   │   └── exceptions.py                  ← HTTPExceptions personalizadas
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py                      ← Engine, AsyncSession factory
│   │   ├── models.py                       ← Todos los modelos SQLAlchemy (un archivo)
│   │   │                                      o bien separados por dominio:
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── usuarios.py                 ← Usuario, AuthProvider, RefreshToken
│   │   │   ├── tecnologias.py              ← Tecnologia, NivelDificultad, Rubrica
│   │   │   ├── preguntas.py                ← Pregunta, CategoriaError
│   │   │   ├── sesiones.py                 ← SesionEntrevista, Mensaje, EnvioCodigo
│   │   │   ├── evaluaciones.py             ← Evaluacion, DetalleEvaluacion,
│   │   │   │                                  ErrorDetectado, RecomendacionSolucion
│   │   │   └── perfil.py                   ← PerfilTecnicoUsuario, FortalezaUsuario,
│   │   │                                      DebilidadUsuario, EstadisticasUsuario
│   │   │
│   │   └── repositories/
│   │       ├── __init__.py                 ← Re-exporta todo
│   │       ├── tecnologias_repo.py         ← get_tecnologia_por_slug, get_nivel
│   │       ├── preguntas_repo.py           ← crear_pregunta, get_pregunta
│   │       ├── sesiones_repo.py            ← crear_sesion, finalizar_sesion,
│   │       │                                  get_sesion_por_id, get_sesion_con_detalles
│   │       ├── evaluaciones_repo.py        ← guardar_evaluacion, guardar_error_detectado,
│   │       │                                  guardar_recomendacion, guardar_detalle_rubrica
│   │       ├── codigo_repo.py              ← guardar_envio_codigo
│   │       └── perfil_repo.py              ← actualizar_estadisticas_usuario,
│   │                                          actualizar_perfil_tecnico,
│   │                                          upsert_fortaleza, upsert_debilidad
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── preguntas.py                    ← RespuestaPregunta, SesionIniciadaResponse
│   │   ├── evaluaciones.py                 ← RespuestaAnalisisCodigo,
│   │   │                                      PilaresEvaluacion, ErrorDetectadoSchema
│   │   └── perfil.py                       ← PerfilTecnicoResponse, CandidatoReclutadorView
│   │
│   └── services/
│       │
│       ├── generacion/                     ← Todo lo relacionado a crear preguntas
│       │   ├── __init__.py
│       │   ├── pregunta_service.py         ← Orquesta RAG + LLM + persistencia para preguntas
│       │   └── adaptativo_service.py       ← Consulta debilidades_usuario y genera
│       │                                      preguntas adaptativas (fue_adaptativa=True)
│       │
│       ├── evaluacion/                     ← Todo lo relacionado a evaluar código
│       │   ├── __init__.py
│       │   ├── codigo_service.py           ← Orquesta RAG + LLM + persistencia para análisis
│       │   ├── pilares_parser.py           ← Parsea respuesta LLM → pilares individuales
│       │   │                                  (puntaje_javascript, puntaje_arquitectura, etc.)
│       │   └── analytics_service.py        ← guardar_evaluacion_tecnica, métricas
│       │
│       ├── rag/                            ← Infraestructura RAG pura (sin lógica de negocio)
│       │   ├── __init__.py
│       │   ├── rag_service.py              ← Orquesta retriever + prompt + LLM
│       │   ├── retriever/
│       │   │   └── vector_store.py         ← Búsqueda semántica en OpenSearch
│       │   └── embeddings/
│       │       └── service.py              ← Texto → vectores
│       │
│       └── llm/                            ← Cliente LLM genérico
│           ├── __init__.py
│           ├── client.py                   ← Multi-proveedor (Groq/OpenAI/Anthropic)
│           ├── prompts/
│           │   ├── __init__.py
│           │   ├── preguntas_prompts.py    ← Prompts para generar preguntas
│           │   └── evaluacion_prompts.py   ← Prompts para evaluar código
│           │                                  (deben pedir los 5 pilares por separado)
│           └── parser.py                   ← Parsea JSON del LLM de forma segura
│
├── ingestion/
│   ├── ingest.py
│   └── docs/
│       ├── vue.md
│       ├── nextjs.md
│       ├── react.md
│       └── typescript.md
│
├── migrations/                             ← Alembic
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── api/
│   │   ├── test_generacion_preguntas.py
│   │   └── test_evaluacion_codigo.py
│   ├── services/
│   │   ├── test_adaptativo_service.py
│   │   └── test_pilares_parser.py
│   └── db/
│       └── test_repositories.py
│
├── .env.example
├── requirements.txt
└── main.py                                 ← FastAPI app, incluye los 4 routers