import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import MobileNav from "./components/MobileNav";
import ScrollToTop from "./components/ScrollToTop";
import ThemeProvider from "./components/ThemeProvider";
import ToastProvider from "./components/ToastProvider";
import ConnectionStatus from "./components/ConnectionStatus";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campeonato Baloncesto - Cucuta 2026",
  description: "Campeonato de Baloncesto de Cucuta - Primer Semestre 2026. Posiciones, fixture, estadisticas y mas.",
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
        <ThemeProvider>
          <ToastProvider>
            <ConnectionStatus />
            <Header />
            <Navigation />
            <main className="flex-1">
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
