export const CANALES = [
  "formulario_web",
  "correo",
  "whatsapp",
  "redes_sociales",
];

export function canalValido(canal) {
  return CANALES.includes(canal);
}
