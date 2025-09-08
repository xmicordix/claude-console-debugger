param(
    [int]$Port = 8081,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Claude Console Debugger for Firefox

USAGE:
  .\start-claude-debugger.ps1 [-Port 8081]

STEPS:
1. Load Firefox extension from 'firefox-extension' folder
2. Run this script
3. Configure extension with endpoint: http://localhost:$Port/error
4. Browse websites and see errors analyzed in real-time!

REQUIREMENTS:
- Firefox with extension loaded
- PowerShell 5.1+
- Claude CLI (optional, will work without it)
"@ -ForegroundColor Cyan
    exit
}

# Header
Write-Host ""
Write-Host "=================================" -ForegroundColor Blue
Write-Host "  Claude Console Debugger Firefox" -ForegroundColor Blue
Write-Host "  Real-time Browser Error Analysis" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Starting Claude Debugger Server for Firefox..." -ForegroundColor Green

# Démarrer le serveur
try {
    & "$PSScriptRoot\claude-error-server.ps1" -Port $Port
}
catch {
    Write-Host "Failed to start server: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}