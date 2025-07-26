import { test, expect } from '@playwright/test';

/**
 * Output Panel Layout Tests
 * Ensures the output panel utilizes available space properly and removes duplicate headers
 */
test.describe('Output Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-role="input"]', { timeout: 5000 });
  });

  test('should fill available vertical space without duplicate headers', async ({ page }) => {
    const testJson = JSON.stringify({
      data: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i} with enough text to ensure content overflows and requires scrolling behavior to be tested properly.`
      }))
    }, null, 2);

    // Find input and output elements
    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    await expect(inputTextarea).toBeVisible();
    await expect(outputElement).toBeVisible();

    // Input large JSON data
    await inputTextarea.fill(testJson);
    
    // Wait for parsing to complete
    await page.waitForTimeout(1000);

    // Check that output element uses full height
    const outputBox = await outputElement.boundingBox();
    const parentBox = await outputElement.locator('..').boundingBox();
    
    expect(outputBox).toBeTruthy();
    expect(parentBox).toBeTruthy();
    
    if (outputBox && parentBox) {
      // Output should utilize most of the parent's height (allowing for small margins)
      const heightUtilization = outputBox.height / parentBox.height;
      expect(heightUtilization).toBeGreaterThan(0.8); // Should use at least 80% of available height
    }

    // Check that there's no duplicate "Output" header inside the content
    const outputContent = await outputElement.innerHTML();
    const outputHeaderMatches = outputContent.match(/Output/gi) || [];
    
    // Should have at most 1 occurrence (from format badge or other legitimate uses)
    // The main "Output" header should be outside this element
    expect(outputHeaderMatches.length).toBeLessThanOrEqual(1);
  });

  test('should display format badge without redundant headers', async ({ page }) => {
    const testCsv = 'Name,Age,Email\nJohn,25,john@test.com\nJane,30,jane@test.com';

    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    await inputTextarea.fill(testCsv);
    await page.waitForTimeout(1000);

    // Check that format badge is present in main header
    const csvBadge = page.locator('#output-format-badge .status-bar__badge--csv');
    await expect(csvBadge).toBeVisible();
    
    // Ensure badge shows correct format
    await expect(csvBadge).toHaveText('CSV');

    // Verify no duplicate headers exist
    const outputText = await outputElement.textContent();
    expect(outputText).not.toMatch(/Output.*Output/i); // No duplicate "Output" text
  });

  test('should handle interactive and text mode toggles properly', async ({ page }) => {
    const testXml = `<?xml version="1.0"?>
<root>
  <items>
    ${Array.from({ length: 20 }, (_, i) => `<item id="${i}">Item ${i}</item>`).join('\n    ')}
  </items>
</root>`;

    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    await inputTextarea.fill(testXml);
    await page.waitForTimeout(1000);

    // Test Interactive mode (default)
    const interactiveButton = page.locator('button:has-text("Interactive")');
    await expect(interactiveButton).toBeVisible();
    
    // Verify output uses full space in interactive mode
    let outputBox = await outputElement.boundingBox();
    expect(outputBox?.height).toBeGreaterThan(300); // Should have substantial height

    // Switch to Text mode
    const textButton = page.locator('button:has-text("Text")');
    await textButton.click();
    await page.waitForTimeout(500);

    // Verify output still uses full space in text mode  
    outputBox = await outputElement.boundingBox();
    expect(outputBox?.height).toBeGreaterThan(300); // Should maintain substantial height

    // Check for XML badge in both modes (now in main header)
    const xmlBadge = page.locator('#output-format-badge .status-bar__badge');
    await expect(xmlBadge).toBeVisible();
  });

  test('should maintain proper scrolling in all display modes', async ({ page }) => {
    // Large JSON data to ensure scrolling
    const largeData = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Long description for item ${i} `.repeat(10),
        metadata: {
          tags: Array.from({ length: 5 }, (_, j) => `tag${j}`),
          properties: Object.fromEntries(
            Array.from({ length: 10 }, (_, k) => [`prop${k}`, `value${k}`])
          )
        }
      }))
    };

    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    await inputTextarea.fill(JSON.stringify(largeData, null, 2));
    await page.waitForTimeout(1500);

    // Check that output content is scrollable
    const outputContentBox = await outputElement.locator('div').first().boundingBox();
    const outputScrollableContent = outputElement.locator('div[style*="overflow: auto"]');
    
    await expect(outputScrollableContent).toBeVisible();
    
    // Verify scrollHeight > clientHeight (indicates scrollable content)
    const isScrollable = await outputScrollableContent.evaluate(el => {
      return el.scrollHeight > el.clientHeight;
    });
    
    expect(isScrollable).toBe(true);
  });

  test('should handle empty and error states without wasted space', async ({ page }) => {
    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    // Test empty state
    await inputTextarea.fill('');
    await page.waitForTimeout(500);
    
    // Empty state should still use full height
    let outputBox = await outputElement.boundingBox();
    expect(outputBox?.height).toBeGreaterThan(200);
    
    // Verify empty state message
    await expect(outputElement).toContainText('Ready to parse your data');

    // Test error state with invalid data
    await inputTextarea.fill('invalid json {broken}');
    await page.waitForTimeout(1000);
    
    // Error state should also use full height
    outputBox = await outputElement.boundingBox();
    expect(outputBox?.height).toBeGreaterThan(200);
    
    // Should show error message
    await expect(outputElement).toContainText('Parse Error');
  });

  test('should display properly on different viewport sizes', async ({ page }) => {
    const testData = '{"test": "responsive design"}';
    
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const inputTextarea = page.locator('[data-role="input"]');
    const outputElement = page.locator('[data-role="output"]');
    
    await inputTextarea.fill(testData);
    await page.waitForTimeout(500);
    
    let outputBox = await outputElement.boundingBox();
    const desktopHeight = outputBox?.height || 0;
    expect(desktopHeight).toBeGreaterThan(300);

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    
    outputBox = await outputElement.boundingBox();
    const tabletHeight = outputBox?.height || 0;
    expect(tabletHeight).toBeGreaterThan(200);

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    outputBox = await outputElement.boundingBox();
    const mobileHeight = outputBox?.height || 0;
    expect(mobileHeight).toBeGreaterThan(150);
    
    // Output should adapt to available space at all sizes
    expect(mobileHeight).toBeLessThan(tabletHeight);
    expect(tabletHeight).toBeLessThanOrEqual(desktopHeight);
  });
});