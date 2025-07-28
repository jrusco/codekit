// Vite plugin for Content Security Policy injection
// Integrates CSPManager with build process for production security

import type { Plugin } from 'vite';

export interface CSPPluginOptions {
  development?: boolean;
  production?: boolean;
  testing?: boolean;
  reportUri?: string;
}

export function cspPlugin(options: CSPPluginOptions = {}): Plugin {
  const {
    development = true,
    production = true,
    testing = false,
    reportUri
  } = options;

  return {
    name: 'csp-plugin',
    transformIndexHtml: {
      enforce: 'pre',
      transform(html, context) {
        // Determine environment
        const isDev = context.server?.config.command === 'serve';
        const isProd = context.server?.config.command === 'build';
        const isTest = process.env.NODE_ENV === 'test';

        let environment: 'development' | 'production' | 'testing' = 'production';
        
        if (isDev && development) {
          environment = 'development';
        } else if (isTest && testing) {
          environment = 'testing';
        } else if (isProd && production) {
          environment = 'production';
        }

        // Generate CSP based on environment
        const cspDirectives = generateCSPDirectives(environment, reportUri);
        const cspHeader = Object.entries(cspDirectives)
          .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
          .join('; ');

        // Inject CSP meta tag
        const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspHeader}">`;
        
        // Replace the placeholder comment with the actual CSP
        return html.replace(
          '<!-- CSP will be injected here during build process -->',
          cspMetaTag
        );
      }
    },
    configureServer(server) {
      // Add CSP headers to dev server responses
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url?.endsWith('.html')) {
          const cspDirectives = generateCSPDirectives('development');
          const cspHeader = Object.entries(cspDirectives)
            .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
            .join('; ');
          
          res.setHeader('Content-Security-Policy', cspHeader);
        }
        next();
      });
    }
  };
}

function generateCSPDirectives(
  environment: 'development' | 'production' | 'testing', 
  reportUri?: string
): Record<string, string[]> {
  const baseDirectives = {
    'default-src': ["'self'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"]
  };

  switch (environment) {
    case 'development':
      return {
        ...baseDirectives,
        'script-src': ["'self'", "'unsafe-eval'"], // Allow eval for HMR
        'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles
        'connect-src': [
          "'self'", 
          'ws:', 
          'wss:', 
          'http://localhost:*', 
          'https://localhost:*'
        ],
        'media-src': ["'self'"],
        'frame-src': ["'none'"]
      };

    case 'production':
      const prodDirectives = {
        ...baseDirectives,
        'script-src': ["'self'"], // Strict - no unsafe-eval or unsafe-inline
        'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for dynamic theming
        'connect-src': [
          "'self'", 
          'https://queue.simpleanalyticscdn.com', 
          'https://simpleanalytics.com'
        ],
        'media-src': ["'none'"],
        'frame-src': ["'none'"]
      };

      if (reportUri) {
        prodDirectives['report-uri'] = [reportUri];
      }

      return prodDirectives;

    case 'testing':
      return {
        ...baseDirectives,
        'script-src': ["'self'", "'unsafe-inline'"], // Allow inline scripts for testing
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'data:'],
        'media-src': ["'self'"],
        'frame-src': ["'none'"]
      };

    default:
      return baseDirectives;
  }
}