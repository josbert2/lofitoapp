# 🔄 Migración Completa: Firebase → MySQL + Drizzle + Better Auth

## ✅ Estado de la Migración

**Estado**: ✅ **MIGRACIÓN COMPLETA** - Backend y Frontend actualizados

---

## 📋 Resumen de Cambios

### Backend (Servidor)

#### ✅ Base de Datos
- **Antes**: Firebase Firestore (NoSQL en la nube)
- **Ahora**: MySQL 8.0 (SQL local con Docker)
- **ORM**: Drizzle ORM para type-safety y migraciones

#### ✅ Autenticación
- **Antes**: Firebase Authentication
- **Ahora**: Better Auth con sesiones en MySQL
- **Características**:
  - Email/Password authentication
  - Google OAuth (opcional)
  - GitHub OAuth (opcional)
  - Sesiones con cookies HTTP-only
  - Tokens seguros en base de datos

#### ✅ Estructura de Tablas

```sql
-- Better Auth (autenticación)
user              → Usuarios
session           → Sesiones activas
account           → Cuentas OAuth
verification      → Tokens de verificación

-- Lofitoapp (aplicación)
templates         → Templates guardados
user_settings     → Configuraciones de usuario
```

### Frontend (React)

#### ✅ Servicios Actualizados

**Nuevos Servicios API** (reemplazan Firebase):
- `src/services/api.js` - Cliente Axios configurado
- `src/services/userService.js` - Gestión de usuarios
- `src/services/templateService.js` - Gestión de templates
- `src/services/firebase-compat.js` - Capa de compatibilidad

#### ✅ Autenticación Actualizada

**Nuevo AuthProvider**:
- `src/store/user/BetterAuthProvider.js` - Reemplaza Firebase AuthProvider
- `src/lib/auth-client.js` - Cliente de Better Auth
- `src/hooks/useAuth.js` - Hook personalizado
- `src/components/Auth/` - Componentes de login/signup

**API Compatible**: El nuevo `BetterAuthProvider` mantiene la misma API que el antiguo Firebase provider:
```javascript
// ✅ Mismo código funciona con Better Auth
const { currentUser, login, logout, createUser } = useAuth();
```

#### ✅ Componentes Actualizados

Los siguientes componentes ya usan los nuevos servicios:
- ✅ `SaveTemplate.jsx` - Usa `userService`
- ✅ `TemplateDialog.jsx` - Usa `userService`
- ✅ `SignUp.jsx` - Usa `userService`
- ✅ `store/user/index.js` - Exporta `BetterAuthProvider`

---

## 🚀 Configuración y Uso

### 1. Variables de Entorno

#### Backend (`server/.env`)
```env
# MySQL Database
DB_HOST=localhost
DB_PORT=3307
DB_USER=lofiuser
DB_PASSWORD=lofipass123
DB_NAME=lofitoapp

# Better Auth
BETTER_AUTH_SECRET=tu-secreto-super-seguro-minimo-32-caracteres
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# OAuth (Opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

#### Frontend (`.env`)
```env
REACT_APP_API_URL=http://localhost:5000
```

### 2. Iniciar el Proyecto

#### Opción A: Script Automático
```bash
./setup-better-auth.sh
```

#### Opción B: Manual
```bash
# 1. Iniciar Docker
docker-compose up -d

# 2. Ejecutar migración de base de datos
docker-compose exec mysql mysql -u lofiuser -plofipass123 lofitoapp < server/database/better-auth-migration.sql

# 3. Instalar dependencias
npm install
cd server && npm install && cd ..

# 4. Iniciar servidores
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
npm start
```

---

## 📊 Comparación de APIs

### Autenticación

| Operación | Firebase | Better Auth + MySQL |
|-----------|----------|---------------------|
| **Sign Up** | `createUserWithEmailAndPassword()` | `createUser(email, password, name)` |
| **Login** | `signInWithEmailAndPassword()` | `login(email, password)` |
| **Logout** | `signOut()` | `logout()` |
| **Current User** | `auth.currentUser` | `currentUser` (del context) |
| **Session** | Token JWT en localStorage | Cookie HTTP-only segura |

### Datos de Usuario

| Operación | Firebase | Better Auth + MySQL |
|-----------|----------|---------------------|
| **Obtener usuario** | `getDoc(doc(db, 'users', uid))` | `getCurrentUser()` |
| **Actualizar usuario** | `updateDoc(doc(db, 'users', uid), data)` | `updateUser(data)` |
| **Escuchar cambios** | `onSnapshot(userRef, callback)` | Polling automático cada 30s |

### Templates

| Operación | Firebase | Better Auth + MySQL |
|-----------|----------|---------------------|
| **Crear template** | Actualizar array en Firestore | `createTemplate(data)` |
| **Obtener templates** | Leer de documento user | `getUserTemplates()` |
| **Actualizar template** | Actualizar array en Firestore | `updateTemplate(id, data)` |
| **Eliminar template** | Filtrar array en Firestore | `deleteTemplate(id)` |

---

## 🔧 Cambios en el Código

### Antes (Firebase)
```javascript
import { auth, db } from '~/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

// Actualizar usuario
const userRef = doc(db, 'users', userId);
await updateDoc(userRef, { name: 'New Name' });
```

### Ahora (Better Auth + MySQL)
```javascript
import { updateUser } from '~/services/userService';

// Actualizar usuario
await updateUser({ name: 'New Name' });
```

---

## 🗂️ Estructura de Archivos

### Nuevos Archivos Creados

```
lofitoapp/
├── server/
│   ├── config/
│   │   └── database.js              ✅ Conexión MySQL + Drizzle
│   ├── db/
│   │   ├── auth-schema.js           ✅ Esquema Better Auth
│   │   └── schema.js                ✅ Esquema completo
│   ├── lib/
│   │   └── auth.js                  ✅ Configuración Better Auth
│   ├── middleware/
│   │   └── auth.js                  ✅ Middleware de autenticación
│   ├── routes/
│   │   ├── auth.js                  ✅ Rutas de autenticación
│   │   ├── users.js                 ✅ Rutas de usuarios
│   │   └── templates.js             ✅ Rutas de templates
│   ├── database/
│   │   └── better-auth-migration.sql ✅ Script de migración
│   └── .env.example                 ✅ Variables de entorno
├── src/
│   ├── lib/
│   │   └── auth-client.js           ✅ Cliente Better Auth
│   ├── services/
│   │   ├── api.js                   ✅ Cliente Axios
│   │   ├── userService.js           ✅ Servicio de usuarios
│   │   ├── templateService.js       ✅ Servicio de templates
│   │   └── firebase-compat.js       ✅ Compatibilidad
│   ├── store/user/
│   │   └── BetterAuthProvider.js    ✅ Nuevo AuthProvider
│   ├── hooks/
│   │   └── useAuth.js               ✅ Hook personalizado
│   └── components/Auth/
│       ├── BetterAuthLogin.jsx      ✅ Login component
│       ├── BetterAuthSignup.jsx     ✅ Signup component
│       └── ProtectedRoute.jsx       ✅ Rutas protegidas
├── docker-compose.yml               ✅ MySQL + phpMyAdmin
├── setup-better-auth.sh             ✅ Script de setup
├── BETTER_AUTH_SETUP.md             ✅ Guía de setup
└── BETTER_AUTH_INTEGRATION_SUMMARY.md ✅ Resumen

### Archivos Deprecados (No eliminar aún)

```
src/
├── firebase/
│   ├── config.js                    ⚠️ Deprecado (mantener por compatibilidad)
│   └── services.js                  ⚠️ Deprecado (mantener por compatibilidad)
└── store/user/
    └── AuthProvider.js              ⚠️ Deprecado (Firebase version)
```

---

## ✅ Checklist de Migración

### Backend
- [x] MySQL configurado con Docker
- [x] Drizzle ORM instalado y configurado
- [x] Better Auth instalado y configurado
- [x] Esquemas de base de datos creados
- [x] Rutas de API implementadas
- [x] Middleware de autenticación implementado
- [x] Variables de entorno configuradas

### Frontend
- [x] Better Auth React client instalado
- [x] Servicios de API creados
- [x] BetterAuthProvider implementado
- [x] Componentes de autenticación creados
- [x] Hook useAuth creado
- [x] Store actualizado para usar BetterAuthProvider
- [x] Componentes principales actualizados

### Documentación
- [x] Guía de setup (BETTER_AUTH_SETUP.md)
- [x] Resumen de integración (BETTER_AUTH_INTEGRATION_SUMMARY.md)
- [x] Guía de migración (este archivo)
- [x] Script de setup automático

---

## 🧪 Testing

### 1. Verificar Base de Datos
```bash
# Acceder a MySQL
docker-compose exec mysql mysql -u lofiuser -plofipass123 lofitoapp

# Verificar tablas
SHOW TABLES;

# Ver estructura de tabla user
DESCRIBE user;
```

### 2. Probar Autenticación

#### Registro
```bash
curl -X POST http://localhost:5000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

#### Obtener sesión
```bash
curl -X GET http://localhost:5000/api/auth/session \
  -b cookies.txt
```

### 3. Probar en la Aplicación
1. Abrir http://localhost:3000
2. Ir a la página de registro
3. Crear una cuenta
4. Verificar que se guarda en MySQL
5. Cerrar sesión
6. Iniciar sesión nuevamente
7. Verificar que los datos persisten

---

## 🎯 Beneficios de la Migración

### ✅ Control Total
- Base de datos local (no depende de servicios externos)
- Acceso directo a SQL para consultas complejas
- Backups y restauración simples

### ✅ Rendimiento
- Latencia reducida (servidor local)
- Consultas SQL optimizadas
- Sin límites de lectura/escritura

### ✅ Costo
- Sin costos de Firebase
- Infraestructura propia
- Escalable según necesidades

### ✅ Desarrollo
- Desarrollo offline posible
- Debugging más fácil
- Type-safety con Drizzle ORM

### ✅ Seguridad
- Cookies HTTP-only (más seguras que localStorage)
- Control total sobre autenticación
- CSRF protection incluida

---

## 🆘 Solución de Problemas

### Error: "Cannot connect to MySQL"
```bash
# Verificar que Docker está corriendo
docker-compose ps

# Reiniciar contenedores
docker-compose down
docker-compose up -d
```

### Error: "Invalid session"
- Verificar que `BETTER_AUTH_SECRET` está configurado
- Limpiar cookies del navegador
- Verificar que el backend está corriendo

### Error: "Table doesn't exist"
```bash
# Ejecutar migración nuevamente
docker-compose exec mysql mysql -u lofiuser -plofipass123 lofitoapp < server/database/better-auth-migration.sql
```

### phpMyAdmin no carga
- Verificar en http://localhost:8081
- Usuario: `lofiuser`
- Contraseña: `lofipass123`

---

## 📚 Recursos Adicionales

- [Better Auth Docs](https://www.better-auth.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [MySQL 8.0 Docs](https://dev.mysql.com/doc/refman/8.0/en/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

## 🎉 Conclusión

La migración de Firebase a MySQL + Drizzle + Better Auth está **COMPLETA**. 

Tu aplicación ahora:
- ✅ Usa MySQL local con Docker
- ✅ Tiene autenticación con Better Auth
- ✅ Usa Drizzle ORM para type-safety
- ✅ Mantiene compatibilidad con código existente
- ✅ Está lista para desarrollo y producción

**Próximos pasos**:
1. Configurar `BETTER_AUTH_SECRET` en `server/.env`
2. Ejecutar `./setup-better-auth.sh`
3. Probar la aplicación
4. (Opcional) Configurar OAuth con Google/GitHub
5. (Opcional) Eliminar dependencias de Firebase cuando estés seguro

---

**¿Necesitas ayuda?** Revisa:
- `BETTER_AUTH_SETUP.md` - Guía detallada de setup
- `BETTER_AUTH_INTEGRATION_SUMMARY.md` - Resumen de integración
- Este archivo - Guía completa de migración
