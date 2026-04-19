import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import MobileNav from "./components/MobileNav";
import ScrollToTop from "./components/ScrollToTop";
import ThemeProvider from "./components/ThemeProvider";
import ToastProvider from "./components/ToastProvider";
import ConnectionStatus from "./components/ConnectionStatus";
import VisitTracker from "./components/VisitTracker";

const geistSans = localFont({
  src: "../public/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Campeonato Baloncesto - Cucuta 2026",
  description: "Campeonato de Baloncesto de Cucuta - Primer Semestre 2026. Posiciones, fixture, estadísticas y más.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Baloncesto",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#F5B800" />
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-gold focus:text-black focus:font-semibold focus:text-sm focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <ThemeProvider>
          <ToastProvider>
            <ConnectionStatus />
            <VisitTracker />
            <Header />
            <Navigation />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <footer className="py-5 text-center border-t border-border-subtle">
              <div className="text-[11px] text-text-muted/60 tracking-[0.25em] uppercase">
                Campeonato · Baloncesto · Cucuta 2026
              </div>
            </footer>
            <MobileNav />
            <ScrollToTop />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
