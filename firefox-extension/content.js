// Compatible Firefox et Chrome
const browser = this.browser || this.chrome;

// Injecter le script de capture
const script = document.createElement('script');
script.src = browser.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Types de messages à capturer
const captureTypes = [
  'CONSOLE_LOG', 'CONSOLE_INFO', 'CONSOLE_WARN', 'CONSOLE_ERROR', 'CONSOLE_DEBUG',
  'CONSOLE_TRACE', 'CONSOLE_ASSERT', 'CONSOLE_CLEAR', 'CONSOLE_COUNT',
  'CONSOLE_GROUP', 'CONSOLE_GROUPEND', 'CONSOLE_TABLE', 'CONSOLE_TIME', 'CONSOLE_TIMEEND',
  'JS_ERROR', 'PROMISE_ERROR', 'NETWORK_REQUEST', 'NETWORK_RESPONSE', 'NETWORK_ERROR',
  'PERFORMANCE_METRIC', 'PERFORMANCE_WARNING', 'SECURITY_ERROR', 'STATE_CHANGE',
  'WEBSOCKET_EVENT', 'WEBSOCKET_ERROR', 'SERVICE_WORKER_MESSAGE'
];

// Écouter les messages du script injecté
window.addEventListener('message', function(event) {
  if (event.source !== window || !event.data.type) return;
  
  if (captureTypes.includes(event.data.type)) {
    const errorData = {
      ...event.data,
      url: window.location.href,
      timestamp: event.data.timestamp || new Date().toISOString(),
      pageTitle: document.title,
      userAgent: navigator.userAgent,
      browser: 'Firefox'
    };
    
    // Envoyer silencieusement au background script
    browser.runtime.sendMessage({
      type: 'SEND_TO_CLI',
      data: errorData
    }).catch(() => {
      // Silencieux - pas de pollution console
    });
  }
});