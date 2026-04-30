const mysqldump = require('mysqldump');
const fs = require('fs');
const path = require('path');

// ==========================================
// FULL SQL DATABASE BACKUP
// ==========================================
exports.downloadDatabaseBackup = async (req, res) => {
    try {
        // .env eke thiyena DATABASE_URL eka break karala credentials gannawa
        const dbUrl = new URL(process.env.DATABASE_URL);
        const host = dbUrl.hostname;
        const port = dbUrl.port || 3306;
        
        // 🔥 FIX: Password eke thiyena special characters hariyata decode karaganna ona 🔥
        const user = decodeURIComponent(dbUrl.username);
        const password = decodeURIComponent(dbUrl.password);
        
        const database = dbUrl.pathname.substring(1); // Mulin thiyena '/' eka ain karanawa

        // Temporary SQL file eka save wena thana
        const backupFileName = `IMA_DB_BACKUP_${Date.now()}.sql`;
        const dumpPath = path.join(__dirname, `../storage/documents/${backupFileName}`);

        // SQL Dump eka generate karanawa
        await mysqldump({
            connection: { host, user, password, database, port },
            dumpToFile: dumpPath,
        });

        // Generate una file eka frontend ekata download wenna yawala, server eken delete karanawa
        res.download(dumpPath, backupFileName, (err) => {
            if (err) {
                console.error("Backup download error:", err);
            }
            // Memory eka full wenne nathi wenna file eka delete karanawa
            if (fs.existsSync(dumpPath)) {
                fs.unlinkSync(dumpPath);
            }
        });

    } catch (error) {
        console.error("Database backup failed:", error);
        res.status(500).json({ error: "Failed to generate database backup" });
    }
};