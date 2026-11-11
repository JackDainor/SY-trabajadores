# SY CROP – Trabajadores

PWA para el taller: los **trabajadores** registran cortes (foto, proveedor, prendas, defectos) y ven cuánto llevan ganado en el mes. El **admin** gestiona equipos, proveedores, precios, vales y ve todo el historial.

## Modelo de pago

| Equipo | Login | Cómo se paga | Vales |
|--------|-------|--------------|--------|
| **Pareja** (`unidad`) | 1 PIN compartido | Prendas válidas × **R$1,40** (configurable) | 1 vale del equipo |
| **Grupo de 3** (`por_maquina`) | PIN por persona | Roles fijos: **recta R$1,00** / **over R$0,40** | Vale personal |

Prendas válidas = prendas declaradas − defectos.  
Una vez **confirmado**, el corte no lo puede editar ni borrar el trabajador (el admin puede anularlo con motivo).

## Stack

- Next.js 14 (App Router)
- Neon (PostgreSQL)
- Auth por **PIN numérico** (cookie httpOnly + JWT)
- Deploy en **Vercel**

## 1. Neon

1. Creá un proyecto en [neon.tech](https://neon.tech).
2. Copiá la connection string (`DATABASE_URL`).
3. En la consola SQL de Neon, pegá y ejecutá el archivo `schema.sql`  
   **o** desde tu máquina:

```bash
npm install
DATABASE_URL="postgresql://..." ADMIN_PIN=1234 node scripts/setup-db.js
```

Eso crea tablas + usuario **Admin** con el PIN que indiques (default `1234`).

## 2. Variables de entorno

En Vercel (Settings → Environment Variables) y en local (`.env.local`):

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
AUTH_SECRET=un-texto-largo-aleatorio-de-al-menos-32-caracteres
```

## 3. GitHub + Vercel

1. Creá un repo vacío **SY-CROP-Trabajadores** (o el nombre que quieras).
2. Subí **todo el contenido de esta carpeta** a la raíz del repo.
3. En Vercel → Import Project → ese repo.
4. Framework: **Next.js** (detectado solo).
5. Agregá las dos variables de entorno.
6. Deploy.

## 4. Primer uso (orden recomendado)

1. Entrá con el PIN de **Admin**.
2. **Ajustes** → cambiá el PIN del admin.
3. **Proveedores** → cargá los proveedores.
4. **Personal** → creá trabajadores (nombre + PIN).
5. **Equipos**:
   - Pareja: modo **unidad**, añadí **un** usuario (login compartido) o los dos si más adelante querés usuarios separados.
   - Grupo 3: modo **por máquina**, añadí 3 personas con rol **recta** / **recta** / **over**.
6. Los trabajadores entran con su PIN → **Registrar corte**.

## 5. Flujo del trabajador

1. Foto (opcional), título, proveedor, cantidad, defectos (default no).
2. **Guardar** → aviso *“¿Seguro? Después no se puede editar”* (casilla para no volver a mostrar).
3. Historial + resumen del mes (producido − vales = a recibir).

## Estructura

```
app/           páginas y API
lib/           db, auth, money
public/        logo e iconos PWA
schema.sql     tablas Neon
scripts/       setup-db.js
```

## Notas

- Las fotos se guardan comprimidas en la base (JPEG). Si el volumen crece mucho, migrar a Vercel Blob o S3.
- No hay sincronización automática con la app de proveedores/costura anterior; los proveedores se cargan a mano en este admin.
- Cambiá siempre el PIN de admin después del primer login.
