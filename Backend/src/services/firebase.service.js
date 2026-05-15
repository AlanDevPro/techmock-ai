// services/firebase.service.js
/**
 * Responsabilidad única: verificar tokens de Firebase y normalizar los datos del usuario.
 * NO hace lógica de DB, NO genera JWT — eso es responsabilidad de auth.service.js
 */
import admin from "../config/firebase.js";

const FIREBASE_ERROR_MAP = {
  "auth/id-token-expired":  { msg: "Token expirado, inicia sesión nuevamente", status: 401 },
  "auth/invalid-id-token":  { msg: "Token inválido",                           status: 401 },
  "auth/argument-error":    { msg: "Token mal formado",                         status: 400 },
  "auth/user-disabled":     { msg: "Cuenta de usuario deshabilitada",           status: 403 },
};

/**
 * Verifica el ID token de Firebase y retorna los datos normalizados del usuario.
 * @param {string} firebaseToken - Token JWT de Firebase
 * @returns {{ email, nombre, apellido, avatar_url, email_verificado, provider, provider_uid }}
 */
export async function verifyAndNormalizeFirebaseToken(firebaseToken) {
  let decoded;

  try {
    decoded = await admin.auth().verifyIdToken(firebaseToken);
    console.log("✅ [FIREBASE SERVICE] Token verificado:", {
      uid: decoded.uid,
      email: decoded.email,
      sign_in_provider: decoded.firebase?.sign_in_provider,
    });
  } catch (error) {
    console.error("❌ [FIREBASE SERVICE] Token inválido:", error.code, error.message);
    const mapped = FIREBASE_ERROR_MAP[error.code];
    throw Object.assign(
      new Error(mapped?.msg ?? `Error de autenticación Firebase: ${error.message}`),
      { status: mapped?.status ?? 401, code: error.code }
    );
  }

  // Normalizar provider
  const signInProvider = decoded.firebase?.sign_in_provider;
  const provider = signInProvider === "github.com" ? "github"
                 : signInProvider === "google.com"  ? "google"
                 : signInProvider; // soporte futuro a otros providers

  // Normalizar nombre/apellido
  const nombreCompleto = (decoded.name || decoded.email.split("@")[0]).trim();
  const [nombre, ...rest] = nombreCompleto.split(" ");
  const apellido = rest.join(" ") || null;

  return {
    email:            decoded.email,
    nombre:           nombre || null,
    apellido:         apellido,
    avatar_url:       decoded.picture ?? null,
    email_verificado: decoded.email_verified ?? false,
    provider,
    provider_uid:     decoded.uid,
  };
}