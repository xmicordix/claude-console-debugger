# 🔧 Guide d'Installation - Claude Console Debugger

## Pour tes Amis : Comment Utiliser cette Application

### Étape 1: Cloner le Projet
```bash
git clone https://github.com/xmicordix/claude-console-debugger.git
cd claude-console-debugger
```

### Étape 2: Installer les Dépendances
```bash
npm install
```

### Étape 3: Configurer Claude CLI avec MCP

#### 3.1 Ouvrir le fichier de configuration Claude
- **Windows**: `C:\Users\[USERNAME]\.claude.json`
- **Mac/Linux**: `~/.claude.json`

#### 3.2 Ajouter le serveur MCP browser-console
Dans la section `mcpServers` de ton projet, ajouter :

```json
{
  "projects": {
    "TON_CHEMIN_DE_PROJET": {
      "mcpServers": {
        "browser-console": {
          "type": "stdio",
          "command": "node",
          "args": [
            "CHEMIN_VERS/claude-console-debugger/mcp-server.js"
          ],
          "env": {}
        }
      }
    }
  }
}
```

**Exemple concret :**
```json
{
  "projects": {
    "C:\\Users\\toi\\Desktop\\mon-projet": {
      "mcpServers": {
        "browser-console": {
          "type": "stdio", 
          "command": "node",
          "args": [
            "C:/Users/toi/Desktop/claude-console-debugger/mcp-server.js"
          ],
          "env": {}
        }
      }
    }
  }
}
```

### Étape 4: Installer l'Extension Firefox

#### 4.1 Ouvrir Firefox
- Aller à `about:debugging`
- Cliquer "This Firefox"

#### 4.2 Charger l'Extension
- Cliquer "Load Temporary Add-on"
- Sélectionner le fichier `firefox-extension/manifest.json`

### Étape 5: Configuration de l'Extension

#### 5.1 Ouvrir le Popup
- Cliquer sur l'icône de l'extension dans la barre d'outils Firefox

#### 5.2 Configurer les URLs à Monitorer
- **Option 1**: Laisser vide pour monitorer tous les sites
- **Option 2**: Ajouter des URLs spécifiques comme :
  - `localhost:*` (pour développement local)
  - `monsite.com/*` (pour un site spécifique)
  - `*://localhost:3000/*` (port spécifique)

#### 5.3 Régler les Paramètres
- ✅ **Errors Only**: Pour capturer seulement les erreurs
- ✅ **Include Network**: Pour les erreurs réseau
- ✅ **Smart Filter**: Pour filtrer intelligemment
- ✅ **Auto Fix**: Pour les corrections automatiques (expérimental)

### Étape 6: Démarrer le Serveur

#### 6.1 Lancer le Serveur MCP
```bash
cd claude-console-debugger
node mcp-server.js
```

Tu devrais voir :
```
🚀 Claude Console Debugger Server running on http://localhost:8081
📡 WebSocket server ready on ws://localhost:8082
```

### Étape 7: Test et Utilisation

#### 7.1 Tester la Capture
1. Va sur ton site web à développer
2. Ouvre la console (F12)
3. Génère une erreur volontaire : `console.error("Test error")`
4. Vérifie dans le popup de l'extension que l'erreur est capturée

#### 7.2 Utiliser avec Claude CLI
Dans ton terminal Claude CLI :

```bash
claude "Y a-t-il des erreurs sur mon site actuellement ?"
```

Claude pourra maintenant :
- ✅ Voir les erreurs en temps réel
- ✅ Analyser le contexte complet
- ✅ Proposer des corrections
- ✅ Identifier les patterns d'erreurs
- ✅ Suggérer des améliorations

### 🎯 Utilisation Avancée

#### Monitoring Spécifique par Projet
Chaque ami peut configurer des URLs spécifiques :
- `localhost:3000/*` pour React/Next.js
- `localhost:8080/*` pour Vue.js  
- `localhost:4200/*` pour Angular
- `127.0.0.1:5173/*` pour Vite

#### Intégration CI/CD
L'extension peut capturer les erreurs en production et les envoyer automatiquement à Claude pour analyse.

### 🔧 Troubleshooting

#### Si l'Extension Ne Fonctionne Pas
1. Vérifier que Firefox autorise les extensions temporaires
2. Recharger l'extension dans `about:debugging`
3. Vérifier les permissions dans les paramètres Firefox

#### Si le Serveur MCP Ne Se Connecte Pas
1. Vérifier que Node.js est installé (`node --version`)
2. S'assurer que le port 8081 n'est pas utilisé
3. Vérifier le chemin absolu dans `.claude.json`

#### Si Claude CLI Ne Voit Pas les Erreurs
1. Redémarrer Claude CLI après configuration MCP
2. Vérifier les logs du serveur avec `node mcp-server.js`
3. Tester l'API HTTP : `curl http://localhost:8081/health`

---

## 💡 Tips pour Tes Amis

1. **Commencer Simple** : Monitorer d'abord `localhost:*` seulement
2. **Tester Progressivement** : Générer des erreurs volontaires pour valider
3. **Utiliser les Quick Actions** : Le bouton "Current Tab Only" est très pratique
4. **Exporter les Logs** : Pour partager des erreurs complexes
5. **Activer les Notifications** : Pour être alerté immédiatement

**Le système devient vraiment puissant quand Claude CLI peut voir ET corriger les erreurs automatiquement ! 🚀**