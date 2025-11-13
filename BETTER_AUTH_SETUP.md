# Better Auth Integration Guide

## 🎯 Overview

This project has been integrated with **Better Auth** - a modern, secure authentication solution that replaces Firebase Authentication. Better Auth provides:

- ✅ Email/Password authentication
- ✅ Social OAuth providers (Google, GitHub)
- ✅ Session management with cookies
- ✅ MySQL database integration via Drizzle ORM
- ✅ Type-safe API
- ✅ React hooks for easy frontend integration

## 📦 Installation

### Backend (Already Configured)

The backend is already set up with Better Auth. The following packages are installed:

```bash
cd server
npm install
```

### Frontend

Install the Better Auth React client:

```bash
npm install better-auth
```

## 🔧 Configuration

### 1. Environment Variables

Create a `.env` file in the `server` directory (use `.env.example` as template):

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MySQL Database
DB_HOST=localhost
DB_PORT=3307
DB_USER=lofiuser
DB_PASSWORD=lofipass123
DB_NAME=lofitoapp

# Better Auth (REQUIRED)
BETTER_AUTH_SECRET=your-super-secret-change-in-production-min-32-chars
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Social Auth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 2. Frontend Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

## 🗄️ Database Setup

Better Auth requires specific database tables. Run the migration:

```bash
cd server
npm run db:push
```

This will create the following tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens
- `user_settings` - Custom user preferences
- `templates` - Lofi templates

## 🚀 Usage

### Backend API Endpoints

Better Auth automatically provides these endpoints:

#### Authentication
- `POST /api/auth/sign-up/email` - Register with email/password
- `POST /api/auth/sign-in/email` - Login with email/password
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

#### Social OAuth
- `GET /api/auth/sign-in/google` - Login with Google
- `GET /api/auth/sign-in/github` - Login with GitHub

#### User Management (Custom Routes)
- `GET /api/users/me` - Get current user data
- `PUT /api/users/me` - Update user profile
- `PUT /api/users/me/settings` - Update user settings

### Frontend Integration

#### 1. Using the New AuthProvider

Replace the Firebase `AuthProvider` with the new `BetterAuthProvider`:

```jsx
// In your index.js or App.js
import AuthProvider from '~/store/user/BetterAuthProvider';

function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
```

#### 2. Using the Auth Context

```jsx
import { useContext } from 'react';
import { AuthContext } from '~/store/user/BetterAuthProvider';

function MyComponent() {
  const { 
    currentUser, 
    login, 
    logout, 
    createUser,
    isAuthenticated 
  } = useContext(AuthContext);

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      console.log('Logged in!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {currentUser.name}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

#### 3. Direct Client Usage

You can also use the Better Auth client directly:

```jsx
import { authClient } from '~/lib/auth-client';

// Sign up
const handleSignUp = async () => {
  const result = await authClient.signUp.email({
    email: 'user@example.com',
    password: 'securePassword123',
    name: 'John Doe',
  });
};

// Sign in
const handleSignIn = async () => {
  const result = await authClient.signIn.email({
    email: 'user@example.com',
    password: 'securePassword123',
  });
};

// Get session
const { data: session } = await authClient.getSession();
```

## 🔐 Social OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:5000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

## 🔄 Migration from Firebase

The new `BetterAuthProvider` maintains the same API as the old Firebase `AuthProvider`, so most of your existing code should work without changes:

- ✅ `createUser(email, password)` - Same API
- ✅ `login(email, password)` - Same API
- ✅ `logout()` - Same API
- ✅ `currentUser` - Same structure
- ✅ `changeProfile(name)` - Same API
- ✅ `changeEmail(email)` - Same API
- ✅ `changePassword(oldPass, newPass)` - Updated signature
- ✅ `resetPassword(email)` - Same API

### Key Differences

1. **User Object Structure**: Better Auth uses slightly different field names:
   - `displayName` → `name`
   - `photoURL` → `image`
   - `uid` → `id`

2. **Session Management**: Better Auth uses HTTP-only cookies instead of Firebase tokens

3. **Password Change**: Now requires current password for security

## 🧪 Testing

### Test Email/Password Auth

```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Sign in
curl -X POST http://localhost:5000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get session (with cookies from sign-in)
curl -X GET http://localhost:5000/api/auth/session \
  --cookie "cookies-from-signin"
```

## 🛡️ Security Best Practices

1. **Always use HTTPS in production**
2. **Generate a strong BETTER_AUTH_SECRET** (min 32 characters)
3. **Enable email verification in production**
4. **Use environment variables for all secrets**
5. **Set secure cookie flags in production**
6. **Implement rate limiting for auth endpoints**
7. **Enable CORS only for trusted origins**

## 📚 Additional Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)

## 🐛 Troubleshooting

### "Invalid session" errors
- Check that cookies are being sent with requests
- Verify BETTER_AUTH_SECRET matches between server restarts
- Check CORS configuration

### Social OAuth not working
- Verify redirect URIs match exactly in provider settings
- Check that client ID and secret are correct
- Ensure provider is enabled in auth configuration

### Database connection errors
- Verify MySQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Run migrations: `npm run db:push`

## 🎉 Next Steps

1. Install dependencies: `npm install`
2. Set up environment variables
3. Run database migrations
4. Start the development server
5. Test authentication flows
6. (Optional) Configure social OAuth providers
7. Update your frontend components to use `BetterAuthProvider`

Happy coding! 🚀
