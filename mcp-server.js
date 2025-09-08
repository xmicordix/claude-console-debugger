const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

class BrowserConsoleMCP {
  constructor() {
    this.app = express();
    this.server = null;
    this.wss = null;
    this.errorBuffer = [];
    this.sessions = new Map();
    this.config = {
      port: 8081,
      maxBufferSize: 5000,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      autoCleanup: true
    };
    
    this.setupExpress();
    this.setupWebSocket();
    this.startCleanupTimer();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.static('public'));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        sessions: this.sessions.size,
        bufferSize: this.errorBuffer.length
      });
    });

    // Main error endpoint
    this.app.post('/error', async (req, res) => {
      try {
        const errorData = req.body;
        await this.handleError(errorData);
        
        res.json({
          success: true,
          message: 'Error processed successfully',
          bufferId: this.errorBuffer.length - 1
        });
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get recent errors
    this.app.get('/errors', (req, res) => {
      const { limit = 50, type, severity } = req.query;
      
      let filtered = [...this.errorBuffer];
      
      if (type) {
        filtered = filtered.filter(e => e.type === type);
      }
      
      if (severity) {
        const minSeverity = parseInt(severity);
        filtered = filtered.filter(e => 
          e.enrichedContext?.severity >= minSeverity
        );
      }
      
      const recent = filtered.slice(-limit);
      
      res.json({
        errors: recent,
        total: this.errorBuffer.length,
        filtered: filtered.length
      });
    });

    // Clear buffer
    this.app.delete('/errors', (req, res) => {
      this.errorBuffer = [];
      this.broadcastUpdate('buffer_cleared');
      
      res.json({
        success: true,
        message: 'Buffer cleared'
      });
    });

    // Get session data
    this.app.get('/session/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }
      
      res.json(session);
    });

    // Export data
    this.app.get('/export', async (req, res) => {
      const { format = 'json' } = req.query;
      
      const exportData = {
        timestamp: new Date().toISOString(),
        errors: this.errorBuffer,
        sessions: Object.fromEntries(this.sessions),
        stats: this.getStats()
      };
      
      if (format === 'json') {
        res.json(exportData);
      } else {
        res.status(400).json({
          error: 'Unsupported format'
        });
      }
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      // Send current stats
      ws.send(JSON.stringify({
        type: 'stats',
        data: this.getStats()
      }));
      
      // Send recent errors
      ws.send(JSON.stringify({
        type: 'recent_errors',
        data: this.errorBuffer.slice(-10)
      }));
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  async handleError(errorData) {
    // Enrich error data
    const enrichedError = {
      ...errorData,
      receivedAt: new Date().toISOString(),
      id: this.generateId()
    };
    
    // Add to buffer
    this.errorBuffer.push(enrichedError);
    
    // Limit buffer size
    if (this.errorBuffer.length > this.config.maxBufferSize) {
      this.errorBuffer = this.errorBuffer.slice(-this.config.maxBufferSize);
    }
    
    // Update session
    if (errorData.sessionId) {
      this.updateSession(errorData.sessionId, enrichedError);
    }
    
    // Broadcast to WebSocket clients
    this.broadcastError(enrichedError);
    
    // Log for debugging
    console.log(`[${enrichedError.receivedAt}] ${enrichedError.type}: ${enrichedError.message}`);
    
    // Save to file if configured
    if (this.config.saveToFile) {
      await this.saveErrorToFile(enrichedError);
    }
  }

  updateSession(sessionId, error) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        startTime: Date.now(),
        errors: [],
        totalMessages: 0,
        lastActivity: Date.now()
      });
    }
    
    const session = this.sessions.get(sessionId);
    session.errors.push(error);
    session.totalMessages++;
    session.lastActivity = Date.now();
    
    // Keep only recent errors per session
    if (session.errors.length > 100) {
      session.errors = session.errors.slice(-100);
    }
  }

  broadcastError(error) {
    const message = JSON.stringify({
      type: 'new_error',
      data: error
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastUpdate(type, data = null) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recent = this.errorBuffer.filter(e => 
      new Date(e.receivedAt).getTime() > last24h
    );
    
    const errorTypes = {};
    recent.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
    });
    
    return {
      total: this.errorBuffer.length,
      last24h: recent.length,
      sessions: this.sessions.size,
      errorTypes,
      uptime: process.uptime()
    };
  }

  async saveErrorToFile(error) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `errors-${date}.jsonl`;
    const filepath = path.join(__dirname, 'logs', filename);
    
    try {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.appendFile(filepath, JSON.stringify(error) + '\n');
    } catch (err) {
      console.error('Failed to save error to file:', err);
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      if (!this.config.autoCleanup) return;
      
      const cutoff = Date.now() - this.config.sessionTimeout;
      
      // Clean old sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.lastActivity < cutoff) {
          this.sessions.delete(sessionId);
        }
      }
      
      // Clean old errors (keep recent ones)
      const recent = this.errorBuffer.filter(e => 
        new Date(e.receivedAt).getTime() > cutoff
      );
      
      if (recent.length < this.errorBuffer.length) {
        this.errorBuffer = recent;
        this.broadcastUpdate('buffer_cleaned');
      }
      
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  start() {
    this.server = this.app.listen(this.config.port, () => {
      console.log(`🚀 Claude Console MCP Server running on port ${this.config.port}`);
      console.log(`   Health check: http://localhost:${this.config.port}/health`);
      console.log(`   Recent errors: http://localhost:${this.config.port}/errors`);
    });
    
    // Handle WebSocket upgrade
    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        process.exit(0);
      });
    });
    
    return this.server;
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new BrowserConsoleMCP();
  server.start();
}

module.exports = BrowserConsoleMCP;