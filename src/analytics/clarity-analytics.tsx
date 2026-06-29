import Script from "next/script";

export type ClarityAnalyticsProps = {
  readonly projectId?: string;
};

export default function ClarityAnalytics({ projectId }: ClarityAnalyticsProps = {}) {
  const clarityProjectId = projectId ?? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  if (!clarityProjectId) {
    return null;
  }

  const sanitizedId = clarityProjectId.trim();

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);
          t.async=1;
          t.src="https://www.clarity.ms/tag/${sanitizedId}";
          y=l.getElementsByTagName(r)[0];
          y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${sanitizedId}");
      `}
    </Script>
  );
}
