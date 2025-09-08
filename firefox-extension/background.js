// Compatible Firefox et Chrome
const browser = this.browser || this.chrome;

let cliEndpoint = 'http://localhost:8081/error';
let isEnabled = true;
let errorCount = 0;
let sessionId = generateSessionId();

// Système de queue intelligent
let messageQueue = [];
let isProcessing = false;
let messageHistory = new Map();
let errorPatterns = new Map();
let performanceMetrics = new Map();
const BATCH_DELAY = 200;
const MAX_QUEUE_SIZE = 100;

// Configuration avancée pour debugging professionnel
const DEBUG_CONFIG = {
  critical: ['CONSOLE_ERROR', 'JS_ERROR', 'PROMISE_ERROR', 'SECURITY_ERROR', 'CORS_ERROR'],
  important: ['CONSOLE_WARN', 'NETWORK_ERROR', 'PERFORMANCE_WARNING', 'RESOURCE_ERROR'],
  informational: ['CONSOLE_LOG', 'CONSOLE_INFO', 'NETWORK_REQUEST', 'NETWORK_RESPONSE', 'STATE_CHANGE'],
  debug: ['CONSOLE_DEBUG', 'CONSOLE_TRACE', 'CONSOLE_TABLE', 'CONSOLE_TIME', 'CONSOLE_TIMEEND'],
  
  criticalDomains: ['localhost', 'staging', 'dev', 'test'],
  
  criticalPatterns: [
    'uncaught', 'unhandled', 'fatal', 'critical', 'security',
    'cors', 'csp', 'authentication', 'authorization', 'sql injection',
    'xss', 'memory leak', 'stack overflow', 'deadlock'
  ],
  
  performanceThresholds: {
    loadTime: 3000,
    apiResponse: 1000,
    memoryUsage: 100 * 1024 * 1024,
    domNodes: 10000
  },
  
  frameworks: ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby'],
  
  ignoredDomains: [
    'google-analytics.com', 'googletagmanager.com', 'facebook.com',
    'doubleclick.net', 'fullstory.com', 'hotjar.com', 'mixpanel.com',
    'segment.com', 'amplitude.com', 'intercom.io'
  ]
};

// État de l'application analysée
let appContext = {
  framework: null,
  isProduction: false,
  hasServiceWorker: false,
  usesWebSockets: false,
  apiEndpoints: new Set(),
  errorFrequency: new Map(),
  performanceIssues: [],
  securityIssues: [],
  accessibility: {
    violations: [],
    warnings: []
  }
};

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_TO_CLI' && isEnabled) {
    enrichMessageData(message.data, sender.tab);
    if (shouldProcessMessage(message.data)) {
      addToQueue(message.data);
    }
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({ 
      enabled: isEnabled,
      endpoint: cliEndpoint,
      errorCount: errorCount,
      queueSize: messageQueue.length,
      sessionId: sessionId,
      appContext: appContext
    });
  } else if (message.type === 'SET_STATUS') {
    isEnabled = message.enabled;
    if (message.endpoint && message.endpoint.trim()) {
      cliEndpoint = message.endpoint.trim();
    }
    browser.storage.sync.set({ enabled: isEnabled, endpoint: cliEndpoint });
    sendResponse({ success: true });
  } else if (message.type === 'GET_CONTEXT') {
    sendResponse({ context: appContext });
  }
  
  return true;
});

// Enrichir les données avec du contexte avancé
function enrichMessageData(data, tab) {
  data.sessionId = sessionId;
  data.tabId = tab?.id;
  data.timestamp = new Date().toISOString();
  
  if (!appContext.framework) {
    appContext.framework = detectFramework(data);
  }
  
  if (data.url) {
    const url = new URL(data.url);
    appContext.isProduction = !DEBUG_CONFIG.criticalDomains.some(d => url.hostname.includes(d));
    
    if (data.type === 'NETWORK_REQUEST' && url.pathname.includes('/api/')) {
      appContext.apiEndpoints.add(url.pathname);
    }
  }
  
  if (data.type.includes('ERROR')) {
    analyzeErrorPattern(data);
  }
  
  if (data.type === 'PERFORMANCE_METRIC') {
    analyzePerformance(data);
  }
  
  data.enrichedContext = {
    framework: appContext.framework,
    environment: appContext.isProduction ? 'production' : 'development',
    severity: calculateSeverity(data),
    category: categorizeMessage(data),
    actionable: isActionable(data),
    debugHints: generateDebugHints(data)
  };
}

function detectFramework(data) {
  if (data.stack || data.message) {
    const content = (data.stack + ' ' + data.message).toLowerCase();
    for (const framework of DEBUG_CONFIG.frameworks) {
      if (content.includes(framework)) {
        return framework;
      }
    }
  }
  return null;
}

function analyzeErrorPattern(data) {
  const key = `${data.type}-${data.message?.substring(0, 50)}`;
  const count = appContext.errorFrequency.get(key) || 0;
  appContext.errorFrequency.set(key, count + 1);
  
  if (count > 5) {
    data.isRecurring = true;
    data.frequency = count;
  }
}

function analyzePerformance(data) {
  if (data.loadTime > DEBUG_CONFIG.performanceThresholds.loadTime) {
    appContext.performanceIssues.push({
      type: 'slow_load',
      value: data.loadTime,
      threshold: DEBUG_CONFIG.performanceThresholds.loadTime,
      timestamp: data.timestamp
    });
  }
}

function calculateSeverity(data) {
  let severity = 0;
  
  if (DEBUG_CONFIG.critical.includes(data.type)) severity += 5;
  else if (DEBUG_CONFIG.important.includes(data.type)) severity += 3;
  else if (DEBUG_CONFIG.informational.includes(data.type)) severity += 1;
  
  if (appContext.isProduction) severity += 2;
  if (data.isRecurring) severity += 2;
  
  if (data.message) {
    const message = data.message.toLowerCase();
    if (DEBUG_CONFIG.criticalPatterns.some(pattern => message.includes(pattern))) {
      severity += 3;
    }
  }
  
  return Math.min(severity, 10);
}

function categorizeMessage(data) {
  if (data.type.includes('NETWORK')) return 'networking';
  if (data.type.includes('PERFORMANCE')) return 'performance';
  if (data.type.includes('SECURITY')) return 'security';
  if (data.type.includes('ERROR')) return 'runtime';
  if (data.type.includes('CONSOLE')) return 'logging';
  return 'general';
}

function isActionable(data) {
  if (data.type.includes('ERROR')) return true;
  if (data.type === 'CONSOLE_WARN' && data.stack) return true;
  if (data.category === 'performance') return true;
  if (data.category === 'security') return true;
  return false;
}

function generateDebugHints(data) {
  const hints = [];
  
  if (data.type === 'JS_ERROR') {
    hints.push('Check variable declarations and scope');
    hints.push('Verify function exists before calling');
    if (data.message?.includes('undefined')) {
      hints.push('Add null/undefined checks');
    }
  }
  
  if (data.type === 'NETWORK_ERROR') {
    hints.push('Check network connectivity');
    hints.push('Verify API endpoint and method');
    hints.push('Check CORS configuration');
  }
  
  if (data.category === 'performance') {
    hints.push('Profile with browser DevTools');
    hints.push('Check for memory leaks');
    hints.push('Optimize large DOM manipulations');
  }
  
  return hints;
}

function shouldProcessMessage(data) {
  if (data.enrichedContext?.severity >= 7) return true;
  
  if (data.url) {
    const url = new URL(data.url);
    if (DEBUG_CONFIG.ignoredDomains.some(domain => url.hostname.includes(domain))) {
      return data.type.includes('ERROR');
    }
  }
  
  const duplicateWindow = data.enrichedContext?.severity >= 5 ? 1000 : 5000;
  if (isDuplicate(data, duplicateWindow)) return false;
  
  if (data.type === 'CONSOLE_LOG' && !data.enrichedContext?.actionable) {
    return Math.random() < 0.1;
  }
  
  return true;
}

function isDuplicate(data, timeWindow) {
  const key = `${data.type}-${data.message?.substring(0, 100)}-${data.url}`;
  const now = Date.now();
  
  if (messageHistory.has(key)) {
    const lastSeen = messageHistory.get(key);
    if (now - lastSeen < timeWindow) {
      return true;
    }
  }
  
  messageHistory.set(key, now);
  
  if (messageHistory.size > 500) {
    const cutoff = now - 30000;
    for (const [k, timestamp] of messageHistory.entries()) {
      if (timestamp < cutoff) {
        messageHistory.delete(k);
      }
    }
  }
  
  return false;
}

function addToQueue(data) {
  const priority = data.enrichedContext?.severity || 1;
  
  let inserted = false;
  for (let i = 0; i < messageQueue.length; i++) {
    if ((messageQueue[i].enrichedContext?.severity || 1) < priority) {
      messageQueue.splice(i, 0, data);
      inserted = true;
      break;
    }
  }
  
  if (!inserted) {
    messageQueue.push(data);
  }
  
  if (messageQueue.length > MAX_QUEUE_SIZE) {
    messageQueue.sort((a, b) => (b.enrichedContext?.severity || 0) - (a.enrichedContext?.severity || 0));
    messageQueue = messageQueue.slice(0, MAX_QUEUE_SIZE);
  }
  
  processQueue();
}

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  
  while (messageQueue.length > 0) {
    const data = messageQueue.shift();
    
    try {
      await sendToCLI(data);
      
      const severity = data.enrichedContext?.severity || 1;
      const delay = severity >= 7 ? 50 : severity >= 5 ? 100 : severity >= 3 ? 200 : 300;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      // Silencieux - pas de pollution console
    }
  }
  
  isProcessing = false;
}

async function sendToCLI(errorData) {
  try {
    const enrichedData = {
      ...errorData,
      sessionContext: {
        sessionId: sessionId,
        appFramework: appContext.framework,
        environment: appContext.isProduction ? 'production' : 'development',
        errorFrequency: Object.fromEntries(appContext.errorFrequency),
        apiEndpoints: Array.from(appContext.apiEndpoints),
        performanceIssues: appContext.performanceIssues,
        timestamp: new Date().toISOString()
      }
    };
    
    const response = await fetch(cliEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedData)
    });
    
    if (response.ok) {
      errorCount++;
      
      const severity = errorData.enrichedContext?.severity || 1;
      const color = severity >= 7 ? '#ff0000' : severity >= 5 ? '#ff9900' : '#4CAF50';
      
      browser.browserAction.setBadgeText({ text: errorCount.toString() });
      browser.browserAction.setBadgeBackgroundColor({ color: color });
      
      setTimeout(() => {
        browser.browserAction.setBadgeText({ text: '' });
      }, 3000);
      
    } else {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    browser.browserAction.setBadgeText({ text: 'X' });
    browser.browserAction.setBadgeBackgroundColor({ color: '#ff0000' });
    
    setTimeout(() => {
      browser.browserAction.setBadgeText({ text: '' });
    }, 5000);
    
    throw error;
  }
}

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

browser.storage.sync.get(['enabled', 'endpoint']).then(result => {
  isEnabled = result.enabled !== false;
  cliEndpoint = result.endpoint || cliEndpoint;
});

setInterval(() => {
  const now = Date.now();
  const cutoff = now - 300000;
  
  for (const [key, data] of errorPatterns.entries()) {
    if (data.lastSeen < cutoff) {
      errorPatterns.delete(key);
    }
  }
  
  appContext.performanceIssues = appContext.performanceIssues.filter(
    issue => new Date(issue.timestamp).getTime() > cutoff
  );
}, 60000);