// Development-only auto-test script for CSP compliance
// This file is excluded from production builds

if (import.meta.env.DEV && window.location.hostname === 'localhost') {
  // Auto-test UI after loading (only in development)
  setTimeout(() => {
    console.log('%c🧪 Running automated UI tests...', 'color: #00ff00; font-size: 14px; font-weight: bold;');
    
    // Load and run general UI tests
    fetch('/automated-ui-test.js')
      .then(response => response.text())
      .then(code => {
        // Use dynamic import instead of eval for CSP compliance
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        import(url).catch(err => console.log('UI test script error:', err.message));
      })
      .catch(err => console.log('UI test script not available:', err.message));
    
    // Load and run scrollbar-specific tests
    fetch('/test-scrollbar.js')
      .then(response => response.text())
      .then(code => {
        // Use dynamic import instead of eval for CSP compliance
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        import(url).catch(err => console.log('Scrollbar test script error:', err.message));
      })
      .catch(err => console.log('Scrollbar test script not available:', err.message));
  }, 3000);
}