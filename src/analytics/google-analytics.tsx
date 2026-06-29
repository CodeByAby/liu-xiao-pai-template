import Script from "next/script";

export type GoogleAnalyticsProps = {
  readonly trackingId?: string;
};

export default function GoogleAnalytics({ trackingId }: GoogleAnalyticsProps = {}) {
  const gaTrackingId = trackingId ?? process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  if (!gaTrackingId) {
    return null;
  }

  const sanitizedId = gaTrackingId.trim();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(sanitizedId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${sanitizedId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
