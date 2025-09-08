#!/bin/bash

# Claude Console Debugger - Installation Automatique (Mac/Linux)
# Usage: bash install.sh [PROJECT_PATH]

PROJECT_PATH="${1:-$(pwd)}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "🚀 Installation de Claude Console Debugger..."

# 1. Vérifier Node.js
echo "📋 Vérification des prérequis..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js trouvé: $NODE_VERSION"
else
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js depuis https://nodejs.org"
    exit 1
fi

# 2. Installer les dépendances
echo "📦 Installation des dépendances NPM..."
cd "$SCRIPT_DIR"
npm install --no-optional --no-audit
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi
echo "✅ Dépendances installées"

# 3. Trouver le fichier de configuration Claude
echo "🔍 Recherche de la configuration Claude CLI..."
CLAUDE_CONFIG_PATH="$HOME/.claude.json"

if [ ! -f "$CLAUDE_CONFIG_PATH" ]; then
    echo "❌ Fichier de configuration Claude CLI introuvable: $CLAUDE_CONFIG_PATH"
    echo "Assurez-vous que Claude CLI est installé et configuré."
    exit 1
fi

echo "✅ Configuration Claude trouvée: $CLAUDE_CONFIG_PATH"

# 4. Créer une sauvegarde
cp "$CLAUDE_CONFIG_PATH" "${CLAUDE_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Sauvegarde créée: ${CLAUDE_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"

# 5. Mise à jour de la configuration Claude avec Python
echo "💾 Mise à jour de la configuration Claude CLI..."
python3 - <<EOF
import json
import os

config_path = "$CLAUDE_CONFIG_PATH"
project_path = "$PROJECT_PATH"
script_dir = "$SCRIPT_DIR"

# Lire la configuration existante
with open(config_path, 'r') as f:
    config = json.load(f)

# Créer la structure si elle n'existe pas
if 'projects' not in config:
    config['projects'] = {}

if project_path not in config['projects']:
    config['projects'][project_path] = {
        'mcpServers': {},
        'allowedTools': [],
        'history': [],
        'mcpContextUris': [],
        'enabledMcpjsonServers': [],
        'disabledMcpjsonServers': [],
        'hasTrustDialogAccepted': False,
        'projectOnboardingSeenCount': 0,
        'hasClaudeMdExternalIncludesApproved': False,
        'hasClaudeMdExternalIncludesWarningShown': False
    }

if 'mcpServers' not in config['projects'][project_path]:
    config['projects'][project_path]['mcpServers'] = {}

# Ajouter le serveur browser-console
config['projects'][project_path]['mcpServers']['browser-console'] = {
    'type': 'stdio',
    'command': 'node',
    'args': [f'{script_dir}/mcp-server.js'],
    'env': {}
}

# Sauvegarder
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Configuration mise à jour")
EOF

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la mise à jour de la configuration"
    echo "Installation manuelle requise - consultez SETUP-GUIDE.md"
    exit 1
fi

# 6. Instructions pour Firefox
echo ""
echo "🦊 ÉTAPES SUIVANTES - Installation de l'extension Firefox:"
echo "1. Ouvrir Firefox et aller à about:debugging"
echo "2. Cliquer 'This Firefox'"
echo "3. Cliquer 'Load Temporary Add-on'"
echo "4. Sélectionner: $SCRIPT_DIR/firefox-extension/manifest.json"
echo ""

# 7. Test du serveur
echo "🧪 Test du serveur MCP..."
node "$SCRIPT_DIR/mcp-server.js" &
SERVER_PID=$!
sleep 3

if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health | grep -q "200"; then
    echo "✅ Serveur MCP fonctionne correctement"
else
    echo "⚠️ Le serveur MCP semble ne pas répondre. Vérifiez manuellement avec 'node mcp-server.js'"
fi

# Arrêter le serveur de test
kill $SERVER_PID 2>/dev/null

echo ""
echo "🎉 INSTALLATION TERMINÉE !"
echo ""
echo "📋 UTILISATION:"
echo "1. Démarrer le serveur: node mcp-server.js"
echo "2. Configurer l'extension Firefox (voir instructions ci-dessus)"
echo "3. Dans Claude CLI: claude \"Y a-t-il des erreurs sur mon site ?\""
echo ""
echo "📖 Guide complet: SETUP-GUIDE.md"