# Ticket Control Board

Aplicación interna de gestión de tickets estilo JIRA, con autenticación por contraseña, roles, dashboard operativo, auditoría y webhooks firmados.

## Mejoras implementadas

- autenticación reforzada con `scrypt`
- bloqueo temporal tras intentos fallidos
- cambio obligatorio de contraseña cuando corresponda
- sesiones con cookie `HttpOnly` y `SameSite=Strict`
- cabeceras de seguridad (`CSP`, `X-Frame-Options`, `nosniff`, etc.)
- compatibilidad con bases de datos antiguas y migración en arranque
- webhooks validados con HTTPS, protección básica anti-SSRF y firma HMAC
- secretos de webhooks cifrados en reposo
- registro de entregas de webhooks
- endpoint de salud y smoke test simple
- soporte para servir archivos estáticos tanto desde la raíz del proyecto como desde `public/`

## Requisitos

- Node.js 22 o superior

## Configuración

Copia `.env.example` a `.env` si quieres personalizar el arranque. Variables principales:

- `PORT`: puerto HTTP
- `NODE_ENV`: usa `production` en despliegue real
- `DATA_DIR`: carpeta donde se guarda la base SQLite y secretos locales
- `SESSION_DURATION_HOURS`: duración de sesión
- `TICKET_APP_DEFAULT_PASSWORD`: contraseña temporal inicial para cuentas seed
- `WEBHOOK_TIMEOUT_MS`: timeout de entregas webhook
- `WEBHOOK_ALLOWLIST`: lista separada por comas de hosts permitidos para webhooks

## Arranque

```bash
npm start
```

Luego abre `http://localhost:3000`.

## Contraseña inicial

Las cuentas seed usan la contraseña definida por `TICKET_APP_DEFAULT_PASSWORD` y quedan marcadas para cambio obligatorio en el siguiente inicio de sesión.

## Smoke test

Con la app levantada:

```bash
npm run smoke
```

## Notas operativas

- La base histórica `tickets.db` en la raíz se copia automáticamente a `data/tickets.db` si todavía no existe una base en `data/`.
- Los secretos internos de la aplicación se guardan en `data/.app-secrets.json`.
- En producción, sirve la app detrás de HTTPS y configura `NODE_ENV=production`.
