import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetPasswordEmail(
  email,
  resetLink
) {
  try {
    console.log("📨 Intentando enviar email...");
    console.log("📨 DESTINO:", email);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Recuperar contraseña",
      html: `
        <h2>Recuperación de contraseña</h2>

        <p>Haz clic en el siguiente enlace:</p>

        <a href="${resetLink}">
          Restablecer contraseña
        </a>
      `,
    });

    console.log("✅ EMAIL ENVIADO");
    console.log("📨 MESSAGE ID:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ ERROR ENVIANDO EMAIL");
    console.error(error);

    throw error;
  }
}