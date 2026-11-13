import { cleanEnv, num, port, str, url } from "envalid";

const validators = {
  OPENAI_API_KEY: str({ desc: "es obligatoria" }),
  DATABASE_URL: url({
    desc: "es obligatoria (postgres://usuario:clave@localhost:5432/origentours)",
  }),
  LLM_MODEL: str({ desc: "es obligatoria" }),
  LLM_TIMEOUT_MS: num({ desc: "es obligatoria y debe ser un número" }),
  LLM_TEMPERATURE: num({ desc: "es obligatoria y debe ser un número" }),
  PORT: port({ default: 3001 }),
};

function describeProblem(name, error) {
  const message = error?.message?.trim();
  if (!message || message === "undefined") {
    return `- ${name}: es obligatoria`;
  }

  return `- ${name}: ${message}`;
}

function reportEnvErrors({ errors }) {
  const names = Object.keys(errors ?? {});
  if (names.length === 0) {
    return;
  }

  const details = names
    .map((name) => describeProblem(name, errors[name]))
    .join("\n");

  throw new Error(
    `Configuración de entorno inválida. Revisa backend/.env:\n${details}`,
  );
}

export function loadConfig(env = process.env) {
  return cleanEnv(env, validators, { reporter: reportEnvErrors });
}
