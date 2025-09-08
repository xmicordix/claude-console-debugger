# 🤝 Contributing to Claude Console Debugger

Thank you for your interest in contributing! This project helps developers debug web applications more efficiently using Claude AI.

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Code Style](#code-style)

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Firefox Browser (for extension testing)
- Claude CLI (for full system testing)
- Git

### Quick Setup
```bash
git clone https://github.com/xmicordix/claude-console-debugger.git
cd claude-console-debugger
npm install
```

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Load Extension in Firefox
1. Open Firefox → `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `firefox-extension/manifest.json`

### 3. Start MCP Server
```bash
node mcp-server.js
```

### 4. Test the System
- Navigate to any webpage with console output
- Check extension popup for captured logs
- Verify MCP server receives data at `http://localhost:8081`

## 📁 Project Structure

```
├── firefox-extension/     # Browser extension components
│   ├── manifest.json     # Extension configuration
│   ├── background.js     # Service worker & error processing
│   ├── content.js        # Content script injection
│   ├── injected.js       # Page-level console interception
│   └── popup-advanced.*  # Configuration UI
├── .github/              # GitHub templates & workflows
├── powershell/           # Legacy PowerShell server
├── mcp-server.js         # Main Node.js MCP server
├── install.ps1          # Windows installation script
└── install.sh           # Mac/Linux installation script
```

## 🎯 Contributing Guidelines

### What We're Looking For
- 🐛 **Bug fixes** - Especially extension compatibility issues
- ✨ **Feature enhancements** - Better error detection, UI improvements
- 📚 **Documentation** - Setup guides, troubleshooting, examples
- 🧪 **Tests** - Unit tests, integration tests, browser testing
- 🌐 **Browser support** - Chrome extension port, Safari support

### Areas That Need Help
1. **Chrome Extension Port** - Adapting to Manifest V3
2. **Error Pattern Recognition** - Smarter filtering algorithms
3. **Performance Optimization** - Reduce memory usage and latency
4. **Dashboard Interface** - Web-based monitoring console
5. **CI/CD Pipeline** - Automated testing and deployment

## 🔄 Pull Request Process

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### 2. Make Your Changes
- Follow the existing code style
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes
```bash
# Test extension in Firefox
# Start MCP server and verify functionality
# Run any relevant tests
npm test
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add your feature description"
# or
git commit -m "fix: resolve issue with component"
```

Follow [Conventional Commits](https://conventionalcommits.org/) format:
- `feat:` new features
- `fix:` bug fixes  
- `docs:` documentation changes
- `style:` formatting changes
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Create a pull request with:
- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Screenshots** if UI changes are involved
- **Testing instructions** for reviewers

## 🧪 Testing

### Manual Testing Checklist
- [ ] Extension loads without errors in Firefox
- [ ] Console logs are captured correctly
- [ ] MCP server receives and processes data
- [ ] Configuration settings persist
- [ ] Error filtering works as expected
- [ ] No memory leaks during extended use

### Automated Testing
```bash
# Run existing tests
npm test

# Add new tests in test/ directory
```

### Browser Testing
Test across different scenarios:
- Different websites (React, Vue, vanilla JS)
- Various error types (JavaScript, network, CSP)
- Multiple tabs and windows
- Extension reload/disable/enable

## 🎨 Code Style

### JavaScript/Node.js
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use meaningful variable names
- Add JSDoc comments for functions

```javascript
/**
 * Processes console error and enriches with context
 * @param {Object} errorData - Raw error from browser
 * @param {string} url - Page URL where error occurred
 * @returns {Object} Enriched error object
 */
function processError(errorData, url) {
  // Implementation
}
```

### Firefox Extension
- Follow Mozilla's [WebExtension guidelines](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- Use consistent naming conventions
- Handle permissions gracefully
- Minimize background script usage

### Documentation
- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep README and guides updated

## 🏷️ Issue Labels

When creating issues or PRs, use appropriate labels:

- **Type Labels**
  - `bug` - Something isn't working
  - `enhancement` - New feature or request
  - `documentation` - Documentation improvements
  - `question` - Questions or support requests

- **Priority Labels**
  - `priority-high` - Critical issues
  - `priority-medium` - Important improvements
  - `priority-low` - Nice-to-have features

- **Component Labels**
  - `extension` - Firefox extension related
  - `mcp-server` - MCP server related
  - `installation` - Setup/installation issues

## ❓ Getting Help

- **Documentation**: Check [SETUP-GUIDE.md](SETUP-GUIDE.md) and [README.md](README.md)
- **Issues**: Search existing [GitHub issues](https://github.com/xmicordix/claude-console-debugger/issues)
- **Questions**: Open a new issue with the `question` label

## 🙏 Recognition

All contributors will be recognized in our README and release notes. We appreciate:
- Code contributions (features, fixes, tests)
- Documentation improvements
- Bug reports with detailed reproduction steps
- Feature suggestions with clear use cases
- Community support and help

---

**Ready to contribute?** 🚀 Start by checking our [open issues](https://github.com/xmicordix/claude-console-debugger/issues) or propose something new!

Thank you for helping make web debugging smarter with Claude AI! ❤️
