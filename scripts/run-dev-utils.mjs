export const MALLOC_STACK_LOGGING_WARNING =
  "MallocStackLogging: can't turn off malloc stack logging because it was not enabled.";

const DEV_ENV_KEYS_TO_STRIP = [
  "npm_config_verify_deps_before_run",
  "NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN",
  "npm_config__jsr_registry",
  "NPM_CONFIG__JSR_REGISTRY",
  "MallocStackLogging",
  "MallocStackLoggingNoCompact",
  "MallocScribble",
  "MallocGuardEdges",
  "MallocCheckHeapStart",
  "MallocCheckHeapEach",
  "MallocCheckHeapAbort",
  "MallocErrorAbort",
  "MallocNanoZone",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "DYLD_INSERT_LIBRARIES",
];

const NEXT_DEV_FLAG_KEYS = new Set(["--webpack", "--turbopack", "--turbo"]);

export function sanitizeDevEnv(env = process.env) {
  const cleanEnv = { ...env };

  for (const key of DEV_ENV_KEYS_TO_STRIP) {
    if (key in cleanEnv) {
      delete cleanEnv[key];
    }
  }

  return cleanEnv;
}

export function resolveNextDevArgs(argv = [], env = process.env) {
  const userArgs = Array.isArray(argv) ? [...argv] : [];
  const useWebpack = env.NEXT_DEV_BUNDLER === "webpack" || userArgs.includes("--webpack");
  const useTurbopack =
    !useWebpack &&
    (env.NEXT_DEV_BUNDLER === "turbopack" ||
      userArgs.includes("--turbopack") ||
      userArgs.includes("--turbo"));

  const nextArgs = ["dev"];

  if (useWebpack) {
    nextArgs.push("--webpack");
  } else if (useTurbopack) {
    nextArgs.push("--turbopack");
  }

  nextArgs.push(...userArgs.filter((arg) => !NEXT_DEV_FLAG_KEYS.has(arg)));

  return nextArgs;
}

export function isMallocStackLoggingNoise(line) {
  return line.includes(MALLOC_STACK_LOGGING_WARNING);
}
