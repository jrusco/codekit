// Scrollbar Testing Script - Tests that both input and output panels have proper scrollbars

const testScrollbars = () => {
  console.log('🔄 Testing scrollbar functionality...');

  // Generate large JSON data
  const largeJsonData = {
    metadata: { test: "scrollbar", timestamp: new Date().toISOString() },
    items: []
  };

  // Generate 500 items to ensure overflow
  for (let i = 0; i < 500; i++) {
    largeJsonData.items.push({
      id: i,
      name: `Item ${i}`,
      description: `This is a detailed description for item ${i} that contains multiple words to make the content longer and ensure proper text wrapping and scrolling behavior`,
      properties: {
        category: `Category ${i % 10}`,
        subcategory: `Subcategory ${i % 5}`,
        tags: [`tag${i}`, `tag${i+1}`, `tag${i+2}`],
        metadata: {
          created: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
          modified: new Date().toISOString(),
          version: `1.${i % 10}.${i % 100}`,
          flags: {
            active: i % 2 === 0,
            verified: i % 3 === 0,
            premium: i % 5 === 0,
            featured: i % 7 === 0
          }
        }
      },
      stats: {
        views: Math.floor(Math.random() * 10000),
        downloads: Math.floor(Math.random() * 1000),
        rating: Math.random() * 5,
        reviews: Math.floor(Math.random() * 100)
      }
    });
  }

  // Generate large CSV data
  const largeCsvData = 'ID,Name,Email,Department,Salary,Join_Date,Status,Manager,Location,Phone\n' +
    Array.from({ length: 200 }, (_, i) => 
      `${i},Employee ${i},employee${i}@company.com,Department ${i % 10},${45000 + (i * 500)},2023-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')},${i % 2 === 0 ? 'Active' : 'Inactive'},Manager ${Math.floor(i / 10)},Office ${i % 5},555-${String(i).padStart(4, '0')}`
    ).join('\n');

  // Generate large XML data
  const largeXmlData = `<?xml version="1.0" encoding="UTF-8"?>
<company xmlns:hr="http://example.com/hr" xmlns:fin="http://example.com/finance">
  <metadata>
    <name>Test Company for Scrollbar Testing</name>
    <description>This XML document contains extensive data to test scrollbar functionality</description>
  </metadata>
  <departments>
    ${Array.from({ length: 50 }, (_, i) => `
    <department id="${i}" name="Department ${i}">
      <manager>Manager ${i}</manager>
      <budget>${50000 + (i * 10000)}</budget>
      <employees>
        ${Array.from({ length: 10 }, (_, j) => `
        <employee id="${i * 10 + j}">
          <name>Employee ${i * 10 + j}</name>
          <hr:salary>${40000 + (j * 5000)}</hr:salary>
          <position>Position ${j}</position>
          <skills>
            <skill level="expert">Skill A${j}</skill>
            <skill level="intermediate">Skill B${j}</skill>
            <skill level="beginner">Skill C${j}</skill>
          </skills>
          <contact>
            <email>employee${i * 10 + j}@company.com</email>
            <phone>555-${String(i * 10 + j).padStart(4, '0')}</phone>
          </contact>
        </employee>`).join('')}
      </employees>
    </department>`).join('')}
  </departments>
</company>`;

  const testData = {
    json: JSON.stringify(largeJsonData, null, 2),
    csv: largeCsvData,
    xml: largeXmlData
  };

  console.log('📊 Generated test data:');
  console.log(`- JSON: ${Math.round(testData.json.length / 1024)}KB`);
  console.log(`- CSV: ${Math.round(testData.csv.length / 1024)}KB`);
  console.log(`- XML: ${Math.round(testData.xml.length / 1024)}KB`);

  return testData;
};

// Auto-run and expose globally for manual testing
const scrollbarTestData = testScrollbars();

if (typeof window !== 'undefined') {
  window.scrollbarTestData = scrollbarTestData;
  
  console.log('🎯 Manual Scrollbar Test Instructions:');
  console.log('=====================================');
  console.log('');
  console.log('1. Test JSON Scrollbars:');
  console.log('   - Copy: window.scrollbarTestData.json');
  console.log('   - Paste into input panel');
  console.log('   - Verify input panel shows vertical scrollbar');
  console.log('   - Verify output panel shows vertical scrollbar');
  console.log('   - Try both Interactive and Text modes');
  console.log('');
  console.log('2. Test CSV Scrollbars:');
  console.log('   - Copy: window.scrollbarTestData.csv');
  console.log('   - Paste into input panel');
  console.log('   - Verify input panel scrollbar works');
  console.log('   - Verify output table is scrollable both horizontally and vertically');
  console.log('');
  console.log('3. Test XML Scrollbars:');
  console.log('   - Copy: window.scrollbarTestData.xml');
  console.log('   - Paste into input panel');
  console.log('   - Verify input panel scrollbar works');
  console.log('   - Verify output tree view is scrollable');
  console.log('');
  console.log('✅ Success Criteria:');
  console.log('   - Both input and output panels show scrollbars when content overflows');
  console.log('   - Scrollbars are functional (can scroll up/down)');
  console.log('   - Content is fully accessible through scrolling');
  console.log('   - No content is cut off or inaccessible');
  console.log('');
  console.log('🔧 To copy test data, use:');
  console.log('   navigator.clipboard.writeText(window.scrollbarTestData.json)');
  console.log('   navigator.clipboard.writeText(window.scrollbarTestData.csv)');
  console.log('   navigator.clipboard.writeText(window.scrollbarTestData.xml)');
}

// Quick automated test function
const runAutomatedScrollbarTest = async () => {
  console.log('🤖 Running automated scrollbar test...');
  
  const inputElement = document.querySelector('[data-role="input"]') || document.querySelector('textarea');
  const outputElement = document.querySelector('[data-role="output"]'); 
  
  if (!inputElement || !outputElement) {
    console.error('❌ Could not find input or output elements');
    return;
  }

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Test with large JSON
  console.log('  📝 Testing JSON scrollbar...');
  inputElement.value = scrollbarTestData.json;
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(2000);

  // Check if scrollHeight > clientHeight (indicates scrollable content)
  const inputScrollable = inputElement.scrollHeight > inputElement.clientHeight;
  const outputScrollable = outputElement.scrollHeight > outputElement.clientHeight;

  console.log(`  📊 Input scrollable: ${inputScrollable ? '✅' : '❌'} (${inputElement.scrollHeight}px > ${inputElement.clientHeight}px)`);
  console.log(`  📊 Output scrollable: ${outputScrollable ? '✅' : '❌'} (${outputElement.scrollHeight}px > ${outputElement.clientHeight}px)`);

  // Test with CSV
  console.log('  📋 Testing CSV scrollbar...');
  inputElement.value = scrollbarTestData.csv;
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  await delay(2000);

  const csvInputScrollable = inputElement.scrollHeight > inputElement.clientHeight;
  const csvOutputScrollable = outputElement.scrollHeight > outputElement.clientHeight;

  console.log(`  📊 CSV Input scrollable: ${csvInputScrollable ? '✅' : '❌'}`);
  console.log(`  📊 CSV Output scrollable: ${csvOutputScrollable ? '✅' : '❌'}`);

  return { inputScrollable, outputScrollable, csvInputScrollable, csvOutputScrollable };
};

if (typeof window !== 'undefined') {
  window.runAutomatedScrollbarTest = runAutomatedScrollbarTest;
  
  // Auto-run test after 2 seconds
  setTimeout(() => {
    console.log('%c🔄 Auto-running scrollbar test...', 'color: #00ff00; font-weight: bold;');
    runAutomatedScrollbarTest();
  }, 2000);
}