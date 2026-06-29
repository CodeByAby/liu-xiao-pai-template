import Link from 'next/link';
import { defaultLocale } from '@/i18n.config';

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for doesn&apos;t exist.</p>
          <Link href={`/${defaultLocale}`}>
            Go to Homepage
          </Link>
        </div>
      </body>
    </html>
  );
}
