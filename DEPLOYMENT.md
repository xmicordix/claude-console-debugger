# 🚀 Deployment Guide

## Quick Setup (5 minutes)

### 1. Setup GitHub Repository

```bash
# Navigate to your project
cd claude-console-debugger

# Initialize git
git init

# Add all files
git add .

# Initial commit
git commit -m "🎉 Initial commit - Claude Console Debugger"

# Create GitHub repo (using GitHub CLI)
gh repo create claude-console-debugger --public --source . --push

# Or manually create repo on GitHub and push
git remote add origin https://github.com/yourusername/claude-console-debugger.git
git branch -M main
git push -u origin main
```

### 2. Configure MCP with GitHub

**Create new GitHub token:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`, `user:email`
4. Copy the token

**Configure Claude CLI:**
```bash
# Create config directory
mkdir -p ~/.config/claude

# Edit config file
nano ~/.config/claude/config.json
```

Add this content:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/your/project"]
    },
    "github": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

### 3. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install global tools
npm install -g nodemon web-ext

# Install PowerShell modules (if needed)
# Install-Module -Name WebAdministration
```

### 4. Load Firefox Extension

```bash
# Method 1: Temporary (for development)
1. Open Firefox
2. Go to about:debugging
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select firefox-extension/manifest.json

# Method 2: Permanent (for production)
web-ext build --source-dir=firefox-extension
# Then install the .xpi file
```

### 5. Start Services

```bash
# Terminal 1: Start MCP Server
npm start

# Terminal 2: Start PowerShell Server
cd powershell
powershell -ExecutionPolicy Bypass .\start-claude-debugger.ps1

# Terminal 3: Monitor logs (optional)
tail -f logs/errors-*.jsonl
```

## 🌐 Cloud Deployment Options

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway link
railway up
```

Railway config (`railway.toml`):
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

### Option 2: Render

Create `render.yaml`:
```yaml
services:
  - type: web
    name: claude-console-debugger
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
```

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Initialize
fly launch

# Deploy
fly deploy
```

### Option 4: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create claude-console-debugger

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

## 🔧 Environment Configuration

### Development
```bash
# .env.development
NODE_ENV=development
PORT=8081
LOG_LEVEL=debug
BUFFER_SIZE=1000
SAVE_TO_FILE=true
```

### Production
```bash
# .env.production
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
BUFFER_SIZE=5000
SAVE_TO_FILE=false
AUTO_CLEANUP=true
```

## 🔒 Security Setup

### Environment Variables
```bash
# Never commit these files:
echo ".env*" >> .gitignore
echo "mcp-config.json" >> .gitignore

# Use environment variables in production:
export GITHUB_TOKEN="your_token_here"
export CLAUDE_API_KEY="your_key_here"
```

### HTTPS Setup (Production)
```javascript
// Use Let's Encrypt with certbot
// Or configure reverse proxy (nginx/Apache)

const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

## 📊 Monitoring Setup

### Health Checks
```bash
# Add to crontab for monitoring
*/5 * * * * curl -f http://localhost:8081/health || echo "Server down"

# Or use uptime monitoring services:
# - UptimeRobot
# - Pingdom  
# - StatusCake
```

### Logging
```javascript
// Production logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build extension
        run: npm run build-extension
        
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 📱 Mobile Testing

### Android Firefox
1. Enable USB debugging
2. Connect device
3. Use `adb` to install extension
4. Configure proxy to local server

### iOS Safari (Limited)
- Safari doesn't support extensions like Firefox
- Consider web-based dashboard instead

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
# Test with real browser
npm run test:integration

# Load test
npm run test:load
```

### Extension Testing
```bash
# Automated extension testing
web-ext run --firefox-profile=test-profile
web-ext lint --source-dir=firefox-extension
```

## 🚨 Troubleshooting

### Common Issues

**MCP Connection Failed**
```bash
# Check Claude CLI version
claude --version

# Test MCP connection
claude mcp list

# Restart Claude CLI
pkill claude && claude
```

**Extension Not Loading**
```bash
# Check Firefox version (needs 57+)
firefox --version

# Check extension permissions
# about:addons → Claude Debugger → Permissions
```

**PowerShell Server Issues**
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set policy if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :8081

# Kill process
kill -9 <PID>

# Or use different port
npm start -- --port 8082
```

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/claude-console-debugger/issues)
- Documentation: [Wiki](https://github.com/yourusername/claude-console-debugger/wiki)
- Discord: [Community chat](https://discord.gg/your-server)

## 🎉 Success Checklist

- [ ] GitHub repository created
- [ ] MCP configured with GitHub token
- [ ] Firefox extension loaded
- [ ] PowerShell server running
- [ ] MCP server deployed (optional)
- [ ] Health checks passing
- [ ] Error capture working
- [ ] Claude analysis working
- [ ] Dashboard accessible

**You're all set! Happy debugging! 🚀**