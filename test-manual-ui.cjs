// Manual UI Testing Script
// This script will systematically test the UI functionality

const fs = require('fs');
const path = require('path');

// Test data
const testData = {
  json: fs.readFileSync(path.join(__dirname, 'test-data', 'sample.json'), 'utf8'),
  csv: fs.readFileSync(path.join(__dirname, 'test-data', 'sample.csv'), 'utf8'),
  xml: fs.readFileSync(path.join(__dirname, 'test-data', 'sample.xml'), 'utf8')
};

console.log('📋 Manual UI Testing Checklist');
console.log('===============================');
console.log();
console.log('🌐 Open http://localhost:5174 in your browser');
console.log();
console.log('✅ UI Layout Tests:');
console.log('  - [ ] Application loads without errors');
console.log('  - [ ] Split panel layout is visible');
console.log('  - [ ] Left panel has input textarea');  
console.log('  - [ ] Right panel shows "Ready to parse" message');
console.log('  - [ ] Status bar is visible at bottom');
console.log('  - [ ] Header shows "CodeKit" title');
console.log();

console.log('✅ JSON Format Tests:');
console.log('  - [ ] Paste the following JSON and verify it parses:');
console.log('```json');
console.log(testData.json);
console.log('```');
console.log('  - [ ] Format badge shows "JSON"');
console.log('  - [ ] Interactive view shows tree structure');
console.log('  - [ ] Text view shows formatted JSON');
console.log('  - [ ] Status bar shows correct metrics');
console.log();

console.log('✅ CSV Format Tests:');
console.log('  - [ ] Clear input and paste the following CSV:');
console.log('```csv');
console.log(testData.csv);
console.log('```');
console.log('  - [ ] Format badge shows "CSV"');
console.log('  - [ ] Interactive view shows table with headers');
console.log('  - [ ] Data types are correctly inferred (numbers as numbers, booleans as booleans)');
console.log('  - [ ] Text view shows raw data structure');
console.log();

console.log('✅ XML Format Tests:');
console.log('  - [ ] Clear input and paste the following XML:');
console.log('```xml');
console.log(testData.xml);
console.log('```');
console.log('  - [ ] Format badge shows "XML"');
console.log('  - [ ] Interactive view shows tree structure with namespaces');
console.log('  - [ ] Attributes are properly displayed');
console.log('  - [ ] Text view shows raw data structure');
console.log();

console.log('✅ UI Interaction Tests:');
console.log('  - [ ] Toggle between Text and Interactive modes');
console.log('  - [ ] Clear button clears input and output');
console.log('  - [ ] Parse button triggers parsing');
console.log('  - [ ] Real-time parsing works during typing');
console.log('  - [ ] Split panel can be resized by dragging');
console.log();

console.log('✅ Error Handling Tests:');
console.log('  - [ ] Test malformed JSON: {"invalid": json}');
console.log('  - [ ] Test malformed CSV: "incomplete,csv');
console.log('  - [ ] Test malformed XML: <unclosed>tag');
console.log('  - [ ] Verify error messages are displayed clearly');
console.log('  - [ ] Status bar shows error count');
console.log();

console.log('✅ Performance Tests:');
console.log('  - [ ] Paste large JSON data (> 1MB)');
console.log('  - [ ] Verify parsing completes within reasonable time');
console.log('  - [ ] UI remains responsive during parsing');
console.log('  - [ ] Status bar shows parse time');
console.log();

console.log('✅ Edge Cases:');
console.log('  - [ ] Test empty input');
console.log('  - [ ] Test whitespace-only input');
console.log('  - [ ] Test mixed format content');
console.log('  - [ ] Test Unicode content');
console.log();

console.log('🔧 If any issues are found:');
console.log('  1. Note the specific issue');
console.log('  2. Check browser console for errors');
console.log('  3. Try refreshing the page');
console.log('  4. Test in different browsers if possible');
console.log();

// Generate large test data for performance testing
const largeJsonData = {
  "metadata": { "version": "1.0", "timestamp": new Date().toISOString() },
  "data": []
};

for (let i = 0; i < 1000; i++) {
  largeJsonData.data.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    profile: {
      age: 20 + (i % 50),
      department: ['Engineering', 'Marketing', 'Sales', 'HR'][i % 4],
      skills: ['JavaScript', 'Python', 'Java', 'C++'].slice(0, (i % 4) + 1),
      metadata: {
        created: new Date(2023, i % 12, (i % 28) + 1).toISOString(),
        active: i % 3 === 0,
        score: Math.random() * 100
      }
    }
  });
}

console.log('📊 Large Performance Test Data (copy and paste this):');
console.log('```json');
console.log(JSON.stringify(largeJsonData, null, 2).substring(0, 500) + '...[truncated]');
console.log('```');
console.log('Full large data available at: test-data/large-sample.json');

// Write large test data to file
fs.writeFileSync(
  path.join(__dirname, 'test-data', 'large-sample.json'), 
  JSON.stringify(largeJsonData, null, 2)
);

console.log('\n✨ Testing completed! Report any issues found.');