param(
    [int]$Port = 8080,
    [string]$ClaudePath = "claude"
)

Write-Host "Claude Advanced Debugging Server" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan
Write-Host "Claude CLI: $ClaudePath" -ForegroundColor Cyan

# Configuration globale
$script:ErrorLog = @()
$script:ClaudeCommand = $ClaudePath
$script:SessionStart = Get-Date
$script:SessionMetrics = @{
    TotalMessages = 0
    ErrorCount = 0
    WarningCount = 0
    PerformanceIssues = 0
    SecurityIssues = 0
}

# Créer le dossier de sessions si nécessaire
$script:SessionDir = Join-Path $env:USERPROFILE "Documents\Claude-Debug-Sessions"
if (-not (Test-Path $script:SessionDir)) {
    New-Item -ItemType Directory -Path $script:SessionDir -Force | Out-Null
}

# Fonction pour tester Claude CLI
function Test-ClaudeCLI {
    try {
        $version = & $script:ClaudeCommand --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Claude CLI found: $version" -ForegroundColor Green
            return $true
        }
    } catch {}
    
    Write-Host "Claude CLI not found in PATH" -ForegroundColor Red
    Write-Host "Will continue with basic analysis mode" -ForegroundColor Yellow
    return $false
}

# Fonction pour sauvegarder l'état de session
function Save-SessionState {
    param([object]$ErrorData)
    
    if ($ErrorData.sessionId) {
        $sessionFile = Join-Path $script:SessionDir "session-$($ErrorData.sessionId).json"
        
        $sessionState = @{
            sessionId = $ErrorData.sessionId
            startTime = $script:SessionStart
            currentTime = Get-Date
            metrics = $script:SessionMetrics
            appContext = $ErrorData.sessionContext
            recentErrors = $script:ErrorLog | Select-Object -Last 10
            environment = @{
                framework = $ErrorData.sessionContext.appFramework
                environment = $ErrorData.sessionContext.environment
                apiEndpoints = $ErrorData.sessionContext.apiEndpoints
                errorFrequency = $ErrorData.sessionContext.errorFrequency
            }
        }
        
        try {
            $sessionState | ConvertTo-Json -Depth 5 | Out-File -FilePath $sessionFile -Encoding UTF8 -Force
        } catch {
            # Silencieux si impossible de sauvegarder
        }
    }
}

# Fonction d'analyse avancée avec Claude CLI
function Invoke-ClaudeAnalysis {
    param([object]$ErrorData)
    
    # Construire le contexte complet pour Claude
    $contextualPrompt = Build-ContextualPrompt -ErrorData $ErrorData
    
    try {
        Write-Host "Analyzing with Claude CLI (Advanced Context Mode)..." -ForegroundColor Yellow
        
        # Méthode 1: Essayer avec stdin
        try {
            $analysis = $contextualPrompt | & $script:ClaudeCommand 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Advanced analysis completed (stdin)" -ForegroundColor Green
                return ($analysis | Out-String).Trim()
            }
        } catch {
            Write-Host "Stdin method failed, trying file method..." -ForegroundColor Yellow
        }
        
        # Méthode 2: Fichier temporaire
        $tempFile = Join-Path $env:USERPROFILE "Documents\claude-advanced-context.txt"
        
        try {
            $contextualPrompt | Out-File -FilePath $tempFile -Encoding UTF8 -Force
            
            # Permissions
            $acl = Get-Acl $tempFile
            $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                $env:USERNAME, "FullControl", "Allow"
            )
            $acl.SetAccessRule($accessRule)
            Set-Acl $tempFile $acl
            
            # Exécuter Claude CLI
            $analysis = & $script:ClaudeCommand $tempFile 2>&1
            
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Advanced analysis completed (file method)" -ForegroundColor Green
                return ($analysis | Out-String).Trim()
            } else {
                throw "Claude CLI returned error: $analysis"
            }
        } catch {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            throw $_.Exception.Message
        }
    }
    catch {
        Write-Host "Claude CLI analysis failed: $($_.Exception.Message)" -ForegroundColor Red
        return Generate-FallbackAnalysis -ErrorData $ErrorData
    }
}

# Construire un prompt contextuel avancé
function Build-ContextualPrompt {
    param([object]$ErrorData)
    
    $sessionDuration = (Get-Date) - $script:SessionStart
    $errorFrequencyText = ""
    
    if ($ErrorData.sessionContext.errorFrequency) {
        $errorFrequencyText = ($ErrorData.sessionContext.errorFrequency | ConvertTo-Json -Compress)
    }
    
    $performanceText = ""
    if ($ErrorData.performance) {
        $performanceText = @"
PERFORMANCE METRICS:
- Memory Used: $($ErrorData.performance.memoryUsage.used) bytes
- Total Memory: $($ErrorData.performance.memoryUsage.total) bytes  
- DOM Nodes: $($ErrorData.performance.domNodes)
- Time Since Load: $($ErrorData.performance.timeSinceLoad)ms
"@
    }
    
    $appStateText = ""
    if ($ErrorData.appState) {
        $appStateText = @"
APPLICATION STATE:
- API Calls: $($ErrorData.appState.apiCalls)
- Total Errors: $($ErrorData.appState.errors)
- Warnings: $($ErrorData.appState.warnings)
- DOM Mutations: $($ErrorData.appState.domMutations)
"@
    }

    return @"
You are Claude CLI, an expert web debugging assistant with full access to a comprehensive debugging session context. You have deep knowledge of web development, performance optimization, and error analysis.

=== DEBUGGING SESSION CONTEXT ===
Session ID: $($ErrorData.sessionId)
Session Duration: $($sessionDuration.TotalMinutes.ToString("F1")) minutes
Total Messages Processed: $($script:SessionMetrics.TotalMessages)
Framework: $($ErrorData.sessionContext.appFramework)
Environment: $($ErrorData.sessionContext.environment)
Browser: $($ErrorData.browser)

=== CURRENT ISSUE ===
Type: $($ErrorData.type)
Message: $($ErrorData.message)
URL: $($ErrorData.url)
Page: $($ErrorData.pageTitle)
Timestamp: $($ErrorData.timestamp)

Severity Level: $($ErrorData.enrichedContext.severity)/10
Category: $($ErrorData.enrichedContext.category)
Is Actionable: $($ErrorData.enrichedContext.actionable)
Is Recurring: $($ErrorData.isRecurring)
$(if ($ErrorData.frequency) { "Frequency: $($ErrorData.frequency) times" })

=== TECHNICAL CONTEXT ===
$performanceText

$appStateText

STACK TRACE:
$($ErrorData.stack)

SOURCE LOCATION:
$(if ($ErrorData.source) { "File: $($ErrorData.source):$($ErrorData.line):$($ErrorData.column)" })

=== APPLICATION ANALYSIS ===
API Endpoints Discovered: $($ErrorData.sessionContext.apiEndpoints -join ", ")
Error Frequency Patterns: $errorFrequencyText

Performance Issues This Session: $($ErrorData.sessionContext.performanceIssues.Count)

Auto-Generated Debug Hints:
$($ErrorData.enrichedContext.debugHints -join "`n- ")

=== SESSION PATTERNS ===
Recent Error Trends: 
$(($script:ErrorLog | Group-Object type | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object { "- $($_.Name): $($_.Count) occurrences" }) -join "`n")

=== YOUR EXPERT ANALYSIS TASK ===
As Claude CLI with complete debugging context, provide a comprehensive analysis that a senior full-stack developer would give. Consider the full application state, performance metrics, error patterns, and technical context.

Provide your analysis in this structure:

🔍 INTELLIGENT DIAGNOSIS:
[Deep analysis considering the complete application context, framework, environment, and session patterns]

⚡ ROOT CAUSE ANALYSIS:  
[Specific technical reason for this issue in this application context]

🎯 IMMEDIATE ACTION PLAN:
[Exact steps the developer should take right now to resolve this specific issue]

🛡️ SYSTEMIC PREVENTION:
[How to prevent this class of issues across the entire application]

📊 PERFORMANCE INSIGHTS:
[Any performance implications, optimizations, or memory concerns]

🏗️ ARCHITECTURAL RECOMMENDATIONS:
[If patterns suggest larger architectural improvements or best practices]

💡 ADDITIONAL CONTEXT:
[Any other insights based on the session data, framework-specific advice, or environment considerations]

Focus on being actionable, specific, and leverage all the contextual information provided. Consider the severity level, recurring nature, and application state in your recommendations.
"@
}

# Générer une analyse de base si Claude CLI n'est pas disponible
function Generate-FallbackAnalysis {
    param([object]$ErrorData)
    
    $severity = $ErrorData.enrichedContext.severity
    $category = $ErrorData.enrichedContext.category
    
    return @"
BASIC ANALYSIS (Claude CLI unavailable):

ISSUE SUMMARY:
Type: $($ErrorData.type) 
Severity: $severity/10 ($( if($severity -ge 7) { "CRITICAL" } elseif($severity -ge 5) { "HIGH" } elseif($severity -ge 3) { "MEDIUM" } else { "LOW" } ))
Category: $category
Environment: $($ErrorData.sessionContext.environment)
$(if ($ErrorData.isRecurring) { "⚠️ RECURRING ISSUE - Frequency: $($ErrorData.frequency)" })

QUICK ANALYSIS:
$(if ($category -eq "runtime") {
"- Runtime error detected in $($ErrorData.sessionContext.appFramework) application
- Check variable declarations and function definitions
- Verify object properties before accessing them"
})

$(if ($category -eq "networking") {
"- Network issue detected
- Check API endpoint availability and CORS configuration  
- Verify request format and authentication headers"
})

$(if ($category -eq "performance") {
"- Performance issue identified
- Monitor memory usage and DOM complexity
- Consider optimizing heavy operations"
})

RECOMMENDED ACTIONS:
1. Check browser DevTools for additional context
2. Review the specific line/file mentioned in stack trace
3. $(if ($ErrorData.enrichedContext.actionable) { "This issue is actionable - prioritize fixing" } else { "Monitor for patterns if this continues" })

DEBUGGING HINTS:
$($ErrorData.enrichedContext.debugHints -join "`n- ")

SESSION CONTEXT:
- Framework: $($ErrorData.sessionContext.appFramework)
- Total API Endpoints: $($ErrorData.sessionContext.apiEndpoints.Count)
- Session Errors: $($script:SessionMetrics.ErrorCount)

For advanced AI-powered analysis, ensure Claude CLI is properly installed and accessible.
"@
}

# Fonction d'affichage enrichie
function Show-ErrorDetails {
    param([object]$ErrorData, [string]$Analysis)
    
    # Mettre à jour les métriques
    $script:SessionMetrics.TotalMessages++
    if ($ErrorData.type.Contains("ERROR")) { $script:SessionMetrics.ErrorCount++ }
    if ($ErrorData.type.Contains("WARN")) { $script:SessionMetrics.WarningCount++ }
    if ($ErrorData.type.Contains("PERFORMANCE")) { $script:SessionMetrics.PerformanceIssues++ }
    if ($ErrorData.type.Contains("SECURITY")) { $script:SessionMetrics.SecurityIssues++ }
    
    # Sauvegarder l'état de session
    Save-SessionState -ErrorData $ErrorData
    
    $timestamp = if ($ErrorData.timestamp) { 
        [DateTime]::Parse($ErrorData.timestamp).ToString("HH:mm:ss") 
    } else { 
        (Get-Date).ToString("HH:mm:ss") 
    }
    
    $severity = $ErrorData.enrichedContext.severity
    $severityText = if($severity -ge 7) { "CRITICAL" } elseif($severity -ge 5) { "HIGH" } elseif($severity -ge 3) { "MEDIUM" } else { "LOW" }
    $severityColor = if($severity -ge 7) { "Red" } elseif($severity -ge 5) { "Yellow" } else { "Green" }
    
    Write-Host ""
    Write-Host "=" * 100 -ForegroundColor Blue
    Write-Host "FIREFOX DEBUG SESSION - $timestamp" -ForegroundColor White
    Write-Host "Session: $($ErrorData.sessionId) | Message #$($script:SessionMetrics.TotalMessages)" -ForegroundColor Gray
    Write-Host "=" * 100 -ForegroundColor Blue
    
    Write-Host "URL: " -NoNewline -ForegroundColor Cyan
    Write-Host $ErrorData.url
    
    if ($ErrorData.pageTitle) {
        Write-Host "Page: " -NoNewline -ForegroundColor Cyan
        Write-Host $ErrorData.pageTitle
    }
    
    Write-Host "Type: " -NoNewline -ForegroundColor Cyan
    Write-Host "$($ErrorData.type) " -NoNewline -ForegroundColor White
    Write-Host "| Severity: " -NoNewline -ForegroundColor Cyan
    Write-Host "$severityText ($severity/10)" -ForegroundColor $severityColor
    
    Write-Host "Category: " -NoNewline -ForegroundColor Cyan
    Write-Host "$($ErrorData.enrichedContext.category) " -NoNewline
    Write-Host "| Framework: " -NoNewline -ForegroundColor Cyan
    Write-Host "$($ErrorData.sessionContext.appFramework)" -ForegroundColor Yellow
    
    if ($ErrorData.isRecurring) {
        Write-Host "RECURRING ISSUE: " -NoNewline -ForegroundColor Red
        Write-Host "Occurred $($ErrorData.frequency) times" -ForegroundColor Yellow
    }
    
    Write-Host "Message: " -NoNewline -ForegroundColor Cyan
    Write-Host $ErrorData.message -ForegroundColor White
    
    if ($ErrorData.source) {
        Write-Host "Source: " -NoNewline -ForegroundColor Cyan
        Write-Host "$($ErrorData.source):$($ErrorData.line):$($ErrorData.column)" -ForegroundColor Gray
    }
    
    if ($ErrorData.performance) {
        Write-Host ""
        Write-Host "PERFORMANCE CONTEXT:" -ForegroundColor Magenta
        Write-Host "Memory: $($ErrorData.performance.memoryUsage.used) / $($ErrorData.performance.memoryUsage.total) bytes" -ForegroundColor Gray
        Write-Host "DOM Nodes: $($ErrorData.performance.domNodes) | Time Since Load: $($ErrorData.performance.timeSinceLoad)ms" -ForegroundColor Gray
    }
    
    if ($ErrorData.stack) {
        Write-Host ""
        Write-Host "STACK TRACE:" -ForegroundColor Cyan
        Write-Host $ErrorData.stack -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "CLAUDE CLI ANALYSIS:" -ForegroundColor Green
    Write-Host "-" * 80 -ForegroundColor Green
    Write-Host $Analysis -ForegroundColor White
    
    Write-Host ""
    Write-Host "SESSION METRICS: Errors: $($script:SessionMetrics.ErrorCount) | Warnings: $($script:SessionMetrics.WarningCount) | Performance: $($script:SessionMetrics.PerformanceIssues)" -ForegroundColor Gray
    Write-Host "=" * 100 -ForegroundColor Blue
    
    # Ajouter à l'historique
    $script:ErrorLog += @{
        timestamp = $timestamp
        type = $ErrorData.type
        message = $ErrorData.message
        severity = $severity
        url = $ErrorData.url
        analysis = $Analysis
    }
    
    # Limiter l'historique
    if ($script:ErrorLog.Count -gt 100) {
        $script:ErrorLog = $script:ErrorLog[-50..-1]
    }
}

# Test Claude CLI
$claudeAvailable = Test-ClaudeCLI

Write-Host "Starting advanced debugging server on http://localhost:$Port" -ForegroundColor Green
Write-Host "Configure Firefox extension endpoint to: http://localhost:$Port/error" -ForegroundColor Yellow
Write-Host "Session data will be saved to: $script:SessionDir" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Créer le serveur HTTP
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "Advanced debugging server running!" -ForegroundColor Green
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # CORS Headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }
        
        if ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/error") {
            try {
                # Lire les données
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $jsonData = $reader.ReadToEnd()
                $reader.Close()
                
                if ($jsonData) {
                    $errorData = $jsonData | ConvertFrom-Json
                    
                    Write-Host "Received: $($errorData.type) (Severity: $($errorData.enrichedContext.severity))" -ForegroundColor Magenta
                    
                    # Analyser avec Claude CLI (contexte complet)
                    $analysis = Invoke-ClaudeAnalysis -ErrorData $errorData
                    
                    # Afficher avec contexte enrichi
                    Show-ErrorDetails -ErrorData $errorData -Analysis $analysis
                    
                    # Répondre
                    $responseObj = @{
                        status = "success"
                        message = "Advanced analysis completed"
                        sessionId = $errorData.sessionId
                        messageCount = $script:SessionMetrics.TotalMessages
                    }
                    $responseText = $responseObj | ConvertTo-Json
                } else {
                    $responseObj = @{
                        status = "error"
                        message = "No data received"
                    }
                    $responseText = $responseObj | ConvertTo-Json
                }
                
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
                $response.ContentType = "application/json"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.StatusCode = 200
            }
            catch {
                Write-Host "Error processing request: $($_.Exception.Message)" -ForegroundColor Red
                $response.StatusCode = 500
            }
        }
        else {
            $response.StatusCode = 404
        }
        
        $response.Close()
    }
}
catch {
    Write-Host "Server error: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    Write-Host ""
    Write-Host "Advanced debugging server stopped" -ForegroundColor Yellow
    Write-Host "Session data saved in: $script:SessionDir" -ForegroundColor Gray
}