# Lofitoapp Backend API

Backend API para Lofitoapp - Migración de Firebase a MySQL con **Drizzle ORM**

## 🚀 Características

- ✅ **Drizzle ORM** - Type-safe database queries
- ✅ Autenticación JWT (reemplaza Firebase Auth)
- ✅ Base de datos MySQL (reemplaza Firestore)
- ✅ CRUD completo de usuarios
- ✅ CRUD completo de templates/plantillas
- ✅ Configuraciones de usuario
- ✅ Middleware de autenticación
- ✅ Validación de datos
- ✅ Manejo de errores
- ✅ Drizzle Studio para visualizar datos

## 📋 Requisitos

- Node.js 18+
- MySQL 8.0+
- Docker y Docker Compose (opcional)

## 🛠️ Instalación

### Opción 1: Con Docker (Recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

Esto iniciará:
- MySQL en puerto `3307`
- phpMyAdmin en `http://localhost:8081`
- Backend API en `http://localhost:5000`

### Opción 2: Manual

```bash
# Instalar dependencias
cd server
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar migraciones de Drizzle (primera vez)
npm run db:generate

# Aplicar migraciones (push directo a DB)
npm run db:push

# Iniciar servidor
npm start

# O en modo desarrollo con nodemon
npm run dev

# Abrir Drizzle Studio (opcional - visualizar datos)
npm run db:studio
```

## 🗄️ Base de Datos

### Acceder a phpMyAdmin

1. Abrir: `http://localhost:8081`
2. Usuario: `lofiuser`
3. Contraseña: `lofipass123`

### Conectar desde cliente MySQL

```bash
mysql -h 127.0.0.1 -P 3307 -u lofiuser -p
# Password: lofipass123
```

## 📡 API Endpoints

### Autenticación

#### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refrescar Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Usuarios

#### Obtener perfil actual
```http
GET /api/users/me
Authorization: Bearer {accessToken}
```

#### Actualizar perfil
```http
PUT /api/users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "displayName": "New Name",
  "photoURL": "https://example.com/photo.jpg"
}
```

#### Actualizar configuración
```http
PUT /api/users/me/settings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "theme": "dark",
  "volume": 75,
  "autoplay": true,
  "preferences": {
    "favoriteGenre": "chill"
  }
}
```

#### Cambiar contraseña
```http
PUT /api/users/me/password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

### Templates

#### Obtener templates del usuario
```http
GET /api/templates
Authorization: Bearer {accessToken}
```

#### Obtener templates públicos
```http
GET /api/templates?public=true
```

#### Obtener template específico
```http
GET /api/templates/:id
Authorization: Bearer {accessToken}
```

#### Crear template
```http
POST /api/templates
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "My Chill Mix",
  "description": "Perfect for studying",
  "config": {
    "tracks": ["track1", "track2"],
    "ambience": "rain",
    "theme": "night"
  },
  "isPublic": false
}
```

#### Actualizar template
```http
PUT /api/templates/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Name",
  "isPublic": true
}
```

#### Eliminar template
```http
DELETE /api/templates/:id
Authorization: Bearer {accessToken}
```

## 🔄 Migración desde Firebase

### Equivalencias de servicios

| Firebase | MySQL Backend |
|----------|---------------|
| `createUserWithEmailAndPassword()` | `POST /api/auth/register` |
| `signInWithEmailAndPassword()` | `POST /api/auth/login` |
| `signOut()` | Cliente elimina tokens |
| `updateProfile()` | `PUT /api/users/me` |
| `updatePassword()` | `PUT /api/users/me/password` |
| `sendPasswordResetEmail()` | `POST /api/auth/reset-password` |
| `getDoc(users, uid)` | `GET /api/users/me` |
| `setDoc(users, uid, data)` | `POST /api/auth/register` |
| `updateDoc(users, uid, data)` | `PUT /api/users/me` |

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt (salt rounds: 10)
- JWT con expiración (1h para access, 7d para refresh)
- Validación de entrada en todos los endpoints
- Protección contra SQL injection (prepared statements)
- CORS configurado

## 🐛 Debug

Ver logs del contenedor:
```bash
docker-compose logs -f backend
```

Ver logs de MySQL:
```bash
docker-compose logs -f mysql
```

## 📝 Notas

- El puerto MySQL es `3307` en el host (para evitar conflictos con instalaciones locales)
- El script `init.sql` crea las tablas automáticamente
- Se incluye un usuario de prueba: `test@lofitoapp.com` / `test123`
- Cambiar `JWT_SECRET` en producción

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request
