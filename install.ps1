# Claude Console Debugger - Installation Automatique
# Usage: PowerShell -ExecutionPolicy Bypass -File install.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = (Get-Location).Path
)

Write-Host "🚀 Installation de Claude Console Debugger..." -ForegroundColor Green

# 1. Vérifier Node.js
Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé. Veuillez installer Node.js depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Installer les dépendances
Write-Host "📦 Installation des dépendances NPM..." -ForegroundColor Yellow
npm install --no-optional --no-audit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépendances installées" -ForegroundColor Green

# 3. Trouver le fichier de configuration Claude
Write-Host "🔍 Recherche de la configuration Claude CLI..." -ForegroundColor Yellow
$claudeConfigPath = "$env:USERPROFILE\.claude.json"

if (-not (Test-Path $claudeConfigPath)) {
    Write-Host "❌ Fichier de configuration Claude CLI introuvable: $claudeConfigPath" -ForegroundColor Red
    Write-Host "Assurez-vous que Claude CLI est installé et configuré." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuration Claude trouvée: $claudeConfigPath" -ForegroundColor Green

# 4. Lire la configuration existante
$claudeConfig = Get-Content $claudeConfigPath -Raw | ConvertFrom-Json

# 5. Ajouter ou mettre à jour la configuration MCP
$mcpServerConfig = @{
    type = "stdio"
    command = "node"
    args = @("$PSScriptRoot\mcp-server.js")
    env = @{}
}

# Créer la structure si elle n'existe pas
if (-not $claudeConfig.projects) {
    $claudeConfig | Add-Member -NotePropertyName "projects" -NotePropertyValue @{}
}

if (-not $claudeConfig.projects.$ProjectPath) {
    $claudeConfig.projects | Add-Member -NotePropertyName $ProjectPath -NotePropertyValue @{
        mcpServers = @{}
        allowedTools = @()
        history = @()
        mcpContextUris = @()
        enabledMcpjsonServers = @()
        disabledMcpjsonServers = @()
        hasTrustDialogAccepted = $false
        projectOnboardingSeenCount = 0
        hasClaudeMdExternalIncludesApproved = $false
        hasClaudeMdExternalIncludesWarningShown = $false
    }
}

if (-not $claudeConfig.projects.$ProjectPath.mcpServers) {
    $claudeConfig.projects.$ProjectPath | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{}
}

# Ajouter le serveur browser-console
$claudeConfig.projects.$ProjectPath.mcpServers | Add-Member -NotePropertyName "browser-console" -NotePropertyValue $mcpServerConfig -Force

# 6. Sauvegarder la configuration
Write-Host "💾 Mise à jour de la configuration Claude CLI..." -ForegroundColor Yellow
$claudeConfig | ConvertTo-Json -Depth 10 | Set-Content $claudeConfigPath -Encoding UTF8
Write-Host "✅ Configuration mise à jour" -ForegroundColor Green

# 7. Instructions pour Firefox
Write-Host "" -ForegroundColor White
Write-Host "🦊 ÉTAPES SUIVANTES - Installation de l'extension Firefox:" -ForegroundColor Cyan
Write-Host "1. Ouvrir Firefox et aller à about:debugging" -ForegroundColor White
Write-Host "2. Cliquer 'This Firefox'" -ForegroundColor White
Write-Host "3. Cliquer 'Load Temporary Add-on'" -ForegroundColor White
Write-Host "4. Sélectionner: $PSScriptRoot\firefox-extension\manifest.json" -ForegroundColor White
Write-Host "" -ForegroundColor White

# 8. Test du serveur
Write-Host "🧪 Test du serveur MCP..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "node" -ArgumentList "$PSScriptRoot\mcp-server.js" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Serveur MCP fonctionne correctement" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Le serveur MCP semble ne pas répondre. Vérifiez manuellement avec 'node mcp-server.js'" -ForegroundColor Yellow
} finally {
    $serverProcess | Stop-Process -Force -ErrorAction SilentlyContinue
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 INSTALLATION TERMINÉE !" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "📋 UTILISATION:" -ForegroundColor Cyan
Write-Host "1. Démarrer le serveur: node mcp-server.js" -ForegroundColor White
Write-Host "2. Configurer l'extension Firefox (voir instructions ci-dessus)" -ForegroundColor White  
Write-Host "3. Dans Claude CLI: claude `"Y a-t-il des erreurs sur mon site ?`"" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📖 Guide complet: SETUP-GUIDE.md" -ForegroundColor Gray