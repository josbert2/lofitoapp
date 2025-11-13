const { drizzle } = require("drizzle-orm/mysql2");
const mysql = require("mysql2/promise");
const schema = require("../db/schema");

// Crear pool de conexiones MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'lofiuser',
    password: process.env.DB_PASSWORD || 'lofipass123',
    database: process.env.DB_NAME || 'lofitoapp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Inicializar Drizzle ORM con el pool
const db = drizzle(pool, { schema, mode: 'default' });

// Función para verificar la conexión
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully (Drizzle ORM)');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ MySQL Database connection failed:', error.message);
        return false;
    }
};

// Test connection on startup
testConnection();

// Cerrar conexión al terminar el proceso
process.on("SIGINT", async () => {
    await pool.end();
    console.log('🔌 Database connection closed');
    process.exit(0);
});

module.exports = { db, pool };
