const API_URL = "http://localhost:4000/api/v1";

export async function getTecnologias(token: string) {
  const res = await fetch(`${API_URL}/tecnologias`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error cargando tecnologías");
  }

  return res.json();
}