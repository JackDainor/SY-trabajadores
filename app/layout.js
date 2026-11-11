import './globals.css';

export const metadata = {
  title: 'SY CROP – Trabajadores',
  description: 'Registro de producción y ganancias para el taller SY CROP',
  manifest: '/manifest.json',
  themeColor: '#193b32',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SY CROP',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icon-180.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#193b32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
