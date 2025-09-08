(function() {
  'use strict';
  
  // Stockage des méthodes originales
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    assert: console.assert,
    clear: console.clear,
    count: console.count,
    group: console.group,
    groupEnd: console.groupEnd,
    table: console.table,
    time: console.time,
    timeEnd: console.timeEnd
  };
  
  // Métriques de performance
  let performanceObserver;
  let startTime = performance.now();
  let detectedFramework = detectFramework();
  
  // État global de l'application
  let appState = {
    domMutations: 0,
    apiCalls: 0,
    errors: 0,
    warnings: 0,
    lastActivity: Date.now()
  };
  
  // Fonction de capture universelle
  function captureMessage(type, level, args, extra = {}) {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return arg.toString();
        }
      }
      return String(arg);
    }).join(' ');
    
    const enrichedExtra = {
      ...extra,
      performance: {
        memoryUsage: getMemoryUsage(),
        domNodes: document.querySelectorAll('*').length,
        timeSinceLoad: performance.now() - startTime
      },
      framework: detectedFramework,
      appState: { ...appState }
    };
    
    window.postMessage({
      type: `CONSOLE_${level.toUpperCase()}`,
      message: message,
      level: level,
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
      args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
      ...enrichedExtra
    }, '*');
  }
  
  function detectFramework() {
    if (window.React) return 'react';
    if (window.Vue) return 'vue';
    if (window.angular) return 'angular';
    if (window.__NEXT_DATA__) return 'nextjs';
    if (window.__NUXT__) return 'nuxtjs';
    if (document.querySelector('[data-svelte]')) return 'svelte';
    return null;
  }
  
  function getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  // Intercepter toutes les méthodes console
  console.log = function(...args) {
    originalConsole.log.apply(console, args);
    captureMessage('CONSOLE_LOG', 'log', args);
  };
  
  console.info = function(...args) {
    originalConsole.info.apply(console, args);
    captureMessage('CONSOLE_INFO', 'info', args);
  };
  
  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
    appState.warnings++;
    captureMessage('CONSOLE_WARN', 'warn', args);
  };
  
  console.error = function(...args) {
    originalConsole.error.apply(console, args);
    appState.errors++;
    captureMessage('CONSOLE_ERROR', 'error', args);
  };
  
  console.debug = function(...args) {
    originalConsole.debug.apply(console, args);
    captureMessage('CONSOLE_DEBUG', 'debug', args);
  };
  
  console.trace = function(...args) {
    originalConsole.trace.apply(console, args);
    captureMessage('CONSOLE_TRACE', 'trace', args);
  };
  
  console.assert = function(condition, ...args) {
    originalConsole.assert.apply(console, arguments);
    if (!condition) {
      captureMessage('CONSOLE_ASSERT', 'assert', args, { condition: false });
    }
  };
  
  console.clear = function() {
    originalConsole.clear.apply(console);
    captureMessage('CONSOLE_CLEAR', 'clear', ['Console cleared']);
  };
  
  console.count = function(label) {
    originalConsole.count.apply(console, arguments);
    captureMessage('CONSOLE_COUNT', 'count', [label || 'default']);
  };
  
  console.group = function(...args) {
    originalConsole.group.apply(console, args);
    captureMessage('CONSOLE_GROUP', 'group', args);
  };
  
  console.groupEnd = function() {
    originalConsole.groupEnd.apply(console);
    captureMessage('CONSOLE_GROUPEND', 'groupEnd', ['Group ended']);
  };
  
  console.table = function(data, columns) {
    originalConsole.table.apply(console, arguments);
    captureMessage('CONSOLE_TABLE', 'table', [data, columns]);
  };
  
  console.time = function(label) {
    originalConsole.time.apply(console, arguments);
    captureMessage('CONSOLE_TIME', 'time', [`Timer started: ${label || 'default'}`]);
  };
  
  console.timeEnd = function(label) {
    originalConsole.timeEnd.apply(console, arguments);
    captureMessage('CONSOLE_TIMEEND', 'timeEnd', [`Timer ended: ${label || 'default'}`]);
  };
  
  // Capturer les erreurs JavaScript avancées
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    appState.errors++;
    
    window.postMessage({
      type: 'JS_ERROR',
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        framework: detectedFramework,
        performance: getMemoryUsage()
      }
    }, '*');
    
    if (originalOnError) {
      return originalOnError.apply(this, arguments);
    }
  };
  
  // Capturer les promesses rejetées
  window.addEventListener('unhandledrejection', function(event) {
    appState.errors++;
    
    window.postMessage({
      type: 'PROMISE_ERROR',
      message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      reason: event.reason
    }, '*');
  });
  
  // Monitorer les performances avec PerformanceObserver
  if ('PerformanceObserver' in window) {
    try {
      performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            window.postMessage({
              type: 'PERFORMANCE_METRIC',
              message: `Page load: ${entry.loadEventEnd}ms`,
              loadTime: entry.loadEventEnd,
              metrics: {
                dns: entry.domainLookupEnd - entry.domainLookupStart,
                connect: entry.connectEnd - entry.connectStart,
                request: entry.responseEnd - entry.requestStart,
                domLoad: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
              },
              timestamp: new Date().toISOString()
            }, '*');
          }
          
          if (entry.entryType === 'largest-contentful-paint') {
            window.postMessage({
              type: 'PERFORMANCE_METRIC',
              message: `LCP: ${entry.startTime}ms`,
              lcp: entry.startTime,
              timestamp: new Date().toISOString()
            }, '*');
          }
        });
      });
      
      performanceObserver.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'layout-shift'] });
    } catch (e) {
      // Silencieux
    }
  }
  
  // Monitorer les mutations DOM
  const domObserver = new MutationObserver((mutations) => {
    appState.domMutations += mutations.length;
    
    if (mutations.length > 100) {
      window.postMessage({
        type: 'PERFORMANCE_WARNING',
        message: `Heavy DOM mutations detected: ${mutations.length} changes`,
        mutationCount: mutations.length,
        timestamp: new Date().toISOString()
      }, '*');
    }
  });
  
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
  
  // Intercepter fetch avec métriques détaillées
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    const startTime = performance.now();
    
    appState.apiCalls++;
    
    window.postMessage({
      type: 'NETWORK_REQUEST',
      message: `${options.method || 'GET'} ${url}`,
      url: url,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
      headers: options.headers,
      apiCallCount: appState.apiCalls
    }, '*');
    
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        window.postMessage({
          type: 'NETWORK_RESPONSE',
          message: `${response.status} ${url} (${duration.toFixed(2)}ms)`,
          url: url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: duration,
          timestamp: new Date().toISOString(),
          headers: Object.fromEntries(response.headers.entries())
        }, '*');
        
        if (duration > 2000) {
          window.postMessage({
            type: 'PERFORMANCE_WARNING',
            message: `Slow API response: ${url} took ${duration.toFixed(2)}ms`,
            url: url,
            duration: duration,
            timestamp: new Date().toISOString()
          }, '*');
        }
        
        if (!response.ok) {
          window.postMessage({
            type: 'NETWORK_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: url,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          }, '*');
        }
        
        return response;
      })
      .catch(error => {
        window.postMessage({
          type: 'NETWORK_ERROR',
          message: `Network error: ${error.message}`,
          url: url,
          error: error.message,
          timestamp: new Date().toISOString()
        }, '*');
        throw error;
      });
  };
  
  // Intercepter XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    let startTime;
    
    xhr.open = function(method, url, ...args) {
      this._method = method;
      this._url = url;
      return originalOpen.apply(this, arguments);
    };
    
    xhr.send = function(...args) {
      startTime = performance.now();
      appState.apiCalls++;
      
      window.postMessage({
        type: 'NETWORK_REQUEST',
        message: `XHR ${this._method}: ${this._url}`,
        url: this._url,
        method: this._method,
        timestamp: new Date().toISOString()
      }, '*');
      
      this.addEventListener('load', () => {
        const duration = performance.now() - startTime;
        
        window.postMessage({
          type: 'NETWORK_RESPONSE',
          message: `XHR ${this.status}: ${this._url} (${duration.toFixed(2)}ms)`,
          url: this._url,
          status: this.status,
          statusText: this.statusText,
          duration: duration,
          timestamp: new Date().toISOString()
        }, '*');
      });
      
      this.addEventListener('error', () => {
        window.postMessage({
          type: 'NETWORK_ERROR',
          message: `XHR Error: ${this._url}`,
          url: this._url,
          timestamp: new Date().toISOString()
        }, '*');
      });
      
      return originalSend.apply(this, args);
    };
    
    return xhr;
  };
  
  // Détecter les violations CSP
  document.addEventListener('securitypolicyviolation', function(event) {
    window.postMessage({
      type: 'SECURITY_ERROR',
      message: `CSP Violation: ${event.violatedDirective}`,
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      timestamp: new Date().toISOString()
    }, '*');
  });
  
  // Monitorer les changements de visibilité
  document.addEventListener('visibilitychange', function() {
    window.postMessage({
      type: 'STATE_CHANGE',
      message: `Page visibility: ${document.visibilityState}`,
      visibility: document.visibilityState,
      timestamp: new Date().toISOString()
    }, '*');
  });
  
  // Détecter les Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function(event) {
      window.postMessage({
        type: 'SERVICE_WORKER_MESSAGE',
        message: `SW Message: ${JSON.stringify(event.data)}`,
        data: event.data,
        timestamp: new Date().toISOString()
      }, '*');
    });
  }
  
  // Monitorer les WebSockets
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    
    ws.addEventListener('open', () => {
      window.postMessage({
        type: 'WEBSOCKET_EVENT',
        message: `WebSocket connected: ${url}`,
        event: 'open',
        url: url,
        timestamp: new Date().toISOString()
      }, '*');
    });
    
    ws.addEventListener('error', (event) => {
      window.postMessage({
        type: 'WEBSOCKET_ERROR',
        message: `WebSocket error: ${url}`,
        url: url,
        error: event,
        timestamp: new Date().toISOString()
      }, '*');
    });
    
    ws.addEventListener('close', (event) => {
      window.postMessage({
        type: 'WEBSOCKET_EVENT',
        message: `WebSocket closed: ${url} (${event.code})`,
        event: 'close',
        url: url,
        code: event.code,
        reason: event.reason,
        timestamp: new Date().toISOString()
      }, '*');
    });
    
    return ws;
  };
})();