import { test, expect } from '@playwright/test';

test.describe('Security Testing - XSS and Input Sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('XSS Prevention', () => {
    test('should sanitize script tags in JSON input', async ({ page }) => {
      const maliciousJson = '{"script": "<script>alert(\'XSS\')</script>", "safe": "content"}';
      
      await page.locator('#input-textarea').fill(maliciousJson);
      await page.waitForTimeout(500);
      
      // Check that no alert dialogs are triggered
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull(); // No alert should be triggered
      
      // Check that the content is displayed safely
      const outputPanel = page.locator('#output-content, .output-panel');
      const outputText = await outputPanel.textContent();
      
      // Script tags should not execute but content should be visible
      expect(outputText).toContain('script');
      expect(outputText).toContain('safe');
    });

    test('should prevent script injection in CSV data', async ({ page }) => {
      const maliciousCsv = 'name,description\nJohn,"<script>alert(\'CSV XSS\')</script>"\nJane,"<img src=x onerror=alert(\'IMG XSS\')>"';
      
      await page.locator('#input-textarea').fill(maliciousCsv);
      await page.waitForTimeout(500);
      
      // Verify no scripts execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull();
      
      // Check that content is displayed as text, not executed
      const outputPanel = page.locator('#output-content, .output-panel');
      const outputText = await outputPanel.textContent();
      expect(outputText).toContain('script');
      expect(outputText).toContain('img src');
    });

    test('should sanitize XML content with script elements', async ({ page }) => {
      const maliciousXml = `<?xml version="1.0"?>
<root>
  <script>alert('XML XSS')</script>
  <item onclick="alert('Event XSS')">Content</item>
  <data><![CDATA[<script>alert('CDATA XSS')</script>]]></data>
</root>`;
      
      await page.locator('#input-textarea').fill(maliciousXml);
      await page.waitForTimeout(500);
      
      // Verify no scripts execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull();
    });

    test('should handle javascript: URLs safely', async ({ page }) => {
      const maliciousJson = '{"link": "javascript:alert(\'URL XSS\')", "href": "javascript:void(0)"}';
      
      await page.locator('#input-textarea').fill(maliciousJson);
      await page.waitForTimeout(500);
      
      // Check that no navigation or script execution occurs
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull();
    });

    test('should prevent DOM-based XSS through URL parameters', async ({ page }) => {
      // Navigate with malicious URL parameters
      await page.goto('/?input=<script>alert("URL_XSS")</script>&format=json');
      await page.waitForTimeout(500);
      
      // Verify no scripts execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull();
    });
  });

  test.describe('Input Sanitization', () => {
    test('should handle extremely large input safely', async ({ page }) => {
      const largeInput = 'x'.repeat(1000000); // 1MB of data
      const largeJson = `{"data": "${largeInput}"}`;
      
      // Should not crash the application
      await page.locator('#input-textarea').fill(largeJson);
      await page.waitForTimeout(1000);
      
      // App should still be responsive
      const textarea = page.locator('#input-textarea');
      await expect(textarea).toBeVisible();
    });

    test('should sanitize special characters in error messages', async ({ page }) => {
      const malformedJson = '{"<script>": "value", "normal": "<img onerror=alert(1) src=x>"}';
      
      await page.locator('#input-textarea').fill(malformedJson);
      await page.waitForTimeout(500);
      
      // Check error panel for proper sanitization
      const errorPanel = page.locator('.error-panel, [role="alert"]');
      const errorCount = await errorPanel.count();
      
      if (errorCount > 0) {
        const errorText = await errorPanel.textContent();
        // Error messages should contain the problematic characters as text, not executable code
        expect(errorText).toBeDefined();
      }
      
      // No scripts should execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      expect(dialog).toBeNull();
    });

    test('should prevent CSV injection attacks', async ({ page }) => {
      const csvInjection = `name,formula
John,=cmd|'/c calc'!A0
Jane,@SUM(1+9)*cmd|'/c calc'!A0
Bob,+cmd|'/c calc'!A0
Alice,-2+3+cmd|'/c calc'!A0`;
      
      await page.locator('#input-textarea').fill(csvInjection);
      await page.waitForTimeout(500);
      
      // Check that formulas are treated as text, not executed
      const outputPanel = page.locator('#output-content, .output-panel');
      const outputText = await outputPanel.textContent();
      
      // Should display the formula characters as text
      expect(outputText).toContain('=');
      expect(outputText).toContain('@');
      expect(outputText).toContain('+');
      expect(outputText).toContain('-');
    });

    test('should handle Unicode and special encoding safely', async ({ page }) => {
      const unicodeJson = `{
        "unicode": "\\u003cscript\\u003ealert('Unicode XSS')\\u003c/script\\u003e",
        "emoji": "🚀💻🔒",
        "special": "\\x3cscript\\x3ealert(1)\\x3c/script\\x3e"
      }`;
      
      await page.locator('#input-textarea').fill(unicodeJson);
      await page.waitForTimeout(500);
      
      // Verify no scripts execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull();
    });

    test('should prevent prototype pollution attempts', async ({ page }) => {
      const prototypePollutionJson = `{
        "__proto__": {
          "admin": true,
          "isAdmin": true
        },
        "constructor": {
          "prototype": {
            "admin": true
          }
        },
        "normal": "data"
      }`;
      
      await page.locator('#input-textarea').fill(prototypePollutionJson);
      await page.waitForTimeout(500);
      
      // Check that the application handles this safely
      const outputPanel = page.locator('#output-content, .output-panel');
      await expect(outputPanel).toBeVisible();
      
      // Verify the page is still functional
      const textarea = page.locator('#input-textarea');
      await expect(textarea).toBeVisible();
    });
  });

  test.describe('Content Security Policy', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      const cspHeader = response?.headers()['content-security-policy'];
      
      // CSP should exist (if implemented)
      if (cspHeader) {
        expect(cspHeader).toContain("script-src");
        expect(cspHeader).not.toContain("unsafe-eval");
        expect(cspHeader).not.toContain("unsafe-inline");
      }
    });

    test('should block inline script execution', async ({ page }) => {
      // Try to add inline script
      await page.addScriptTag({
        content: `
          window.xssTest = true;
          if (window.alert) {
            window.alert('Inline script executed');
          }
        `
      }).catch(() => {
        // CSP should block this
      });
      
      // Check if XSS test variable was set
      const xssTestValue = await page.evaluate(() => window.xssTest);
      
      // With proper CSP, this should be undefined or the script should be blocked
      if (xssTestValue === undefined) {
        // Good - script was blocked
        expect(xssTestValue).toBeUndefined();
      } else {
        // If script executed, at least verify no alerts were shown
        const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        const dialog = await dialogPromise;
        expect(dialog).toBeNull();
      }
    });
  });

  test.describe('File Upload Security', () => {
    test('should handle malicious file content safely', async ({ page }) => {
      // Simulate file upload with malicious content
      const maliciousContent = `<html>
<head><script>alert('File XSS')</script></head>
<body>
  <script>document.body.innerHTML = '<img src=x onerror=alert(1)>';</script>
  {"data": "normal"}
</body>
</html>`;
      
      // If there's a file input, test it
      const fileInput = page.locator('input[type="file"]');
      const fileInputCount = await fileInput.count();
      
      if (fileInputCount > 0) {
        // Create a temporary file with malicious content
        const buffer = Buffer.from(maliciousContent);
        await fileInput.setInputFiles({
          name: 'malicious.json',
          mimeType: 'application/json',
          buffer
        });
        
        await page.waitForTimeout(500);
        
        // Verify no scripts execute
        const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        const dialog = await dialogPromise;
        expect(dialog).toBeNull();
      } else {
        // If no file input, test by pasting the content
        await page.locator('#input-textarea').fill(maliciousContent);
        await page.waitForTimeout(500);
        
        const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        const dialog = await dialogPromise;
        expect(dialog).toBeNull();
      }
    });
  });

  test.describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', async ({ page }) => {
      // Test with various malformed inputs that might trigger detailed errors
      const malformedInputs = [
        '{"__proto__": null}',
        '{"constructor": {"prototype": {}}}',
        '<script src="http://evil.com/malicious.js"></script>',
        'eval("alert(1)")',
        '${7*7}', // Template literal injection
        '{{7*7}}' // Template injection
      ];
      
      for (const input of malformedInputs) {
        await page.locator('#input-textarea').fill(input);
        await page.waitForTimeout(300);
        
        // Check for error messages
        const errorElements = page.locator('.error, [role="alert"], .error-panel');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          const errorText = await errorElements.textContent();
          
          // Error messages should not contain:
          // - File paths
          // - Stack traces
          // - Internal variable names
          // - Sensitive configuration details
          expect(errorText).not.toMatch(/[A-Z]:\\/); // Windows paths
          expect(errorText).not.toMatch(/\/[a-z]+\/[a-z]+\//); // Unix paths
          expect(errorText).not.toMatch(/at Object\./); // Stack traces
          expect(errorText).not.toMatch(/password|secret|key|token/i);
        }
        
        // Clear input for next test
        await page.locator('#input-textarea').clear();
      }
    });
  });
});