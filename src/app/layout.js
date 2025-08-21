// --- src/app/layout.js (Success Cockpit) ---
import "./globals.css";
// import './lib/SharedComponents.css'; // TODO: Create if needed
import './lib/errorHandling.css';
import { Inter, Poppins } from 'next/font/google';
import ThemeProvider from './components/ThemeProvider';
import ErrorBoundary from './shared/components/ErrorBoundary';
// import { AppStateProvider } from './lib/AppStateContext'; // TODO: Create if needed
import { ErrorProvider, ErrorNotifications } from './lib/errorHandling';
import { MonitoringProvider, RealUserMonitoring } from './lib/monitoring';
import { PerformanceMonitor, registerServiceWorker } from './lib/performanceOptimization';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-body', 
  display: 'swap',
  preload: true
});

const poppins = Poppins({ 
  subsets: ['latin'], 
  variable: '--font-heading', 
  weight: ['600', '700'], 
  display: 'swap',
  preload: true
});

export const metadata = {
  title: "VIP Command Center | The Mike Salazar Academy",
  description: "Advanced administrative dashboard for managing VIP students, courses, analytics, and educational platform operations. Private access only.",
  keywords: "admin dashboard, VIP management, student analytics, course administration, educational platform management",
  authors: [{ name: "The Mike Salazar Academy" }],
  creator: "The Mike Salazar Academy",
  publisher: "The Mike Salazar Academy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_COMMAND_CENTER_URL || 'https://admin.mikesalazaracademy.com'),
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
    },
  },
  openGraph: {
    title: "VIP Command Center | The Mike Salazar Academy",
    description: "Private administrative dashboard for VIP platform management.",
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: "VIP Command Center",
    description: "Private administrative dashboard.",
  },
};

export default function RootLayout({ children }) {
  // Register service worker for performance and offline functionality
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }

  return (
    <html lang="en">
      <head>
        <link rel="preload" href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDD4Z1xlFQ.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} ${poppins.variable}`}>
        <MonitoringProvider>
          <ErrorProvider>
            <ErrorBoundary>
              <PerformanceMonitor>
                <ThemeProvider>
                  {children}
                  <ErrorNotifications />
                  <RealUserMonitoring />
                </ThemeProvider>
              </PerformanceMonitor>
            </ErrorBoundary>
          </ErrorProvider>
        </MonitoringProvider>
      </body>
    </html>
  );
}