type GoogleAuthEnv = {
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
};

function normalizeEnvValue(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function getGoogleAuthProvider(env: GoogleAuthEnv = process.env as GoogleAuthEnv) {
  const clientId = normalizeEnvValue(env.AUTH_GOOGLE_ID);
  const clientSecret = normalizeEnvValue(env.AUTH_GOOGLE_SECRET);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

export function isGoogleAuthEnabled(env: GoogleAuthEnv = process.env as GoogleAuthEnv) {
  return getGoogleAuthProvider(env) !== null;
}
