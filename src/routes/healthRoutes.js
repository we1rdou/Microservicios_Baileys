import express from 'express';
const router = express.Router();

/**
 * @route GET /health
 * @description Endpoint para verificar que el servicio está activo
 * @access Public
 */
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memoria: process.memoryUsage().rss / 1024 / 1024, // MB
        pid: process.pid
    });
});

export default router;