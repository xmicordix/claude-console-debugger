# 🤝 Contributing to Claude Console Debugger

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests Process

1. **Fork** the repo and create your branch from `main`
2. **Install** dependencies: `npm install`
3. **Make** your changes
4. **Test** your changes: `npm test`
5. **Lint** your code: `npm run lint`
6. **Update** documentation if needed
7. **Create** a pull request with a clear title and description

## 📋 Code Standards

### JavaScript/Node.js
- Use ES6+ features
- Follow ESLint configuration
- Use Prettier for formatting
- Comment complex logic
- Write tests for new features

### PowerShell
- Use approved verbs
- Comment functions and complex logic
- Follow PowerShell best practices
- Handle errors gracefully

### Extension Development
- Follow Web Extensions standards
- Use modern JavaScript (ES2020+)
- Ensure Firefox compatibility (v57+)
- Test in different environments

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Specific test file
npm test -- path/to/test.js

# Watch mode
npm test -- --watch
```

### Extension Testing
```bash
# Lint extension
web-ext lint --source-dir=firefox-extension

# Run in temporary Firefox
web-ext run --source-dir=firefox-extension

# Build extension
web-ext build --source-dir=firefox-extension
```

## 🐛 Bug Reports

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Windows 10]
 - Browser: [e.g. Firefox 100.0]
 - Extension version: [e.g. 1.0.0]
 - Claude CLI version: [e.g. 1.0.108]

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

Feature requests are welcome! Please use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Chrome extension port
- [ ] Performance optimizations
- [ ] Better error filtering algorithms
- [ ] Dashboard web interface
- [ ] Mobile browser support

### Medium Priority
- [ ] Database persistence (SQLite/PostgreSQL)
- [ ] Team collaboration features
- [ ] CI/CD integrations
- [ ] Slack/Discord notifications
- [ ] Advanced analytics

### Low Priority
- [ ] Themes and customization
- [ ] Plugin system
- [ ] Export formats (CSV, XML)
- [ ] Internationalization

## 🔧 Development Setup

### Prerequisites
- Node.js 16+
- Firefox 57+
- PowerShell 5.1+
- Git

### Setup Steps
```bash
# Clone your fork
git clone https://github.com/yourusername/claude-console-debugger.git

# Navigate to directory
cd claude-console-debugger

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start PowerShell server
cd powershell
powershell -ExecutionPolicy Bypass .\start-claude-debugger.ps1
```

### Project Structure
```
claude-console-debugger/
├── firefox-extension/     # Browser extension code
├── powershell/           # PowerShell server
├── tests/               # Test files
├── docs/                # Documentation
└── tools/               # Development tools
```

## 📝 Commit Messages

Use conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semicolons, etc
- `refactor:` code restructuring
- `test:` adding missing tests
- `chore:` maintenance tasks

Examples:
```
feat: add URL filtering to extension popup
fix: resolve PowerShell server memory leak
docs: update installation instructions
```

## 🎨 Code Style

### JavaScript
```javascript
// Good
const analyzeError = async (errorData) => {
  try {
    const result = await claudeAPI.analyze(errorData);
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
};

// Avoid
function analyzeError(errorData) {
  return claudeAPI.analyze(errorData).then(result => {
    return result;
  }).catch(error => {
    console.error('Analysis failed:', error);
    throw error;
  });
}
```

### PowerShell
```powershell
# Good
function Invoke-ErrorAnalysis {
    param(
        [Parameter(Mandatory = $true)]
        [object]$ErrorData
    )
    
    try {
        $analysis = Start-ClaudeAnalysis -Data $ErrorData
        return $analysis
    }
    catch {
        Write-Error "Analysis failed: $($_.Exception.Message)"
        throw
    }
}

# Follow PowerShell naming conventions
# Use approved verbs (Get, Set, New, Remove, etc.)
# Use PascalCase for functions and parameters
```

## 🏷️ Labels

We use these labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `documentation` - Improvements or additions to docs
- `question` - Further information is requested
- `wontfix` - This will not be worked on

## 🚦 Review Process

1. **Automated checks** must pass (tests, linting)
2. **At least one reviewer** approval required
3. **All conversations** must be resolved
4. **Branch** must be up to date with main

### Review Checklist
- [ ] Code follows project style
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Security implications reviewed

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙋‍♀️ Questions?

Feel free to:
- Open an issue with the `question` label
- Join our Discord: [discord.gg/example](https://discord.gg/example)
- Email us: contribute@example.com

## 🎉 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Invited to maintainer discussions (for significant contributions)

Thank you for contributing! 🚀