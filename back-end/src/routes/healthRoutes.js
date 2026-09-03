import express from 'express';
import getDb from '../config/database.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const db = await getDb();
    
    // Tenta uma query simples para testar conexão no db abstraído
    if (db.driver === 'mysql') {
      await db.run('SELECT 1');
    } else {
      await db.get('SELECT 1');
    }
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      driver: db.driver,
      timestamp: new Date().toISOString(),
      message: 'Sistema saudável e conectado ao banco de dados!'
    });
  } catch (error) {
    console.error('Health Check falhou:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
