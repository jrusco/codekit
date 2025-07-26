# Claude Instructions

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CodeKit** is a high-performance, multi-format text parsing and validation tool designed to surpass competitive solutions like JSON.pub. Built with vanilla TypeScript and Vite, it provides enterprise-grade text processing capabilities with superior performance characteristics.

### Core Purpose

CodeKit serves as a comprehensive developer toolkit for parsing, validating, and visualizing structured text data (JSON, CSV, XML) with:

- **Real-time validation** with detailed error reporting and line/column precision
- **Interactive visualization** including expandable tree views and sortable tables  
- **Professional UI** with split-panel layout, status bar, and keyboard shortcuts
- **Session persistence** with encrypted localStorage and cross-tab synchronization
- **Performance optimization** for large datasets (1MB+ files) with chunked processing

### Key Features

- **Multi-format support**: JSON, CSV, XML with extensible parser registry architecture
- **Advanced error reporting**: Context-aware validation with user-friendly error messages

## Technology Stack

- **Frontend**: Vanilla TypeScript with Vite build system for optimal performance
- **Styling**: Modern CSS with custom properties and semantic design tokens
- **Testing**: Vitest + Playwright for comprehensive unit/integration testing
- **Quality**: ESLint + Prettier + TypeScript strict mode with enterprise coding standards
- **Deployment**: Static hosting optimized for <150KB bundle size

## Project Structure

### Core Components

- **`src/core/formatters/`** - Multi-format parsing engine
  - `JsonParser.ts` - Advanced JSON parser with superior error reporting
  - `CsvParser.ts` - CSV processor with table visualization support
  - `XmlParser.ts` - XML parser with namespace and structure handling
  - `FormatRegistry.ts` - Central parser registry with auto-detection
  - `FormatDetector.ts` - Intelligent format detection with confidence scoring
  - `PerformanceOptimizer.ts` - Large dataset optimization with chunking

- **`src/ui/`** - Professional user interface components
  - `components/` - Reusable UI components (StatusBar, ValidationPanel, etc.)
  - `layout/SplitPanel.ts` - Resizable split-panel layout system
  - `renderers/` - Format-specific output renderers

- **`src/types/`** - TypeScript type definitions
  - `core.ts` - Core parsing interfaces and types
  - `ui.ts` - UI component and theme type definitions

## Development Status

Progress and roadmap is tracked in the `implementation_plan.md` file located in the root directory.
