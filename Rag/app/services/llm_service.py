import json
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.evaluations import RespuestaEvaluacion
from app.core.prompts import get_junior_prompt

async def generar_evaluacion_llm(contexto: str, framework: str) -> dict:
    """Implementa async y parámetros de contención para acelerar procesamiento."""
    llm = ChatOllama(
        model="qwen2.5-coder:1.5b",
        format="json",
        temperature=0.1,
        # Restricciones técnicas para optimizar drásticamente el rendimiento computacional
        num_predict=600,   # Omitir procesamiento excesivo; fija la respuesta a una estructura concreta
        num_ctx=2048       # Minimizar reserva de memoria a solo 2048 tokens agilizando la inicialización 
    )
    
    esquema_esperado = json.dumps(RespuestaEvaluacion.model_json_schema(), ensure_ascii=False)
    system_prompt = get_junior_prompt(framework)
    
    prompt_completo = f"{system_prompt}\n\nEsquema JSON obligatorio a cumplir exactamente:\n{esquema_esperado}"
    
    messages = [
        SystemMessage(content=prompt_completo),
        HumanMessage(content=f"Este es el CONTEXTO proporcionado para simular la entrevista de {framework}:\n\n{contexto}")
    ]
    
    # Procesamiento asíncrono no bloqueante implementando 'ainvoke' para aceleración I/O
    respuesta = await llm.ainvoke(messages)
    
    try:
        data = json.loads(respuesta.content)
        return data
    except Exception as e:
        return {"preguntas": [], "error_por_falta_de_contexto": f"Error de arquitectura JSON en el render LLM: {str(e)}"}
