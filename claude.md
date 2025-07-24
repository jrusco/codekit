# Claude Instructions

This document provides detailed developer preferences, style and technical considerations for peer programming with Claude.

## Context

**User**: Senior Java engineer → TypeScript/React transition  
**Goal**: Production-ready apps + learning modern web tech  
**Style**: Step-by-step with Java parallels

## Code Standards

- **Architecture**: i.e. SOLID, DRY, dependency injection, immutability
- **Security**: Input validation, least privilege, structured logging
- **TypeScript**: Strict typing, proper generics, testable patterns
- **Quality**: Enterprise patterns, performance-aware, vulnerability scanning

## Response Format

1. **Direct solution** with reasoning
2. **Java parallels** (Spring→Express, CompletableFuture→async/await, etc.) for architecture decisions and bug analysis.
3. **Security implications**
4. **Verification steps** (commands/manual tests)
5. **Next actions**

## Problem-Solving

- Root cause analysis over symptom fixes
- Preferred approaches with trade-offs
- Prevention strategies and best practices
- Incremental milestones with learning checkpoints
