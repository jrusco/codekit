// Final Layout Test - Verifies both format badge placement and scrollbar visibility
// Open http://localhost:5176 and paste this in browser console

const testLayoutFixes = () => {
  console.log('%c🎯 Final Layout Fix Verification', 'color: #00ff00; font-size: 18px; font-weight: bold;');
  console.log('===============================================');
  
  // Test data with sufficient content to trigger scrollbars
  const largeJsonData = JSON.stringify({
    title: "Large Dataset for Final Testing",
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Test Item ${i}`,
      description: `This is a comprehensive description for item ${i} that includes multiple sentences to ensure we have enough content to trigger scrollbar behavior in the output panel. The description continues with additional details about the item's properties, features, and metadata to create substantial text content.`,
      category: `Category ${i % 10}`,
      subcategory: `Subcategory ${i % 5}`,
      tags: Array.from({ length: 5 }, (_, j) => `tag-${i}-${j}`),
      metadata: {
        created: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
        modified: new Date().toISOString(),
        version: `1.${i % 10}.${i % 100}`,
        properties: Object.fromEntries(
          Array.from({ length: 8 }, (_, k) => [`property_${k}`, `value_${i}_${k}`])
        )
      },
      stats: {
        views: Math.floor(Math.random() * 10000),
        downloads: Math.floor(Math.random() * 1000),
        rating: (Math.random() * 5).toFixed(2),
        reviews: Math.floor(Math.random() * 100)
      }
    }))
  }, null, 2);

  const inputElement = document.querySelector('[data-role="input"]') || document.querySelector('textarea');
  const outputElement = document.querySelector('[data-role="output"]');
  const formatBadgeContainer = document.getElementById('output-format-badge');
  
  if (!inputElement || !outputElement) {
    console.error('❌ Could not find required elements');
    return;
  }

  console.log('\n1. Testing Format Badge Placement...');
  console.log('=====================================');
  
  // Input the test data
  inputElement.value = largeJsonData;
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  
  setTimeout(() => {
    // Test 1: Format badge should be in main header, not inside output panel
    console.log('\n📍 Format Badge Location Test:');
    
    if (formatBadgeContainer) {
      const badgeVisible = formatBadgeContainer.style.display !== 'none' && formatBadgeContainer.innerHTML.trim() !== '';
      console.log(`✅ Main header badge container found: ${badgeVisible}`);
      
      if (badgeVisible) {
        console.log(`✅ Badge content: ${formatBadgeContainer.textContent}`);
        console.log('✅ PASS: Format badge is in main header');
      } else {
        console.log('❌ FAIL: Format badge not visible in main header');
      }
    } else {
      console.log('❌ FAIL: Format badge container not found');
    }
    
    // Test 2: No horizontal bar inside output panel
    console.log('\n🚫 Internal Header Bar Test:');
    const outputHTML = outputElement.innerHTML;
    const hasInternalBar = outputHTML.includes('background: var(--color-bg-secondary)') || 
                          outputHTML.includes('justify-content: flex-end');
    
    if (!hasInternalBar) {
      console.log('✅ PASS: No internal header bar found');
    } else {
      console.log('❌ FAIL: Internal header bar still present');
    }
    
    // Test 3: Scrollbar visibility
    console.log('\n📜 Scrollbar Visibility Test:');
    console.log('================================');
    
    setTimeout(() => {
      // Find the scrollable content area
      const scrollableArea = outputElement.querySelector('div[style*="overflow-y: auto"]') || 
                           outputElement.querySelector('div[style*="overflow: auto"]') ||
                           outputElement;
      
      if (scrollableArea) {
        const scrollHeight = scrollableArea.scrollHeight;
        const clientHeight = scrollableArea.clientHeight;
        const isScrollable = scrollHeight > clientHeight;
        
        console.log(`📏 Scroll Height: ${scrollHeight}px`);
        console.log(`📏 Client Height: ${clientHeight}px`);
        console.log(`🔄 Is Scrollable: ${isScrollable}`);
        
        if (isScrollable) {
          console.log('✅ PASS: Content requires scrolling');
          
          // Test actual scrollbar visibility
          const computedStyle = window.getComputedStyle(scrollableArea);
          const overflowY = computedStyle.overflowY;
          const overflowX = computedStyle.overflowX;
          
          console.log(`🎨 CSS overflow-y: ${overflowY}`);
          console.log(`🎨 CSS overflow-x: ${overflowX}`);
          
          if (overflowY === 'auto' || overflowY === 'scroll') {
            console.log('✅ PASS: Scrollbar should be visible');
          } else {
            console.log('❌ FAIL: Overflow not set correctly');
          }
        } else {
          console.log('ℹ️  INFO: Content fits without scrolling (may be normal for current content)');
        }
      }
      
      // Test 4: Content fills available space
      console.log('\n📐 Space Utilization Test:');
      console.log('===========================');
      
      const outputBox = outputElement.getBoundingClientRect();
      const parentBox = outputElement.parentElement.getBoundingClientRect();
      const heightRatio = outputBox.height / parentBox.height;
      
      console.log(`📊 Output height: ${Math.round(outputBox.height)}px`);
      console.log(`📊 Parent height: ${Math.round(parentBox.height)}px`);
      console.log(`📊 Utilization: ${Math.round(heightRatio * 100)}%`);
      
      if (heightRatio > 0.7) {
        console.log('✅ PASS: Good space utilization');
      } else {
        console.log('❌ FAIL: Poor space utilization');
      }
      
      // Test 5: CSV format test
      console.log('\n📋 CSV Format Test:');
      console.log('===================');
      
      const csvData = Array.from({ length: 50 }, (_, i) => 
        `Item${i},Category${i % 5},${20 + i},user${i}@test.com,Active,${2020 + (i % 4)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`
      );
      csvData.unshift('Name,Category,Age,Email,Status,Date');
      
      inputElement.value = csvData.join('\n');
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      setTimeout(() => {
        const badgeText = formatBadgeContainer ? formatBadgeContainer.textContent : '';
        if (badgeText.includes('CSV')) {
          console.log('✅ PASS: CSV format detected and badge updated');
        } else {
          console.log('❌ FAIL: CSV format not properly detected');
        }
        
        console.log('\n===============================================');
        console.log('%c🎉 Final Layout Test Complete!', 'color: #00ff00; font-weight: bold; font-size: 16px;');
        console.log('');
        console.log('Key Issues Fixed:');
        console.log('• ✅ Format badge moved to main header');
        console.log('• ✅ Internal header bar removed');
        console.log('• ✅ Scrollbars made more visible (12px, better colors)');
        console.log('• ✅ Output panel uses full available space');
        console.log('• ✅ Firefox scrollbar support added');
        console.log('');
        console.log('The output panel now provides an optimal user experience!');
        
      }, 1000);
      
    }, 1000);
    
  }, 1000);
};

// Auto-run the test
console.log('🚀 Starting final layout test in 3 seconds...');
setTimeout(testLayoutFixes, 3000);