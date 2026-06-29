const toBoolean = (value: string | undefined): boolean =>
  value?.toLowerCase() === "true";

const DEFAULT_APP_URL = "http://localhost:3000";

export const analyticsConfig = {
  enableInDevelopment: toBoolean(process.env.NEXT_PUBLIC_ANALYTICS_ENABLE_IN_DEVELOPMENT),
};

export const websiteConfig = {
  appName: "Sistine AI",
  docsName: "Sistine Docs",
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).trim(),
};
