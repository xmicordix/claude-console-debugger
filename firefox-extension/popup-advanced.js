// Compatible Firefox et Chrome
const browser = this.browser || this.chrome;

// État global
let config = {
  enabled: true,
  urls: [],
  currentTabOnly: false,
  errorsOnly: false,
  includeNetwork: true,
  autoFix: false,
  notifications: false,
  smartFilter: true,
  mcpEndpoint: 'http://localhost:8081/error',
  bufferSize: 1000
};

let stats = {
  errorCount: 0,
  fixCount: 0,
  sessionStart: Date.now(),
  patterns: {}
};

let consoleBuffer = [];
const MAX_PREVIEW_LINES = 20;

document.addEventListener('DOMContentLoaded', async () => {
  // Charger la configuration
  await loadConfig();
  
  // Initialiser les tabs
  initTabs();
  
  // Initialiser les contrôles
  initControls();
  
  // Démarrer le monitoring
  startMonitoring();
  
  // Mettre à jour l'interface
  updateUI();
});

// Initialisation des tabs
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Retirer active de tous
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      // Activer le tab cliqué
      tab.classList.add('active');
      const contentId = tab.dataset.tab;
      document.getElementById(contentId).classList.add('active');
    });
  });
}

// Initialisation des contrôles
function initControls() {
  // Gestion des URLs
  document.getElementById('addUrlBtn').addEventListener('click', addUrl);
  document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addUrl();
  });
  
  // Quick Actions
  document.getElementById('currentTabBtn').addEventListener('click', toggleCurrentTabOnly);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('clearBtn').addEventListener('click', clearBuffer);
  document.getElementById('exportBtn').addEventListener('click', exportLogs);
  
  // Settings
  document.getElementById('errorsOnly').addEventListener('change', (e) => {
    config.errorsOnly = e.target.checked;
    saveConfig();
  });
  
  document.getElementById('includeNetwork').addEventListener('change', (e) => {
    config.includeNetwork = e.target.checked;
    saveConfig();
  });
  
  document.getElementById('autoFix').addEventListener('change', (e) => {
    config.autoFix = e.target.checked;
    saveConfig();
  });
  
  document.getElementById('notifications').addEventListener('change', (e) => {
    config.notifications = e.target.checked;
    if (e.target.checked) {
      requestNotificationPermission();
    }
    saveConfig();
  });
  
  document.getElementById('smartFilter').addEventListener('change', (e) => {
    config.smartFilter = e.target.checked;
    saveConfig();
  });
  
  document.getElementById('mcpEndpoint').addEventListener('change', (e) => {
    config.mcpEndpoint = e.target.value;
  });
  
  document.getElementById('bufferSize').addEventListener('input', (e) => {
    config.bufferSize = parseInt(e.target.value);
    document.getElementById('bufferSizeValue').textContent = e.target.value;
  });
  
  // Save button
  document.getElementById('saveSettings').addEventListener('click', saveConfig);
  
  // Dashboard button
  document.getElementById('openDashboard').addEventListener('click', () => {
    browser.tabs.create({ url: 'dashboard.html' });
  });
}

// Ajouter une URL à monitorer
async function addUrl() {
  const input = document.getElementById('urlInput');
  let url = input.value.trim();
  
  if (!url) return;
  
  // Auto-ajouter wildcards si nécessaire
  if (!url.includes('*') && !url.includes('://')) {
    url = `*://${url}/*`;
  } else if (!url.includes('*')) {
    url = `${url}*`;
  }
  
  // Vérifier si pas déjà dans la liste
  if (!config.urls.includes(url)) {
    config.urls.push(url);
    await saveConfig();
    updateUrlList();
    input.value = '';
    
    // Feedback visuel
    input.style.borderColor = '#10b981';
    setTimeout(() => {
      input.style.borderColor = '';
    }, 1000);
  }
}

// Mettre à jour la liste des URLs
function updateUrlList() {
  const list = document.getElementById('urlList');
  
  if (config.urls.length === 0) {
    list.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">No URLs configured - monitoring all sites</div>';
    return;
  }
  
  list.innerHTML = config.urls.map((url, index) => `
    <div class="url-item">
      <span class="url-text">${url}</span>
      <button class="url-remove" data-index="${index}">Remove</button>
    </div>
  `).join('');
  
  // Ajouter les event listeners pour remove
  list.querySelectorAll('.url-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      config.urls.splice(index, 1);
      await saveConfig();
      updateUrlList();
    });
  });
}

// Toggle Current Tab Only
async function toggleCurrentTabOnly() {
  config.currentTabOnly = !config.currentTabOnly;
  
  const btn = document.getElementById('currentTabBtn');
  btn.classList.toggle('active', config.currentTabOnly);
  
  if (config.currentTabOnly) {
    // Obtenir l'URL de l'onglet actuel
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const pattern = `${url.origin}/*`;
    
    // Sauvegarder les URLs actuelles et ne garder que celle-ci
    config.previousUrls = [...config.urls];
    config.urls = [pattern];
    
    updateUrlList();
    showNotification('Monitoring current tab only', 'info');
  } else {
    // Restaurer les URLs précédentes
    if (config.previousUrls) {
      config.urls = config.previousUrls;
      delete config.previousUrls;
    }
    
    updateUrlList();
    showNotification('Monitoring all configured URLs', 'info');
  }
  
  await saveConfig();
}

// Toggle Pause
function togglePause() {
  config.enabled = !config.enabled;
  
  const btn = document.getElementById('pauseBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (config.enabled) {
    btn.classList.remove('active');
    btn.innerHTML = '<div class="quick-btn-icon">⏸️</div><div class="quick-btn-text">Pause Capture</div>';
    statusDot.classList.remove('inactive');
    statusText.textContent = 'Active';
  } else {
    btn.classList.add('active');
    btn.innerHTML = '<div class="quick-btn-icon">▶️</div><div class="quick-btn-text">Resume Capture</div>';
    statusDot.classList.add('inactive');
    statusText.textContent = 'Paused';
  }
  
  saveConfig();
}

// Clear Buffer
async function clearBuffer() {
  consoleBuffer = [];
  updateConsolePreview();
  
  // Envoyer message au background
  await browser.runtime.sendMessage({
    type: 'CLEAR_BUFFER'
  });
  
  showNotification('Buffer cleared', 'success');
}

// Export Logs
async function exportLogs() {
  const logs = {
    config: config,
    stats: stats,
    buffer: consoleBuffer,
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  await browser.downloads.download({
    url: url,
    filename: `claude-debug-${Date.now()}.json`,
    saveAs: true
  });
  
  showNotification('Logs exported', 'success');
}

// Démarrer le monitoring
function startMonitoring() {
  // Écouter les messages du content script
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'CONSOLE_UPDATE') {
      handleConsoleUpdate(message.data);
    } else if (message.type === 'ERROR_DETECTED') {
      handleError(message.data);
    } else if (message.type === 'FIX_APPLIED') {
      handleFixApplied(message.data);
    }
  });
  
  // Rafraîchir les stats toutes les secondes
  setInterval(updateStats, 1000);
}

// Gérer les mises à jour console
function handleConsoleUpdate(data) {
  // Vérifier si l'URL est autorisée
  if (!isUrlAllowed(data.url)) return;
  
  // Ajouter au buffer
  consoleBuffer.push({
    ...data,
    timestamp: Date.now()
  });
  
  // Limiter la taille du buffer
  if (consoleBuffer.length > config.bufferSize) {
    consoleBuffer = consoleBuffer.slice(-config.bufferSize);
  }
  
  // Mettre à jour l'aperçu
  updateConsolePreview();
  
  // Analyser les patterns
  analyzePatterns(data);
}

// Vérifier si une URL est autorisée
function isUrlAllowed(url) {
  if (!url) return true;
  if (config.urls.length === 0) return true;
  
  return config.urls.some(pattern => {
    // Convertir le pattern en regex
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\//g, '\\/')
    );
    return regex.test(url);
  });
}

// Mettre à jour l'aperçu console
function updateConsolePreview() {
  const preview = document.getElementById('consolePreview');
  const recentLogs = consoleBuffer.slice(-MAX_PREVIEW_LINES);
  
  if (recentLogs.length === 0) {
    preview.innerHTML = '<div style="color: #6b7280; text-align: center;">No logs yet...</div>';
    return;
  }
  
  preview.innerHTML = recentLogs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const typeClass = log.level || 'log';
    
    return `
      <div class="console-line">
        <span class="console-time">${time}</span>
        <span class="console-type ${typeClass}">${log.type}</span>
        <span class="console-message">${escapeHtml(log.message || '')}</span>
      </div>
    `;
  }).join('');
  
  // Auto-scroll vers le bas
  preview.scrollTop = preview.scrollHeight;
}

// Gérer les erreurs détectées
function handleError(error) {
  stats.errorCount++;
  
  // Analyser le pattern
  const errorType = error.type || 'Unknown';
  stats.patterns[errorType] = (stats.patterns[errorType] || 0) + 1;
  
  // Notification si activée
  if (config.notifications) {
    showDesktopNotification('Error Detected', error.message);
  }
  
  updateStats();
}

// Gérer les fixes appliqués
function handleFixApplied(fix) {
  stats.fixCount++;
  updateStats();
  
  if (config.notifications) {
    showDesktopNotification('Auto-Fix Applied', fix.description);
  }
}

// Analyser les patterns
function analyzePatterns(data) {
  if (data.type && data.type.includes('ERROR')) {
    const pattern = extractErrorPattern(data.message);
    if (pattern) {
      stats.patterns[pattern] = (stats.patterns[pattern] || 0) + 1;
    }
  }
}

// Extraire le pattern d'erreur
function extractErrorPattern(message) {
  if (!message) return 'Unknown';
  
  if (message.includes('undefined')) return 'Undefined Reference';
  if (message.includes('null')) return 'Null Reference';
  if (message.includes('network')) return 'Network Error';
  if (message.includes('syntax')) return 'Syntax Error';
  if (message.includes('type')) return 'Type Error';
  
  return 'Other';
}

// Mettre à jour les statistiques
function updateStats() {
  // Error count
  document.getElementById('errorCount').textContent = stats.errorCount;
  
  // Fix count
  document.getElementById('fixCount').textContent = stats.fixCount;
  
  // Session time
  const sessionMinutes = Math.floor((Date.now() - stats.sessionStart) / 60000);
  document.getElementById('sessionTime').textContent = `${sessionMinutes}m`;
  
  // Time saved (estimation: 5 min par fix auto)
  const hoursSaved = (stats.fixCount * 5 / 60).toFixed(1);
  document.getElementById('savedTime').textContent = `${hoursSaved}h`;
}

// Mettre à jour l'interface
function updateUI() {
  // URLs
  updateUrlList();
  
  // Settings
  document.getElementById('errorsOnly').checked = config.errorsOnly;
  document.getElementById('includeNetwork').checked = config.includeNetwork;
  document.getElementById('autoFix').checked = config.autoFix;
  document.getElementById('notifications').checked = config.notifications;
  document.getElementById('smartFilter').checked = config.smartFilter;
  document.getElementById('mcpEndpoint').value = config.mcpEndpoint;
  document.getElementById('bufferSize').value = config.bufferSize;
  document.getElementById('bufferSizeValue').textContent = config.bufferSize;
  
  // Status
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  if (config.enabled) {
    statusDot.classList.remove('inactive');
    statusText.textContent = 'Active';
  } else {
    statusDot.classList.add('inactive');
    statusText.textContent = 'Paused';
  }
  
  // Stats
  updateStats();
}

// Charger la configuration
async function loadConfig() {
  try {
    const stored = await browser.storage.sync.get(['debugConfig', 'debugStats']);
    
    if (stored.debugConfig) {
      config = { ...config, ...stored.debugConfig };
    }
    
    if (stored.debugStats) {
      stats = { ...stats, ...stored.debugStats };
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Sauvegarder la configuration
async function saveConfig() {
  try {
    await browser.storage.sync.set({
      debugConfig: config,
      debugStats: stats
    });
    
    // Notifier le background script
    await browser.runtime.sendMessage({
      type: 'CONFIG_UPDATE',
      config: config
    });
    
    showNotification('Settings saved', 'success');
  } catch (error) {
    console.error('Failed to save config:', error);
    showNotification('Failed to save settings', 'error');
  }
}

// Afficher une notification
function showNotification(message, type = 'info') {
  // Créer l'élément notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Retirer après 3 secondes
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Notification desktop
function showDesktopNotification(title, message) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/icons/icon128.png'
    });
  }
}

// Demander permission notifications
function requestNotificationPermission() {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Animations CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);