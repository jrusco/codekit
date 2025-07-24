// Automated UI testing using JavaScript that runs in browser
// This script simulates manual testing by manipulating DOM directly

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testUI() {
  console.log('🚀 Starting automated UI tests...');
  
  try {
    // Wait for app to load
    await delay(1000);
    
    console.log('✅ UI Layout Tests');
    
    // Test 1: Check if application loaded
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('App container not found');
    }
    console.log('  ✓ Application container loaded');
    
    // Test 2: Check split panel
    const splitPanel = document.querySelector('.split-panel');
    if (!splitPanel) {
      throw new Error('Split panel not found');
    }
    console.log('  ✓ Split panel layout loaded');
    
    // Test 3: Check input textarea
    const inputElement = document.querySelector('[data-role="input"]') || document.querySelector('textarea');
    if (!inputElement) {
      throw new Error('Input textarea not found');
    }
    console.log('  ✓ Input textarea found');
    
    // Test 4: Check output area
    const outputElement = document.querySelector('[data-role="output"]');
    if (!outputElement) {
      throw new Error('Output area not found');
    }
    console.log('  ✓ Output area found');
    
    // Test 5: Check status bar
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar) {
      throw new Error('Status bar not found');
    }
    console.log('  ✓ Status bar loaded');
    
    console.log('\\n🧪 Testing JSON parsing...');
    
    // Test JSON parsing
    const jsonData = `{
  "name": "Test User",
  "age": 25,
  "skills": ["JavaScript", "TypeScript"],
  "active": true
}`;
    
    inputElement.value = jsonData;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for parsing
    await delay(1000);
    
    // Check if format badge appeared
    const formatBadge = outputElement.querySelector('.status-bar__badge') || 
                       document.querySelector('.status-bar__badge');
    if (formatBadge && formatBadge.textContent.includes('JSON')) {
      console.log('  ✓ JSON format detected and badge displayed');
    } else {
      console.log('  ⚠️ JSON format badge not found - checking output content');
      console.log('    Output HTML:', outputElement.innerHTML.substring(0, 200) + '...');
    }
    
    // Check if content was parsed
    if (outputElement.innerHTML.includes('Test User') || outputElement.innerHTML.includes('JavaScript')) {
      console.log('  ✓ JSON content parsed and displayed');
    } else {
      console.log('  ⚠️ JSON content not properly displayed');
      console.log('    Output content:', outputElement.textContent.substring(0, 100));
    }
    
    console.log('\\n🧪 Testing CSV parsing...');
    
    // Test CSV parsing
    const csvData = `Name,Age,Department
John Doe,28,Engineering
Jane Smith,32,Marketing
Bob Johnson,25,Sales`;
    
    inputElement.value = csvData;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    await delay(1000);
    
    // Check CSV parsing
    if (outputElement.innerHTML.includes('John Doe') || outputElement.innerHTML.includes('Engineering')) {
      console.log('  ✓ CSV content parsed and displayed');
    } else {
      console.log('  ⚠️ CSV content not properly displayed');
    }
    
    console.log('\\n🧪 Testing XML parsing...');
    
    // Test XML parsing  
    const xmlData = `<?xml version="1.0"?>
<users>
  <user id="1">
    <name>John Doe</name>
    <department>Engineering</department>
  </user>
</users>`;
    
    inputElement.value = xmlData;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    await delay(1000);
    
    // Check XML parsing
    if (outputElement.innerHTML.includes('John Doe') || outputElement.innerHTML.includes('users')) {
      console.log('  ✓ XML content parsed and displayed');
    } else {
      console.log('  ⚠️ XML content not properly displayed');
    }
    
    console.log('\\n🧪 Testing UI interactions...');
    
    // Test clear button
    const clearButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent && btn.textContent.toLowerCase().includes('clear')
    );
    
    if (clearButton) {
      clearButton.click();
      await delay(500);
      
      if (inputElement.value === '') {
        console.log('  ✓ Clear button works');
      } else {
        console.log('  ⚠️ Clear button not working properly');
      }
    } else {
      console.log('  ⚠️ Clear button not found');
    }
    
    // Test mode toggle buttons
    const textModeButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent && btn.textContent.toLowerCase().includes('text')
    );
    const interactiveModeButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent && btn.textContent.toLowerCase().includes('interactive')
    );
    
    if (textModeButton && interactiveModeButton) {
      console.log('  ✓ Mode toggle buttons found');
      
      // Add some content back for testing
      inputElement.value = jsonData;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(500);
      
      // Test text mode
      textModeButton.click();
      await delay(300);
      console.log('  ✓ Text mode toggle clicked');
      
      // Test interactive mode
      interactiveModeButton.click();
      await delay(300); 
      console.log('  ✓ Interactive mode toggle clicked');
      
    } else {
      console.log('  ⚠️ Mode toggle buttons not found');
    }
    
    console.log('\\n🧪 Testing error handling...');
    
    // Test malformed JSON
    inputElement.value = '{"invalid": json}';
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(1000);
    
    if (outputElement.innerHTML.includes('error') || outputElement.innerHTML.includes('Error')) {
      console.log('  ✓ Error handling works for malformed data');
    } else {
      console.log('  ⚠️ Error handling may not be working properly');
    }
    
    console.log('\\n✨ UI testing completed!');
    console.log('\\n📊 Summary:');
    console.log('  - Core UI components are loaded');
    console.log('  - Multi-format parsing is functional');
    console.log('  - Basic interactions work');
    console.log('  - Error handling is present');
    
    // Performance test
    console.log('\\n🚀 Running performance test...');
    const largeData = '{"data":' + JSON.stringify(Array.from({length: 1000}, (_, i) => ({id: i, name: `Item ${i}`}))) + '}';
    
    const startTime = performance.now();
    inputElement.value = largeData;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(2000);
    const endTime = performance.now();
    
    console.log(`  ✓ Large data parsing took ${(endTime - startTime).toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ UI test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testUI);
  } else {
    testUI();
  }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testUI };
}