# Claude Console Debugger - Installation Automatique
# Usage: PowerShell -ExecutionPolicy Bypass -File install.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath,
    [Parameter(Mandatory=$false)]
    [int]$Port = 8081
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

# 3. Demander le chemin du projet si non fourni
if (-not $ProjectPath) {
    Write-Host "🔍 Détection des projets Claude CLI..." -ForegroundColor Yellow
    
    $claudeConfigPath = "$env:USERPROFILE\.claude.json"
    if (Test-Path $claudeConfigPath) {
        try {
            $existingConfig = Get-Content $claudeConfigPath -Raw | ConvertFrom-Json
            if ($existingConfig.projects) {
                Write-Host "Projets existants détectés:" -ForegroundColor Green
                $projectList = @($existingConfig.projects.PSObject.Properties.Name)
                for ($i = 0; $i -lt $projectList.Count; $i++) {
                    Write-Host "  [$($i + 1)] $($projectList[$i])" -ForegroundColor Cyan
                }
            }
        } catch {
            Write-Host "Impossible de lire la configuration existante" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Entrez le chemin du projet à monitorer avec Claude Console Debugger:" -ForegroundColor Yellow
    Write-Host "(Exemple: C:\Users\Vous\MonProjet ou laissez vide pour le dossier actuel)" -ForegroundColor Gray
    $input = Read-Host "Chemin du projet"
    
    if ([string]::IsNullOrWhiteSpace($input)) {
        $ProjectPath = (Get-Location).Path
        Write-Host "✅ Utilisation du dossier actuel: $ProjectPath" -ForegroundColor Green
    } else {
        $ProjectPath = $input.Trim('"').Trim("'")
        if (-not (Test-Path $ProjectPath)) {
            Write-Host "⚠️ Le chemin spécifié n'existe pas, création..." -ForegroundColor Yellow
            try {
                New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
                Write-Host "✅ Dossier créé: $ProjectPath" -ForegroundColor Green
            } catch {
                Write-Host "❌ Impossible de créer le dossier: $ProjectPath" -ForegroundColor Red
                exit 1
            }
        }
    }
}

# 4. Trouver le fichier de configuration Claude
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

# 5. Vérifier si le port est libre et configurer le serveur MCP
Write-Host "🔌 Vérification du port $Port..." -ForegroundColor Yellow
try {
    $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    $portInUse = $listener | Where-Object { $_.Port -eq $Port }
    if ($portInUse) {
        Write-Host "⚠️ Port $Port déjà utilisé, tentative avec port suivant..." -ForegroundColor Yellow
        $Port = $Port + 1
    }
    Write-Host "✅ Port $Port disponible" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Impossible de vérifier le port, utilisation de $Port" -ForegroundColor Yellow
}

# Obtenir le chemin absolu du script MCP
$scriptPath = Resolve-Path "$PSScriptRoot\mcp-server.js"
Write-Host "📁 Chemin MCP Server: $scriptPath" -ForegroundColor Cyan

$mcpServerConfig = @{
    type = "stdio"
    command = "node"
    args = @($scriptPath.Path)
    env = @{
        PORT = $Port.ToString()
    }
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
$serverProcess = $null
try {
    $env:PORT = $Port
    $serverProcess = Start-Process -FilePath "node" -ArgumentList "$($scriptPath.Path)" -PassThru -WindowStyle Hidden -RedirectStandardError "$env:TEMP\mcp-error.log"
    
    Write-Host "Démarrage du serveur (PID: $($serverProcess.Id))..." -ForegroundColor Gray
    Start-Sleep -Seconds 4
    
    $testUrl = "http://localhost:$Port/health"
    Write-Host "Test de connexion: $testUrl" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Serveur MCP fonctionne correctement sur le port $Port" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Test du serveur échoué: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Cela peut être normal - le serveur sera testé à nouveau lors du démarrage manuel" -ForegroundColor Gray
    
    if (Test-Path "$env:TEMP\mcp-error.log") {
        $errorContent = Get-Content "$env:TEMP\mcp-error.log" -Raw
        if ($errorContent) {
            Write-Host "📋 Erreurs serveur:" -ForegroundColor Yellow
            Write-Host $errorContent -ForegroundColor Red
        }
    }
} finally {
    if ($serverProcess -and !$serverProcess.HasExited) {
        Write-Host "Arrêt du serveur de test..." -ForegroundColor Gray
        $serverProcess | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
    Remove-Item "$env:TEMP\mcp-error.log" -ErrorAction SilentlyContinue
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 INSTALLATION TERMINÉE !" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "📋 UTILISATION:" -ForegroundColor Cyan
Write-Host "1. Démarrer le serveur: node mcp-server.js" -ForegroundColor White
Write-Host "   Serveur configuré sur le port: $Port" -ForegroundColor Gray
Write-Host "2. Configurer l'extension Firefox (voir instructions ci-dessus)" -ForegroundColor White  
Write-Host "3. Dans Claude CLI: claude `"Y a-t-il des erreurs sur mon site ?`"" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📖 Guide complet: SETUP-GUIDE.md" -ForegroundColor Gray