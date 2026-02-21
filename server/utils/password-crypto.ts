import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.PASSWORD_SECRET_KEY || "fallback-secret";

if (!process.env.PASSWORD_SECRET_KEY) {
  console.warn("⚠️  PASSWORD_SECRET_KEY non définie");
}

export function encryptPassword(password: string): string {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

export function decryptPassword(encryptedPassword: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Erreur décryptage password:", error);
    return "";
  }
}
