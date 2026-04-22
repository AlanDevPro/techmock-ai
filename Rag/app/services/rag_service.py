def procesar_texto_contexto(texto_raw: str) -> str:
    """ 
    Aquí iría la lógica RAG completa (chunking, vector db).
    En esta fase inicial, preparamos y limpiamos el texto para inyección directa en el contexto.
    """
    if not texto_raw:
        return ""
    return texto_raw.strip()
