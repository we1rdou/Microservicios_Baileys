import axios from 'axios';

// Configuración
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos (menos que los 15 de Render)

/**
 * Servicio que mantiene la aplicación activa mediante auto-ping
 */
class MantenerConexionService {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.pingCount = 0;
        this.appUrl = null;
    }

    logActivity(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        console.log(logEntry.trim());
    }

    async ping() {
        try {
            if (!this.appUrl) {
                this.logActivity('❌ Error: URL de la aplicación no configurada');
                return;
            }

            const url = `${this.appUrl}/health`;
            this.logActivity(`🔄 Realizando ping a ${url}`);
            
            const response = await axios.get(url);
            this.pingCount++;
            
            this.logActivity(`✅ Auto-ping exitoso #${this.pingCount} - ${response.data.timestamp}`);
        } catch (error) {
            this.logActivity(`❌ Error en auto-ping: ${error.message}`);
        }
    }

    start(appUrl = process.env.APP_URL) {
        if (this.isRunning) {
            this.logActivity('⚠️ El servicio ya está en ejecución');
            return;
        }

        if (!appUrl) {
            this.logActivity('⚠️ No se puede iniciar el servicio sin una URL');
            return;
        }

        this.appUrl = appUrl;
        const minutos = PING_INTERVAL_MS / 60000;
        
        this.logActivity(`🚀 Iniciando servicio MantenerConexion (intervalo: ${minutos} minutos)`);
        this.logActivity(`📡 URL configurada: ${this.appUrl}`);
        
        // Realizar un ping inmediato al inicio
        this.ping();
        
        // Configurar el intervalo para pings regulares
        this.intervalId = setInterval(() => this.ping(), PING_INTERVAL_MS);
        this.isRunning = true;
    }

    stop() {
        if (!this.isRunning) {
            this.logActivity('⚠️ El servicio no está en ejecución');
            return;
        }

        clearInterval(this.intervalId);
        this.isRunning = false;
        this.logActivity('🛑 Servicio MantenerConexion detenido');
    }
}

export default new MantenerConexionService();