import GoogleAnalytics from "./google-analytics";
import ClarityAnalytics from "./clarity-analytics";
import { analyticsConfig } from "@/constants/website";

export type AnalyticsProps = {
  readonly forceEnableInDevelopment?: boolean;
};

export function Analytics({ forceEnableInDevelopment = false }: AnalyticsProps = {}) {
  const { enableInDevelopment } = analyticsConfig;

  if (
    process.env.NODE_ENV !== "production" &&
    !enableInDevelopment &&
    !forceEnableInDevelopment
  ) {
    return null;
  }

  return (
    <>
      <GoogleAnalytics />
      <ClarityAnalytics />
    </>
  );
}

export default Analytics;
