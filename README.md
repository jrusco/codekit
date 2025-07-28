# CodeKit

**High-performance, multi-format text parsing and validation tool designed for developers**

CodeKit is a browser-based developer toolkit that provides real-time parsing, validation, and visualization for JSON, CSV, and XML data. Built with vanilla TypeScript and optimized for performance.

## ✨ Key Features

- **Multi-format Support**: JSON, CSV, XML parsing with intelligent format detection
- **Real-time Validation**: Instant error detection with precise line/column reporting
- **High Performance**: Handles large files (5MB+) with optimized parsing algorithms
- **Session Persistence**: Encrypted localStorage with cross-tab synchronization
- **Security-First**: Input sanitization, XSS prevention, and security scanning
- **Professional UI**: Split-panel layout with keyboard shortcuts and accessibility support

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/codekit.git
cd codekit

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
# Type check and build
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Vanilla TypeScript with Vite build system
- **Styling**: Modern CSS with custom properties and responsive design
- **Testing**: Vitest (unit) + Playwright (e2e) + >85% coverage target
- **Security**: DOMPurify + Validator.js for input sanitization
- **Quality**: ESLint + Prettier + TypeScript strict mode

### Core Components

```
src/
├── core/
│   ├── formatters/          # Multi-format parsing engine
│   │   ├── JsonParser.ts    # Advanced JSON parser with error reporting
│   │   ├── CsvParser.ts     # CSV processor with table support
│   │   ├── XmlParser.ts     # XML parser with namespace handling
│   │   └── FormatRegistry.ts # Central parser registry
│   ├── session/             # Session management and persistence
│   ├── security/            # Security and input validation
│   └── analytics/           # Performance monitoring
├── ui/
│   ├── components/          # Reusable UI components
│   ├── layout/             # Split-panel layout system
│   └── renderers/          # Format-specific output renderers
└── types/                  # TypeScript definitions
```

### Design Philosophy

- **Performance-First**: Vanilla implementation for minimal bundle size (<150KB)
- **Security-by-Design**: All inputs sanitized, XSS prevention built-in
- **Extensible Architecture**: Plugin-ready parser registry system
- **Developer Experience**: TypeScript-first with comprehensive tooling

## 🛠️ Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Type check and production build
npm run preview         # Preview production build locally

# Testing
npm run test            # Run unit tests (Vitest)
npm run test:ui         # Run tests with UI dashboard
npm run test:coverage   # Generate coverage report
npm run test:playwright # Run e2e tests (Playwright)
npm run test:all        # Run all tests (unit + e2e)

# Code Quality
npm run type-check      # TypeScript type checking
npm run lint            # ESLint code analysis
npm run lint:fix        # Fix auto-fixable linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Security & Dependencies
npm run audit           # Security vulnerability audit
npm run security:check  # Combined security and dependency check
npm run deps:check      # Check for outdated dependencies
npm run deps:update     # Update dependencies
```

### Testing Strategy

- **Unit Tests**: Core parsing logic, utilities, and components
- **Integration Tests**: Multi-format workflows and UI interactions
- **E2E Tests**: Complete user workflows with Playwright
- **Coverage Target**: >85% for all core functionality
- **Performance Tests**: Large file handling and memory profiling

## 🔒 Security & Dependencies

### Security-First Approach

CodeKit implements enterprise-grade security measures:

- **Input Sanitization**: All user inputs processed through DOMPurify
- **XSS Prevention**: Content Security Policy (CSP) enforcement
- **Dependency Security**: Automated vulnerability scanning with npm audit
- **Secure Storage**: Encrypted session data with integrity validation
- **Code Scanning**: GitHub CodeQL integration for security analysis

### Dependency Strategy

- **Minimal Dependencies**: Only essential, well-maintained packages
- **Security Libraries**: DOMPurify (3.1.7+) and Validator.js (13.14.0+)
- **Platform Compatibility**: Pure JavaScript/TypeScript (no native modules)
- **Regular Audits**: Weekly security checks and quarterly dependency reviews

```bash
# Security audit commands
npm run audit:security    # Production security audit
npm run security:check    # Full security and dependency check
```

## 📊 Performance Targets

- **Bundle Size**: <150KB total
- **Load Time**: <2 seconds cold start
- **Memory Usage**: <50MB for large datasets
- **Validation Speed**: <100ms for 1MB files
- **Format Detection**: >95% accuracy

## 🤝 Contributing

### Code Standards

- **TypeScript**: Strict mode enabled, comprehensive type definitions
- **Architecture**: Follow existing patterns (Registry, Component, Manager)
- **Security**: All inputs must be validated and sanitized
- **Testing**: New features require unit and integration tests
- **Performance**: Monitor bundle size and execution speed

### Development Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests for new functionality
4. **Ensure** all quality checks pass:

   ```bash
   npm run test:all
   npm run type-check
   npm run lint
   npm run security:check
   ```

5. **Commit** with descriptive messages
6. **Push** to your branch
7. **Create** a Pull Request

### Quality Gates

All PRs must pass:

- ✅ TypeScript type checking
- ✅ ESLint code analysis
- ✅ Security vulnerability audit
- ✅ Unit and e2e test suites
- ✅ Performance regression checks

## 📦 Deployment

### Static Hosting

CodeKit is designed for static hosting platforms:

- **GitHub Pages**: Automated deployment via GitHub Actions
- **Vercel/Netlify**: Connect repository for automatic deployments
- **CDN**: Optimized for content delivery networks

### Production Build

```bash
npm run build    # Creates optimized build in dist/
```

**Build Output**:

- Minified and tree-shaken JavaScript
- Optimized CSS with autoprefixing
- Service worker for offline capabilities
- Source maps for debugging (optional)

## 📚 Documentation

- **Implementation Plan**: See `implementation-plan.md` for development roadmap
- **Security Setup**: See `SECURITY_SETUP.md` for GitHub security configuration
- **Dependency Strategy**: See `DEPENDENCY_STRATEGY.md` for dependency management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

