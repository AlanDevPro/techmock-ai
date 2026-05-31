"""
app/services/llm/prompts/__init__.py

"""

from app.services.llm.prompts.evaluacion_prompts import (
    build_code_analysis_prompt,
)

from app.services.llm.prompts.preguntas_prompts import (
    build_question_prompt,
)

__all__ = [
    "build_code_analysis_prompt",
    "build_question_prompt",
]

__version__ = "1.0.0"