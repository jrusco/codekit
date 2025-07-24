// Manual validation script to test core functionality
// This runs in Node.js to validate the implementation

import { JsonParser } from '../core/formatters/JsonParser.ts';
import { FormatRegistry } from '../core/formatters/FormatRegistry.ts';
import { FormatDetector } from '../core/formatters/FormatDetector.ts';
import { PerformanceOptimizer } from '../core/formatters/PerformanceOptimizer.ts';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class ManualTester {
  private results: TestResult[] = [];

  test(name: string, testFn: () => void | Promise<void>): void {
    const startTime = performance.now();
    
    try {
      const result = testFn();
      
      if (result instanceof Promise) {
        result.then(() => {
          const duration = performance.now() - startTime;
          this.results.push({ name, passed: true, duration });
          console.log(`✅ ${name} (${duration.toFixed(2)}ms)`);
        }).catch((error) => {
          const duration = performance.now() - startTime;
          this.results.push({ name, passed: false, error: error.message, duration });
          console.log(`❌ ${name} (${duration.toFixed(2)}ms): ${error.message}`);
        });
      } else {
        const duration = performance.now() - startTime;
        this.results.push({ name, passed: true, duration });
        console.log(`✅ ${name} (${duration.toFixed(2)}ms)`);
      }
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

  expect(actual: any): {
    toBe: (expected: any) => void;
    toEqual: (expected: any) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toHaveLength: (length: number) => void;
    toContain: (item: any) => void;
  } {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toHaveLength: (length: number) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected ${actual} to have length ${length}`);
        }
      },
      toContain: (item: any) => {
        if (!actual || !actual.includes || !actual.includes(item)) {
          throw new Error(`Expected ${actual} to contain ${item}`);
        }
      }
    };
  }

  report(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.name}: ${result.error}`);
      });
    }
  }
}

// Run validation tests
const tester = new ManualTester();

console.log('🔍 Starting Core Functionality Validation...\n');

// JsonParser Tests
tester.test('JsonParser - Parse valid JSON', () => {
  const parser = new JsonParser();
  const result = parser.parse('{"name": "test", "value": 42}');
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(result.data).toEqual({ name: 'test', value: 42 });
  tester.expect(result.errors).toHaveLength(0);
});

tester.test('JsonParser - Handle invalid JSON', () => {
  const parser = new JsonParser();
  const result = parser.parse('{"invalid": json}');
  
  tester.expect(result.isValid).toBe(false);
  tester.expect(result.errors.length).toBeGreaterThan(0);
  tester.expect(result.errors[0].code).toBe('SYNTAX_ERROR');
});

tester.test('JsonParser - Detect JSON format', () => {
  const parser = new JsonParser();
  const result = parser.detect('{"test": "value"}');
  
  tester.expect(result.format).toBe('json');
  tester.expect(result.confidence).toBeGreaterThan(50);
});

tester.test('JsonParser - Validate JSON structure', () => {
  const parser = new JsonParser();
  const validResult = parser.validate('{"valid": true}');
  const invalidResult = parser.validate('{"unclosed": "string'); // Unclosed string and bracket
  
  tester.expect(validResult).toHaveLength(0);
  tester.expect(invalidResult.length).toBeGreaterThan(0);
});

// FormatRegistry Tests
tester.test('FormatRegistry - Register parser', () => {
  const registry = new FormatRegistry();
  const parser = new JsonParser();
  
  registry.register(parser);
  const stats = registry.getStats();
  
  tester.expect(stats.registeredParsers).toBe(1);
  tester.expect(stats.formats).toContain('json');
});

tester.test('FormatRegistry - Find parser by extension', () => {
  const registry = new FormatRegistry();
  const parser = new JsonParser();
  
  registry.register(parser);
  const foundParser = registry.getParserByExtension('json');
  
  tester.expect(foundParser).toBeTruthy();
  tester.expect(foundParser!.name).toBe('JSON');
});

tester.test('FormatRegistry - Detect and parse', () => {
  const registry = new FormatRegistry();
  const parser = new JsonParser();
  
  registry.register(parser);
  const detection = registry.detectFormat('{"test": "value"}');
  const parseResult = registry.parse('{"test": "value"}');
  
  tester.expect(detection.format).toBe('json');
  tester.expect(parseResult.isValid).toBe(true);
});

// FormatDetector Tests
tester.test('FormatDetector - Multi-stage detection', () => {
  const detector = new FormatDetector();
  const result = detector.detect('{"content": "test"}', {
    filename: 'test.json',
    mimeType: 'application/json'
  });
  
  tester.expect(result.format).toBe('json');
  tester.expect(result.confidence).toBeGreaterThan(80);
});

tester.test('FormatDetector - Signature detection', () => {
  const detector = new FormatDetector();
  const jsonResult = detector.detectBySignature('{"key": "value"}');
  const xmlResult = detector.detectBySignature('<root></root>');
  
  tester.expect(jsonResult.format).toBe('json');
  tester.expect(xmlResult.format).toBe('xml');
});

tester.test('FormatDetector - Caching', () => {
  const detector = new FormatDetector();
  
  detector.clearCache();
  const initialStats = detector.getCacheStats();
  
  detector.detect('{"cached": "content"}');
  const afterStats = detector.getCacheStats();
  
  tester.expect(initialStats.size).toBe(0);
  tester.expect(afterStats.size).toBeGreaterThan(0);
});

// PerformanceOptimizer Tests
tester.test('PerformanceOptimizer - Handle small content', async () => {
  const optimizer = new PerformanceOptimizer();
  
  const mockParser = (content: string) => ({
    isValid: true,
    data: { content },
    errors: [],
    metadata: { parseTime: 1, fileSize: content.length, format: 'test', confidence: 100 }
  });
  
  const result = await optimizer.optimizedParse('small content', mockParser);
  
  tester.expect(result.isValid).toBe(true);
  tester.expect(result.data.content).toBe('small content');
});

tester.test('PerformanceOptimizer - Performance metrics', () => {
  const optimizer = new PerformanceOptimizer();
  const metrics = optimizer.getPerformanceMetrics();
  
  tester.expect(metrics.availableWorkers).toBeGreaterThan(0);
  tester.expect(metrics.chunkSize).toBeGreaterThan(0);
  tester.expect(metrics.memoryThreshold).toBeGreaterThan(0);
});

// Integration Tests
tester.test('Integration - Full parsing pipeline', () => {
  const registry = new FormatRegistry();
  const detector = new FormatDetector();
  const parser = new JsonParser();
  
  registry.register(parser);
  
  const testData = '{"users": [{"id": 1, "name": "John"}], "total": 1}';
  
  const detection = detector.detect(testData);
  const parseResult = registry.parse(testData);
  
  tester.expect(detection.format).toBe('json');
  tester.expect(parseResult.isValid).toBe(true);
  tester.expect(parseResult.data.users).toHaveLength(1);
  tester.expect(parseResult.data.users[0].name).toBe('John');
});

// Wait a bit for async tests to complete
setTimeout(() => {
  tester.report();
}, 1000);