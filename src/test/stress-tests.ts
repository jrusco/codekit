// Stress testing and edge cases for production readiness
import { JsonParser } from '../core/formatters/JsonParser.ts';
import { FormatRegistry } from '../core/formatters/FormatRegistry.ts';
import { FormatDetector } from '../core/formatters/FormatDetector.ts';
import { PerformanceOptimizer } from '../core/formatters/PerformanceOptimizer.ts';

interface StressTestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  performance?: {
    memoryUsed?: number;
    peakMemory?: number;
    operations?: number;
  };
}

class StressTester {
  private results: StressTestResult[] = [];

  async test(name: string, testFn: () => void | Promise<void>): Promise<void> {
    console.log(`⚡ Running: ${name}`);
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = testFn();
      
      if (result instanceof Promise) {
        await result;
      }
      
      const duration = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      this.results.push({ 
        name, 
        passed: true, 
        duration,
        performance: {
          memoryUsed: endMemory.used - startMemory.used,
          peakMemory: Math.max(endMemory.used, startMemory.used),
          operations: 1
        }
      });
      console.log(`✅ ${name} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      console.log(`❌ ${name} (${duration.toFixed(2)}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMemoryUsage(): { used: number; total: number } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return { used: mem.heapUsed, total: mem.heapTotal };
    }
    return { used: 0, total: 0 };
  }

  expect(actual: any): {
    toBe: (expected: any) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeLessThan: (expected: number) => void;
    toBeTruthy: () => void;
    toHaveLength: (length: number) => void;
  } {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected: number) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toHaveLength: (length: number) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected ${actual} to have length ${length}`);
        }
      }
    };
  }

  report(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgTime = totalTime / this.results.length;

    console.log('\n🚀 Stress Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`📊 Average Time: ${avgTime.toFixed(2)}ms`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    // Performance summary
    const withPerf = this.results.filter(r => r.performance);
    if (withPerf.length > 0) {
      const totalMemory = withPerf.reduce((sum, r) => sum + (r.performance?.memoryUsed || 0), 0);
      console.log(`💾 Total Memory Used: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
    }

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.name}: ${result.error}`);
      });
    }
  }
}

// Create large test data generators
function createLargeJsonObject(size: number): string {
  const obj: any = {};
  for (let i = 0; i < size; i++) {
    obj[`key_${i}`] = {
      id: i,
      name: `Item ${i}`,
      description: `This is item number ${i} with some description text`.repeat(10),
      tags: [`tag${i}`, `category${i % 10}`, `type${i % 5}`],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: Math.floor(i / 100),
        nested: {
          level1: { level2: { level3: `deep_value_${i}` } }
        }
      }
    };
  }
  return JSON.stringify(obj);
}

function createDeeplyNestedJson(depth: number): string {
  let obj: any = { value: `depth_${depth}` };
  for (let i = depth - 1; i >= 0; i--) {
    obj = { [`level_${i}`]: obj };
  }
  return JSON.stringify(obj);
}

// Run stress tests
const tester = new StressTester();

console.log('🚀 Starting Stress Tests and Edge Cases...\n');

// Large Data Tests
await tester.test('Large JSON - 1000 objects', () => {
  const parser = new JsonParser();
  const largeJson = createLargeJsonObject(1000);
  
  const startTime = performance.now();
  const result = parser.parse(largeJson);
  const endTime = performance.now();
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(result.data).toBeTruthy();
  tester.expect(endTime - startTime).toBeLessThan(1000); // Should parse within 1 second
  
  console.log(`   📏 JSON Size: ${(largeJson.length / 1024).toFixed(2)}KB`);
  console.log(`   ⏱️  Parse Time: ${(endTime - startTime).toFixed(2)}ms`);
});

await tester.test('Very Large JSON - 5000 objects', () => {
  const parser = new JsonParser();
  const veryLargeJson = createLargeJsonObject(5000);
  
  const startTime = performance.now();
  const result = parser.parse(veryLargeJson);
  const endTime = performance.now();
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(result.data).toBeTruthy();
  tester.expect(endTime - startTime).toBeLessThan(5000); // Should parse within 5 seconds
  
  console.log(`   📏 JSON Size: ${(veryLargeJson.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   ⏱️  Parse Time: ${(endTime - startTime).toFixed(2)}ms`);
});

await tester.test('Deeply Nested JSON - 50 levels', () => {
  const parser = new JsonParser();
  const deepJson = createDeeplyNestedJson(50);
  
  const result = parser.parse(deepJson);
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(result.data).toBeTruthy();
  
  // Navigate to the deepest level to verify structure
  let current = result.data;
  for (let i = 0; i < 50; i++) {
    current = current[`level_${i}`];
    tester.expect(current).toBeTruthy();
  }
  tester.expect(current.value).toBe('depth_50');
});

// Performance Optimizer Stress Tests
await tester.test('Performance Optimizer - Large Content Chunking', async () => {
  const optimizer = new PerformanceOptimizer();
  const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB of content
  
  let chunkCount = 0;
  const mockParser = (chunk: string) => {
    chunkCount++;
    return {
      isValid: true,
      data: { chunkIndex: chunkCount - 1, length: chunk.length },
      errors: [],
      metadata: { parseTime: 1, fileSize: chunk.length, format: 'test', confidence: 100 }
    };
  };
  
  const startTime = performance.now();
  const result = await optimizer.optimizedParse(largeContent, mockParser, { chunkSize: 1024 * 1024 });
  const endTime = performance.now();
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(chunkCount).toBeGreaterThan(5); // Should have created multiple chunks
  tester.expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
  
  console.log(`   🔄 Chunks Created: ${chunkCount}`);
  console.log(`   ⏱️  Processing Time: ${(endTime - startTime).toFixed(2)}ms`);
});

// Format Detection Stress Tests
await tester.test('Format Detection - Cache Performance', () => {
  const detector = new FormatDetector();
  detector.clearCache();
  
  // Test cache performance with many detections
  const testContents = [];
  for (let i = 0; i < 100; i++) {
    testContents.push(`{"test_${i}": "value_${i}"}`);
  }
  
  const startTime = performance.now();
  
  // First pass - populate cache
  testContents.forEach(content => {
    detector.detect(content);
  });
  
  const cachePopulateTime = performance.now();
  
  // Second pass - use cache
  testContents.forEach(content => {
    detector.detect(content);
  });
  
  const cacheUseTime = performance.now();
  
  const populateTime = cachePopulateTime - startTime;
  const useTime = cacheUseTime - cachePopulateTime;
  
  tester.expect(useTime).toBeLessThan(populateTime); // Cache should be faster
  tester.expect(detector.getCacheStats().size).toBe(100);
  
  console.log(`   📊 Cache Populate: ${populateTime.toFixed(2)}ms`);
  console.log(`   🚀 Cache Use: ${useTime.toFixed(2)}ms`);
  console.log(`   📈 Cache Speedup: ${(populateTime / useTime).toFixed(2)}x`);
});

// Registry Stress Tests
await tester.test('Format Registry - Multiple Parser Performance', () => {
  const registry = new FormatRegistry();
  
  // Register multiple parsers
  for (let i = 0; i < 50; i++) {
    const mockParser = {
      name: `TestParser${i}`,
      extensions: [`ext${i}`],
      mimeTypes: [`application/test${i}`],
      detect: (content: string) => ({
        format: `format${i}`,
        confidence: content.includes(`test${i}`) ? 80 : 10,
        evidence: [`Test parser ${i}`]
      }),
      parse: () => ({ isValid: true, data: {}, errors: [], metadata: {} }),
      validate: () => []
    };
    registry.register(mockParser);
  }
  
  // Add JSON parser
  const jsonParser = new JsonParser();
  registry.register(jsonParser);
  
  const stats = registry.getStats();
  tester.expect(stats.registeredParsers).toBe(51);
  
  // Test detection performance with many parsers
  const startTime = performance.now();
  const detection = registry.detectFormat('{"json": "content"}');
  const endTime = performance.now();
  
  tester.expect(detection.format).toBe('json');
  tester.expect(endTime - startTime).toBeLessThan(100); // Should be fast even with many parsers
  
  console.log(`   🏗️  Parsers Registered: ${stats.registeredParsers}`);
  console.log(`   ⏱️  Detection Time: ${(endTime - startTime).toFixed(2)}ms`);
});

// Error Handling Stress Tests
await tester.test('Error Handling - Malformed JSON Variations', () => {
  const parser = new JsonParser();
  
  const malformedInputs = [
    '{"unterminated": "string',
    '{"missing": }',
    '{unquoted: "key"}',
    '{"trailing": "comma",}',
    '{"number": 123abc}',
    '{"unicode": "\\uGGGG"}',
    '{"nested": {"unclosed": {}}',
    '[{"array": "unclosed"]',
    '{"control": "\x00\x01\x02"}',
    '{"huge_number": ' + '9'.repeat(1000) + '}'
  ];
  
  let errorCount = 0;
  let totalErrorTime = 0;
  
  malformedInputs.forEach((input, index) => {
    const startTime = performance.now();
    const result = parser.parse(input);
    const endTime = performance.now();
    
    console.log(`     Test ${index + 1}: "${input.substring(0, 30)}..." -> Valid: ${result.isValid}, Errors: ${result.errors.length}`);
    
    if (!result.isValid && result.errors.length > 0) {
      errorCount++;
      totalErrorTime += (endTime - startTime);
      
      // Verify error has proper location info where possible
      if (result.errors[0].line && result.errors[0].column) {
        tester.expect(result.errors[0].line).toBeGreaterThan(0);
        tester.expect(result.errors[0].column).toBeGreaterThan(0);
      }
    }
  });
  
  tester.expect(errorCount).toBe(malformedInputs.length); // All should produce errors
  tester.expect(totalErrorTime).toBeLessThan(1000); // Error handling should be fast
  
  console.log(`   ❌ Malformed Inputs Tested: ${malformedInputs.length}`);
  console.log(`   ⏱️  Total Error Time: ${totalErrorTime.toFixed(2)}ms`);
  console.log(`   📊 Avg Error Time: ${(totalErrorTime / malformedInputs.length).toFixed(2)}ms`);
});

// Memory Leak Tests
await tester.test('Memory Management - Repeated Operations', () => {
  const parser = new JsonParser();
  const registry = new FormatRegistry();
  const detector = new FormatDetector();
  
  registry.register(parser);
  
  const startMemory = tester.getMemoryUsage();
  
  // Perform many operations to test for memory leaks
  for (let i = 0; i < 1000; i++) {
    const testData = `{"iteration": ${i}, "data": "test_${i}"}`;
    
    detector.detect(testData);
    registry.parse(testData);
    parser.validate(testData);
    
    // Clear cache periodically to simulate real usage
    if (i % 100 === 0) {
      detector.clearCache();
    }
  }
  
  const endMemory = tester.getMemoryUsage();
  const memoryIncrease = endMemory.used - startMemory.used;
  
  // Memory increase should be reasonable (less than 50MB for 1000 operations)
  tester.expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  
  console.log(`   💾 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   🔄 Operations: 1000`);
  console.log(`   📊 Memory per Op: ${(memoryIncrease / 1000 / 1024).toFixed(2)}KB`);
});

// Edge Cases
await tester.test('Edge Cases - Special Characters and Unicode', () => {
  const parser = new JsonParser();
  
  const unicodeTests = [
    '{"emoji": "🚀🎉✨", "chinese": "你好世界", "arabic": "مرحبا بالعالم"}',
    '{"unicode_escape": "\\u0048\\u0065\\u006C\\u006C\\u006F"}',
    '{"control_chars": "\\n\\r\\t\\b\\f"}',
    '{"quotes": "\\"Hello\\" said the \\"World\\""}',
    '{"mixed": "English中文العربية🌍"}',
    '{"empty_strings": "", "null_value": null, "boolean": true}'
  ];
  
  let successCount = 0;
  
  unicodeTests.forEach(test => {
    const result = parser.parse(test);
    if (result.isValid) {
      successCount++;
    }
  });
  
  tester.expect(successCount).toBe(unicodeTests.length);
  
  console.log(`   🌍 Unicode Tests Passed: ${successCount}/${unicodeTests.length}`);
});

await tester.test('Edge Cases - Boundary Values', () => {
  const parser = new JsonParser();
  
  const boundaryTests = [
    '{}', // Empty object
    '[]', // Empty array
    '"simple string"', // Simple string
    '42', // Number
    'true', // Boolean
    'null', // Null
    '""', // Empty string
    `{"very_long_key_${'x'.repeat(1000)}": "value"}`, // Long key
    `{"key": "${'x'.repeat(10000)}"}`, // Long value
    JSON.stringify(Array(1000).fill(0).map((_, i) => i)) // Large array
  ];
  
  let successCount = 0;
  
  boundaryTests.forEach((test, index) => {
    const result = parser.parse(test);
    console.log(`     Test ${index + 1}: "${test.substring(0, 30)}..." -> Valid: ${result.isValid}`);
    if (result.isValid) {
      successCount++;
    }
  });
  
  tester.expect(successCount).toBe(boundaryTests.length);
  
  console.log(`   🎯 Boundary Tests Passed: ${successCount}/${boundaryTests.length}`);
});

// Generate final report
tester.report();