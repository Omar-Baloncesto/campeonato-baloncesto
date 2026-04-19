This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Panel privado de visitas (`/admin`)

El sitio registra cada visita (única por navegador y por día) en una hoja
`Visitas` del mismo spreadsheet de Google Sheets que usa el proyecto. Solo tú
puedes ver el conteo — el resto de usuarios no ve nada.

### Configuración

1. **Crea una hoja `Visitas`** en el spreadsheet con esta primera fila como
   encabezados: `timestamp | date | userAgent | referer`.
2. **Crea una Service Account en Google Cloud** con permiso de edición en
   Google Sheets API:
   - Google Cloud Console → IAM & Admin → Service Accounts → Create.
   - Habilita "Google Sheets API" en el proyecto.
   - En la service account, "Keys" → Add key → JSON → descarga.
   - Abre el spreadsheet en Google Sheets y **compártelo** con el
     `client_email` de la cuenta como Editor.
3. **Variables de entorno** (en Vercel o `.env.local`):
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: pega el JSON completo como una sola línea
     (escapa las comillas o usa Vercel UI que lo acepta tal cual).
   - `ADMIN_PASSWORD`: la contraseña que usarás para entrar a `/admin`.
   - `GOOGLE_SHEETS_API_KEY` (ya existía): se sigue usando para lecturas
     públicas del resto de hojas.

### Uso

- Abre `https://tu-dominio/admin` (no hay enlace en el menú — solo tú lo
  conoces). Ingresa la contraseña y verás visitas de hoy, total y de los
  últimos 30 días.
- La sesión dura 30 días por cookie `httpOnly`. Botón "Salir" para cerrarla.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
