import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'jx_idle',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false
});

export async function initDatabaseSchema() {
  const connection = await pool.getConnection();
  try {
    try {
      await connection.query('ALTER TABLE `c_snapshot` DROP FOREIGN KEY `FK_SNAP_CHAR`;');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE `c_data` DROP FOREIGN KEY `FK_DATA_CHAR`;');
    } catch (e) {}

    await connection.query('DROP TABLE IF EXISTS `c_data_old`;');
    await connection.query('DROP TABLE IF EXISTS `u_profile`;');
    await connection.query('DROP TABLE IF EXISTS `c_profile`;');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`c_data\` (
        \`ID\` INT NOT NULL AUTO_INCREMENT,
        \`USERNAME\` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`PASSWD\` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`DATA\` LONGTEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`STATUS\` ENUM('NORMAL', 'FORBID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
        \`CURRENT\` ENUM('ONLINE', 'OFFLINE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFLINE',
        \`SESSION_ID\` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`LAST_SEEN\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`CREATED_AT\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`UPDATED_AT\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`UPDATED_MS\` BIGINT DEFAULT 0,
        PRIMARY KEY (\`ID\`),
        UNIQUE KEY \`UNIQ_USERNAME\` (\`USERNAME\`),
        KEY \`IDX_STATUS\` (\`STATUS\`),
        KEY \`IDX_CURRENT\` (\`CURRENT\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query('ALTER TABLE `c_data` ADD COLUMN IF NOT EXISTS `UPDATED_MS` BIGINT DEFAULT 0;');
    } catch (e) {
      try {
        await connection.query('ALTER TABLE `c_data` ADD COLUMN `UPDATED_MS` BIGINT DEFAULT 0;');
      } catch (err) {}
    }

    // 4. Clean recreate c_snapshot table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`c_snapshot\` (
        \`CHARACTER_ID\` INT NOT NULL,
        \`SNAP_DATA\` JSON NOT NULL,
        \`UPDATED_AT\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`CHARACTER_ID\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[MySQL] Database initialized. Schema verified for c_data and c_snapshot.');
  } finally {
    connection.release();
  }
}

// Periodic cleanup of stale online sessions (every 30 seconds)
setInterval(async () => {
  try {
    await pool.query(`
      UPDATE \`c_data\`
      SET \`CURRENT\` = 'OFFLINE'
      WHERE \`CURRENT\` = 'ONLINE' AND \`LAST_SEEN\` < DATE_SUB(NOW(), INTERVAL 45 SECOND);
    `);
  } catch (err) {}
}, 30000);
