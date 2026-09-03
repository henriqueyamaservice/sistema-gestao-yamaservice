import 'dotenv/config';
import getDb from '../src/config/database.js';
import fs from 'fs';

async function restore() {
  const db = await getDb();
  
  const sqlContent = fs.readFileSync('../vps_update.sql', 'utf-8');
  
  // Split the file by statements
  const statements = sqlContent.split(';\n').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`Restoring ${statements.length} statements into local DB...`);
  
  for (const stmt of statements) {
    try {
      await db.run(stmt);
    } catch (e) {
      console.error('Error on statement:', stmt.substring(0, 50) + '...', e.message);
    }
  }
  
  console.log('Restore completed successfully!');
  process.exit(0);
}

restore();
