// Scrollbar Debug Script - Tests scrollbar visibility specifically
// Open http://localhost:5177 and paste this in browser console

const testScrollbarVisibility = () => {
  console.log('%c🔍 Scrollbar Debug Test', 'color: #ff6b35; font-size: 18px; font-weight: bold;');
  console.log('===========================');
  
  const inputElement = document.querySelector('[data-role="input"]') || document.querySelector('textarea');
  const outputElement = document.querySelector('[data-role="output"]');
  
  if (!inputElement || !outputElement) {
    console.error('❌ Could not find required elements');
    return;
  }

  console.log('✅ Found input and output elements');
  console.log('📊 Output element info:');
  console.log('  - tagName:', outputElement.tagName);
  console.log('  - id:', outputElement.id);
  console.log('  - data-role:', outputElement.getAttribute('data-role'));
  
  // Create large JSON content guaranteed to overflow
  const largeContent = JSON.stringify({
    debug: "scrollbar visibility test",
    timestamp: new Date().toISOString(),
    data: Array.from({ length: 200 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `This is item ${i} with a very long description that contains multiple sentences and detailed information about the item. This description is intentionally verbose to ensure we have substantial content that will definitely require scrolling to view completely. Additional details include properties, metadata, and various attributes that make each item unique and comprehensive for testing purposes.`,
      category: `Category ${i % 15}`,
      subcategory: `Subcategory ${i % 8}`,
      tags: Array.from({ length: 8 }, (_, j) => `tag-${i}-${j}`),
      metadata: {
        created: new Date(2020 + (i % 4), i % 12, (i % 28) + 1).toISOString(),
        modified: new Date().toISOString(),
        version: `${Math.floor(i / 10)}.${i % 10}.${i % 100}`,
        author: `Author ${i % 25}`,
        status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'pending' : 'inactive',
        properties: Object.fromEntries(
          Array.from({ length: 12 }, (_, k) => [`property_${k}`, `value_${i}_${k}_with_additional_text`])
        ),
        stats: {
          views: Math.floor(Math.random() * 50000),
          downloads: Math.floor(Math.random() * 5000),
          rating: (Math.random() * 5).toFixed(2),
          reviews: Math.floor(Math.random() * 500),
          likes: Math.floor(Math.random() * 1000),
          shares: Math.floor(Math.random() * 100)
        }
      }
    }))
  }, null, 2);

  console.log(`📄 Generated content size: ${Math.round(largeContent.length / 1024)}KB`);
  console.log(`📄 Estimated lines: ${largeContent.split('\n').length}`);

  // Input the large content
  console.log('\n🔄 Inputting large JSON content...');
  inputElement.value = largeContent;
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));

  // Wait for parsing and then analyze scrollbars
  setTimeout(() => {
    console.log('\n📋 Analyzing output element structure...');
    
    // Get current output structure
    const outputBox = outputElement.getBoundingClientRect();
    console.log(`📏 Output element dimensions: ${Math.round(outputBox.width)}x${Math.round(outputBox.height)}px`);
    
    // Find scrollable child elements
    const scrollableElements = outputElement.querySelectorAll('*');
    console.log(`🔍 Found ${scrollableElements.length} child elements`);
    
    let scrollableFound = false;
    scrollableElements.forEach((elem, index) => {
      const computedStyle = window.getComputedStyle(elem);
      const overflowY = computedStyle.overflowY;
      const overflowX = computedStyle.overflowX;
      const scrollHeight = elem.scrollHeight;
      const clientHeight = elem.clientHeight;
      const scrollWidth = elem.scrollWidth;
      const clientWidth = elem.clientWidth;
      
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowX === 'auto' || overflowX === 'scroll') {
        console.log(`\n📦 Scrollable element found [${index}]:`);
        console.log(`  - Tag: ${elem.tagName}`);
        console.log(`  - Classes: ${elem.className}`);
        console.log(`  - overflow-y: ${overflowY}`);
        console.log(`  - overflow-x: ${overflowX}`);
        console.log(`  - scrollHeight: ${scrollHeight}px`);
        console.log(`  - clientHeight: ${clientHeight}px`);
        console.log(`  - scrollWidth: ${scrollWidth}px`);
        console.log(`  - clientWidth: ${clientWidth}px`);
        console.log(`  - vertically scrollable: ${scrollHeight > clientHeight}`);
        console.log(`  - horizontally scrollable: ${scrollWidth > clientWidth}`);
        
        if (scrollHeight > clientHeight || scrollWidth > clientWidth) {
          scrollableFound = true;
          console.log('  ✅ This element should show scrollbars!');
          
          // Test actual scrolling
          elem.scrollTop = 100;
          setTimeout(() => {
            if (elem.scrollTop > 0) {
              console.log('  ✅ Scrolling works!');
            } else {
              console.log('  ❌ Scrolling not working');
            }
            elem.scrollTop = 0; // Reset
          }, 100);
        } else {
          console.log('  ℹ️ Content fits without scrolling');
        }
      }
    });
    
    if (!scrollableFound) {
      console.log('\n❌ No scrollable elements found that need scrollbars!');
      console.log('\n🔧 Debugging CSS...');
      
      // Check parent constraints
      const parent = outputElement.parentElement;
      if (parent) {
        const parentBox = parent.getBoundingClientRect();
        const parentStyle = window.getComputedStyle(parent);
        console.log(`📦 Parent element (${parent.tagName}):`);
        console.log(`  - dimensions: ${Math.round(parentBox.width)}x${Math.round(parentBox.height)}px`);
        console.log(`  - display: ${parentStyle.display}`);
        console.log(`  - flex-direction: ${parentStyle.flexDirection}`);
        console.log(`  - height: ${parentStyle.height}`);
        console.log(`  - max-height: ${parentStyle.maxHeight}`);
        console.log(`  - min-height: ${parentStyle.minHeight}`);
      }
    } else {
      console.log('\n✅ Found scrollable content!');
    }
    
    // Check scrollbar CSS
    console.log('\n🎨 Checking scrollbar CSS...');
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'overflow-y: auto; height: 100px; width: 100px;';
    testDiv.innerHTML = 'Test<br>'.repeat(50);
    document.body.appendChild(testDiv);
    
    setTimeout(() => {
      const testScrollHeight = testDiv.scrollHeight;
      const testClientHeight = testDiv.clientHeight;
      console.log(`🧪 Test div scrollable: ${testScrollHeight > testClientHeight}`);
      document.body.removeChild(testDiv);
      
      if (testScrollHeight > testClientHeight) {
        console.log('✅ Scrollbars should be working in general');
      } else {
        console.log('❌ Scrollbar CSS might be broken');
      }
    }, 100);
    
    // Test CSV format as well
    console.log('\n📋 Testing CSV format...');
    const csvData = Array.from({ length: 100 }, (_, i) => 
      `Item${i},Category${i % 10},Description for item ${i} with detailed information,${20 + i},user${i}@test.com,${i % 2 === 0 ? 'Active' : 'Inactive'},${2020 + (i % 4)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')},Tag1-${i},Tag2-${i},Tag3-${i}`
    );
    csvData.unshift('Name,Category,Description,Age,Email,Status,Date,Tag1,Tag2,Tag3');
    
    setTimeout(() => {
      inputElement.value = csvData.join('\n');
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      
      setTimeout(() => {
        console.log('\n📊 CSV test completed - check for table scrollbars');
        console.log('\n================================');
        console.log('%c🎯 Debug Complete!', 'color: #00ff00; font-weight: bold;');
        console.log('Check above for scrollbar analysis results.');
      }, 1500);
    }, 2000);
    
  }, 2000);
};

// Auto-run
console.log('🚀 Starting scrollbar debug test in 3 seconds...');
setTimeout(testScrollbarVisibility, 3000);