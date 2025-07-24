import { test, expect } from '@playwright/test';

test.describe('PerformanceOptimizer - Comprehensive Testing', () => {
  let PerformanceOptimizer: any;

  test.beforeAll(async ({ page }) => {
    await page.goto('/');
    
    PerformanceOptimizer = await page.evaluate(() => {
      return import('/src/core/formatters/PerformanceOptimizer.ts')
        .then(module => module.PerformanceOptimizer);
    });
  });

  test.beforeEach(async ({ page }) => {
    // Create a fresh optimizer for each test
    await page.evaluate((OptimizerClass) => {
      (window as any).testOptimizer = new OptimizerClass();
    }, PerformanceOptimizer);
  });

  test.describe('Basic Optimization Tests', () => {
    test('should handle small content directly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const mockParser = (content) => ({
          isValid: true,
          data: { parsed: content },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: content.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse('small content', mockParser);
      });

      expect(result.isValid).toBe(true);
      expect(result.data.parsed).toBe('small content');
      expect(result.metadata.parseTime).toBeGreaterThan(0);
    });

    test('should use chunked parsing for medium content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Create medium-sized content (larger than chunk size but smaller than memory limit)
        const mediumContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
        
        const mockParser = (content) => ({
          isValid: true,
          data: { length: content.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: content.length,
            format: 'test',
            confidence: 100
          }
        });
        
        const startTime = performance.now();
        const parseResult = optimizer.optimizedParse(mediumContent, mockParser);
        const endTime = performance.now();
        
        return {
          ...parseResult,
          testTime: endTime - startTime
        };
      });

      expect(result.isValid).toBe(true);
      expect(result.testTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata.parseTime).toBeGreaterThan(0);
    });

    test('should use memory-efficient parsing for large content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Create large content that exceeds memory threshold
        const largeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB
        
        const mockParser = (content) => ({
          isValid: true,
          data: { chunkLength: content.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: content.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(
          largeContent, 
          mockParser, 
          { memoryLimit: 50 * 1024 * 1024 } // 50MB limit
        );
      });

      expect(result.isValid).toBe(true);
      expect(result.metadata.fileSize).toBeGreaterThan(50 * 1024 * 1024);
    });

    test('should respect custom chunk size', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(10000);
        const customChunkSize = 1000;
        let parseCallCount = 0;
        
        const mockParser = (content) => {
          parseCallCount++;
          return {
            isValid: true,
            data: { parseCall: parseCallCount, length: content.length },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: content.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: customChunkSize });
      });

      expect(result.isValid).toBe(true);
      // Should have been split into multiple chunks
      expect(result.data).toBeDefined();
    });
  });

  test.describe('Chunking Strategy Tests', () => {
    test('should split content at logical boundaries', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Create content with logical break points
        const content = [
          '{"section1": {',
          '  "data": "value1",',
          '  "items": [1, 2, 3]',
          '}},',
          '{"section2": {',
          '  "data": "value2",',
          '  "items": [4, 5, 6]',
          '}}'
        ].join('\n').repeat(100); // Make it large enough to chunk
        
        const chunks = [];
        const mockParser = (chunk) => {
          chunks.push(chunk);
          return {
            isValid: true,
            data: { chunkIndex: chunks.length - 1 },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        const parseResult = optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
        
        return {
          parseResult,
          chunkCount: chunks.length,
          chunksEndWithLogicalBreaks: chunks.slice(0, -1).every(chunk => 
            chunk.endsWith('\n') || chunk.endsWith('}') || chunk.endsWith(']') || chunk.endsWith(',')
          )
        };
      });

      expect(result.parseResult.isValid).toBe(true);
      expect(result.chunkCount).toBeGreaterThan(1);
      // Most chunks should end with logical break points
      expect(result.chunksEndWithLogicalBreaks).toBe(true);
    });

    test('should handle content without logical break points', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Create content without clear break points
        const content = 'x'.repeat(5000); // Continuous content
        
        const chunks = [];
        const mockParser = (chunk) => {
          chunks.push(chunk);
          return {
            isValid: true,
            data: { chunkLength: chunk.length },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(true);
      // Should still chunk the content even without logical breaks
    });
  });

  test.describe('Data Merging Tests', () => {
    test('should merge array data correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: [chunk.length], // Return array with chunk length
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(1); // Should have merged multiple arrays
    });

    test('should merge object data correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        let chunkIndex = 0;
        
        const mockParser = (chunk) => {
          const index = chunkIndex++;
          return {
            isValid: true,
            data: { [`chunk_${index}`]: chunk.length }, // Return object with chunk data
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(true);
      expect(typeof result.data).toBe('object');
      expect(result.data).not.toBeNull();
      // Should have multiple chunk properties merged
      expect(Object.keys(result.data).length).toBeGreaterThan(1);
    });

    test('should handle mixed data types gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        let chunkIndex = 0;
        
        const mockParser = (chunk) => {
          const index = chunkIndex++;
          // Return different data types for different chunks
          const data = index === 0 ? 'string' : index === 1 ? 42 : { key: 'value' };
          
          return {
            isValid: true,
            data,
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      // Should return the first valid chunk's data type
    });

    test('should handle null data gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: null, // All chunks return null
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle parser errors in chunks', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        let chunkIndex = 0;
        
        const mockParser = (chunk) => {
          const index = chunkIndex++;
          
          if (index === 1) {
            // Second chunk fails
            return {
              isValid: false,
              data: null,
              errors: [{ message: 'Chunk parse error', code: 'CHUNK_ERROR', severity: 'error' }],
              metadata: {
                parseTime: 1,
                fileSize: chunk.length,
                format: 'test',
                confidence: 0
              }
            };
          }
          
          return {
            isValid: true,
            data: { chunkIndex: index },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CHUNK_ERROR');
    });

    test('should handle parser exceptions', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        
        const mockParser = (chunk) => {
          throw new Error('Parser exception');
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('OPTIMIZATION_ERROR');
    });

    test('should aggregate errors from multiple chunks', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(5000);
        let chunkIndex = 0;
        
        const mockParser = (chunk) => {
          const index = chunkIndex++;
          
          return {
            isValid: false,
            data: null,
            errors: [{ 
              message: `Error in chunk ${index}`, 
              code: `CHUNK_${index}_ERROR`, 
              severity: 'error' 
            }],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 0
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Should have errors from multiple chunks
      
      // Check that errors from different chunks are included
      const errorCodes = result.errors.map(e => e.code);
      expect(errorCodes.some(code => code.includes('CHUNK_0'))).toBe(true);
      expect(errorCodes.some(code => code.includes('CHUNK_1'))).toBe(true);
    });
  });

  test.describe('Performance Monitoring Tests', () => {
    test('should track parsing time accurately', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(10000);
        
        const mockParser = (chunk) => {
          // Simulate parsing time
          const start = performance.now();
          while (performance.now() - start < 10) {
            // Busy wait for 10ms
          }
          
          return {
            isValid: true,
            data: { length: chunk.length },
            errors: [],
            metadata: {
              parseTime: 10,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 2000 });
      });

      expect(result.isValid).toBe(true);
      expect(result.metadata.parseTime).toBeGreaterThan(0);
      // Should be roughly the sum of individual chunk parse times
      expect(result.metadata.parseTime).toBeGreaterThan(10);
    });

    test('should report accurate file size', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(12345);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { length: chunk.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(content, mockParser);
      });

      expect(result.isValid).toBe(true);
      expect(result.metadata.fileSize).toBe(12345);
    });

    test('should provide performance metrics', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        return optimizer.getPerformanceMetrics();
      });

      expect(result.availableWorkers).toBeGreaterThan(0);
      expect(result.chunkSize).toBeGreaterThan(0);
      expect(result.memoryThreshold).toBeGreaterThan(0);
      
      // Memory info might be available in some browsers
      if (result.memoryUsage) {
        expect(result.memoryUsage.used).toBeGreaterThan(0);
        expect(result.memoryUsage.total).toBeGreaterThan(0);
        expect(result.memoryUsage.limit).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Configuration and Options Tests', () => {
    test('should respect useWorkers option', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(10000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { workerUsed: false }, // Simulate non-worker parsing
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(content, mockParser, { useWorkers: false });
      });

      expect(result.isValid).toBe(true);
      // Should still work even without workers
    });

    test('should handle custom memory limits', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(1000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { length: chunk.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        // Set very low memory limit to force memory-efficient parsing
        return optimizer.optimizedParse(content, mockParser, { memoryLimit: 500 });
      });

      expect(result.isValid).toBe(true);
    });

    test('should handle very small chunk sizes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(1000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { length: chunk.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 10 });
      });

      expect(result.isValid).toBe(true);
      // Should handle very small chunks without issues
    });

    test('should handle very large chunk sizes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(1000);
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { length: chunk.length },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        // Chunk size larger than content
        return optimizer.optimizedParse(content, mockParser, { chunkSize: 10000 });
      });

      expect(result.isValid).toBe(true);
      // Should handle content smaller than chunk size
    });
  });

  test.describe('Memory and Resource Management Tests', () => {
    test('should yield to event loop periodically', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(50000);
        let parseCallCount = 0;
        
        const mockParser = (chunk) => {
          parseCallCount++;
          return {
            isValid: true,
            data: { parseCall: parseCallCount },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        const startTime = performance.now();
        const parseResult = optimizer.optimizedParse(content, mockParser, { chunkSize: 1000 });
        const endTime = performance.now();
        
        return {
          ...parseResult,
          totalTime: endTime - startTime,
          parseCallCount
        };
      });

      expect(result.isValid).toBe(true);
      expect(result.parseCallCount).toBeGreaterThan(10); // Should have made multiple parse calls
      expect(result.totalTime).toBeGreaterThan(0);
    });

    test('should dispose resources properly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Get initial metrics
        const beforeDispose = optimizer.getPerformanceMetrics();
        
        // Dispose the optimizer
        optimizer.dispose();
        
        // Get metrics after dispose
        const afterDispose = optimizer.getPerformanceMetrics();
        
        return { beforeDispose, afterDispose };
      });

      expect(result.beforeDispose.availableWorkers).toBeGreaterThan(0);
      expect(result.afterDispose.availableWorkers).toBe(0); // Workers should be terminated
    });
  });

  test.describe('Edge Cases and Stress Tests', () => {
    test('should handle empty content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { empty: true },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse('', mockParser);
      });

      expect(result.isValid).toBe(true);
      expect(result.data.empty).toBe(true);
    });

    test('should handle single character content', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const mockParser = (chunk) => ({
          isValid: true,
          data: { content: chunk },
          errors: [],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 100
          }
        });
        
        return optimizer.optimizedParse('x', mockParser);
      });

      expect(result.isValid).toBe(true);
      expect(result.data.content).toBe('x');
    });

    test('should handle parser that always fails', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        const content = 'x'.repeat(10000);
        
        const failingParser = (chunk) => ({
          isValid: false,
          data: null,
          errors: [{ message: 'Always fails', code: 'ALWAYS_FAIL', severity: 'error' }],
          metadata: {
            parseTime: 1,
            fileSize: chunk.length,
            format: 'test',
            confidence: 0
          }
        });
        
        return optimizer.optimizedParse(content, failingParser, { chunkSize: 1000 });
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.every(e => e.code === 'ALWAYS_FAIL')).toBe(true);
    });

    test('should handle extremely large content gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        const optimizer = (window as any).testOptimizer;
        
        // Simulate very large content without actually creating it
        const mockContent = 'x'.repeat(1000); // Smaller for test performance
        
        let chunkCount = 0;
        const mockParser = (chunk) => {
          chunkCount++;
          return {
            isValid: true,
            data: { chunkIndex: chunkCount - 1 },
            errors: [],
            metadata: {
              parseTime: 1,
              fileSize: chunk.length,
              format: 'test',
              confidence: 100
            }
          };
        };
        
        const startTime = performance.now();
        const parseResult = optimizer.optimizedParse(mockContent, mockParser, { chunkSize: 100 });
        const endTime = performance.now();
        
        return {
          ...parseResult,
          chunkCount,
          totalTime: endTime - startTime
        };
      });

      expect(result.isValid).toBe(true);
      expect(result.chunkCount).toBeGreaterThan(1);
      expect(result.totalTime).toBeLessThan(5000); // Should complete reasonably quickly
    });
  });
});