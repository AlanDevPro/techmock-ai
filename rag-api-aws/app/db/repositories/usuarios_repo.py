from sqlalchemy import select
from app.db.models.usuario import Usuario

async def get_usuario_por_email(
    db,
    email: str
):
    result = await db.execute(
        select(Usuario)
        .where(Usuario.email == email)
    )

    return result.scalar_one_or_none()