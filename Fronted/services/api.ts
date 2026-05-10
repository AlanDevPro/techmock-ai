const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://92b0-181-188-158-242.ngrok-free.app";

export async function runCode(code: string, language: string) {
  const res = await fetch(`${API_URL}/execution/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, language }),
  });

  if (!res.ok) {
    throw new Error("Error en ejecución");
  }

  return res.json();
}