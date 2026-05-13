from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import time
import uuid


@dataclass
class SessionState:
    session_id: str
    history: List[dict] = field(default_factory=list)
    last_difficulty: int = 2
    last_level: str = "Junior Bajo"
    last_question: Optional[str] = None
    last_expected: Optional[str] = None
    last_framework: Optional[str] = None
    updated_at: float = field(default_factory=time.time)


_SESSIONS: Dict[str, SessionState] = {}
_MAX_HISTORY = 5


def _normalizar_framework(framework: Optional[str]) -> Optional[str]:
    if not framework:
        return None
    normalized = framework.strip().lower()
    if normalized in {"vue", "vuejs", "vue.js"}:
        return "vuejs"
    if normalized in {"next", "nextjs", "next.js"}:
        return "nextjs"
    return normalized


def _session_key(session_id: str, framework: Optional[str]) -> str:
    normalized_framework = _normalizar_framework(framework)
    if normalized_framework:
        return f"{normalized_framework}:{session_id}"
    return session_id


def get_or_create_session(session_id: Optional[str], framework: Optional[str] = None) -> SessionState:
    if session_id:
        key = _session_key(session_id, framework)
        if key in _SESSIONS:
            return _SESSIONS[key]

    new_id = session_id or str(uuid.uuid4())
    key = _session_key(new_id, framework)
    state = SessionState(session_id=new_id, last_framework=framework)
    _SESSIONS[key] = state
    return state


def update_session(
    state: SessionState,
    comprension: str,
    dificultad: int,
    nivel: str,
    pregunta: Optional[str] = None,
    explicacion_esperada: Optional[str] = None,
    framework: Optional[str] = None,
) -> None:
    state.last_difficulty = dificultad
    state.last_level = nivel
    if pregunta:
        state.last_question = pregunta
    if explicacion_esperada:
        state.last_expected = explicacion_esperada
    if framework:
        state.last_framework = framework
    state.updated_at = time.time()
    state.history.append({
        "pregunta": pregunta,
        "comprension": comprension,
        "dificultad": dificultad,
        "nivel": nivel,
    })
    if len(state.history) > _MAX_HISTORY:
        state.history = state.history[-_MAX_HISTORY:]


def format_history(state: SessionState) -> str:
    if not state.history:
        return "Sin historial previo."

    lineas = []
    for idx, item in enumerate(state.history[-_MAX_HISTORY:], start=1):
        pregunta_corta = (item.get('pregunta') or '')[:100]
        pregunta_corta = pregunta_corta.replace('\n', ' ')
        lineas.append(
            f"{idx}. Ejercicio previo: {pregunta_corta}... | "
            f"Conceptos evaluados: {item.get('comprension', 'Sin concepto')} | "
            f"Dificultad: {item.get('dificultad', '-')}/10 ({item.get('nivel', '-')})."
        )

    return "\n".join(lineas)
