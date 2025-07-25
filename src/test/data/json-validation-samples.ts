// Test data samples for JSON validation testing
// Used by Playwright tests to verify comprehensive validation functionality

export const JSON_VALIDATION_SAMPLES = {
  // Valid JSON samples for baseline testing
  valid: {
    simple: '{"name": "test", "age": 30}',
    array: '[1, 2, 3, "four", true, null]',
    nested: `{
      "user": {
        "profile": {
          "name": "John Doe",
          "settings": {
            "theme": "dark",
            "notifications": true
          }
        }
      },
      "data": [1, 2, 3]
    }`,
    special_values: `{
      "nullValue": null,
      "boolTrue": true,
      "boolFalse": false,
      "emptyString": "",
      "emptyArray": [],
      "emptyObject": {},
      "number": 42,
      "float": 3.14,
      "scientific": 1.23e-4
    }`,
    unicode: `{
      "emoji": "🚀🌟✨",
      "chinese": "你好世界",
      "arabic": "مرحبا بالعالم",
      "escaped": "\\u0048\\u0065\\u006C\\u006C\\u006F"
    }`
  },

  // Syntax error samples for basic validation testing
  syntaxErrors: {
    empty: '',
    whitespace: '   \\n  \\t  ',
    invalid_structure: 'not json at all',
    missing_comma: '{"name": "test" "age": 30}',
    trailing_comma: '{"name": "test", "age": 30,}',
    unterminated_string: '{"name": "unterminated string, "age": 30}',
    unmatched_brackets: {
      missing_closing_brace: '{"name": "test"',
      missing_closing_bracket: '["item1", "item2"',
      extra_closing_brace: '{"name": "test"}}',
      mismatched_close: '{"data": [1, 2, 3}',
      bracket_mismatch: '{"name": ["test"}'
    },
    unquoted_keys: '{name: "test", age: 30}',
    single_quotes: "{'name': 'test'}",
    undefined_value: '{"name": undefined}',
    extra_content: '{"valid": true}"extra"'
  },

  // Performance testing samples
  performance: {
    // Generated large object (will be created dynamically)
    large_object_generator: (size: number) => {
      const obj: Record<string, any> = {};
      for (let i = 0; i < size; i++) {
        obj[`property_${i}`] = {
          id: i,
          name: `Item ${i}`,
          description: `This is a description for item number ${i}`,
          data: Array.from({length: 10}, (_, j) => `data_${i}_${j}`),
          nested: {
            level1: {
              level2: {
                level3: `deep_value_${i}`
              }
            }
          }
        };
      }
      return JSON.stringify(obj, null, 2);
    },

    // Deep nesting generator
    deep_nesting_generator: (depth: number) => {
      let obj: any = { value: "deepest_level" };
      for (let i = 0; i < depth; i++) {
        obj = { level: i, nested: obj };
      }
      return JSON.stringify(obj, null, 2);
    },

    // Large array generator
    large_array_generator: (size: number) => {
      const arr = Array.from({length: size}, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        active: i % 2 === 0,
        metadata: {
          created: new Date(2024, 0, 1 + i).toISOString(),
          tags: [`tag_${i}`, `category_${Math.floor(i / 100)}`]
        }
      }));
      return JSON.stringify(arr, null, 2);
    },

    // High line count JSON
    high_line_count: Array.from({length: 1000}, (_, i) => 
      `  "line_${i}": "This is line number ${i} with some content"`
    ).join(',\\n'),

    // Large string content
    large_string_content: `{
      "normalField": "normal value",
      "largeString": "${Array(15000).fill('x').join('')}",
      "anotherField": "normal value"
    }`
  },

  // Security testing samples
  security: {
    // Deep nesting (DoS attack simulation)
    excessive_nesting_25: (() => {
      let nested = '{"deepest": "value"}';
      for (let i = 0; i < 25; i++) {
        nested = `{"level_${i}": ${nested}}`;
      }
      return nested;
    })(),

    excessive_nesting_50: (() => {
      let nested = '{"deepest": "value"}';
      for (let i = 0; i < 50; i++) {
        nested = `{"level_${i}": ${nested}}`;
      }
      return nested;
    })(),

    excessive_nesting_100: (() => {
      let nested = '{"deepest": "value"}';
      for (let i = 0; i < 100; i++) {
        nested = `{"level_${i}": ${nested}}`;
      }
      return nested;
    })(),

    // Prototype pollution patterns
    prototype_pollution: `{
      "__proto__": {
        "isAdmin": true,
        "polluted": "value"
      },
      "normalField": "normal value"
    }`,

    constructor_pollution: `{
      "constructor": {
        "prototype": {
          "hack": "injected"
        }
      },
      "data": "normal"
    }`,

    combined_dangerous_props: `{
      "__proto__": {"admin": true},
      "constructor": {"hack": true},
      "prototype": {"polluted": true},
      "toString": "overridden",
      "valueOf": "compromised"
    }`,

    // Long string attack simulation
    long_string_attack: `{
      "attack": "${Array(12000).fill('A').join('')}",
      "normal": "field"
    }`,

    // Memory exhaustion patterns
    memory_exhaustion: `{
      "hugeProp1": "${Array(5000).fill('memory_test').join('')}",
      "hugeProp2": "${Array(5000).fill('exhaustion_test').join('')}",
      "hugeProp3": "${Array(5000).fill('attack_simulation').join('')}"
    }`
  },

  // Best practices testing samples
  bestPractices: {
    // Property naming violations
    naming_violations: `{
      "user_name": "snake_case_violation",
      "UserAge": "PascalCase_violation", 
      "user-email": "kebab-case-violation",
      "123invalid": "starts_with_number",
      "validCamelCase": "this_is_correct",
      "_id": "mongo_exception_allowed",
      "__v": "version_exception_allowed"
    }`,

    // Reserved word violations
    reserved_words: `{
      "constructor": "reserved_word",
      "prototype": "also_reserved",
      "__proto__": "dangerous_reserved",
      "toString": "method_name_reserved",
      "valueOf": "another_method_reserved",
      "hasOwnProperty": "inherited_method",
      "normalField": "this_is_fine"
    }`,

    // Large structure violations
    large_object: (() => {
      const obj: Record<string, any> = {};
      // Create object with 1500 properties (exceeds default limit of 1000 in strict mode)
      for (let i = 0; i < 1500; i++) {
        obj[`property${i}`] = `value_${i}`;
      }
      return JSON.stringify(obj);
    })(),

    large_array: JSON.stringify(Array.from({length: 15000}, (_, i) => `item_${i}`)),

    // Long property names
    long_property_names: `{
      "thisIsAnExtremelyLongPropertyNameThatExceedsTheRecommendedLengthLimitAndShouldTriggerAWarning": "violation",
      "anotherSuperLongPropertyNameThatIsWayTooVerboseAndShouldBeRefactoredToSomethingShorter": "another_violation",
      "normalLength": "this_is_fine"
    }`,

    // Unsafe numbers
    unsafe_numbers: `{
      "safeInteger": 42,
      "maxSafeInteger": 9007199254740991,
      "unsafePositive": 9007199254740992,
      "unsafeNegative": -9007199254740992,
      "extremelyLarge": 1e+308,
      "normalFloat": 3.14159
    }`,

    // Duplicate keys (will be detected by content analysis)
    duplicate_keys: `{
      "name": "first_occurrence",
      "age": 30,
      "email": "user@example.com",
      "name": "duplicate_occurrence",
      "status": "active",
      "name": "third_occurrence"
    }`,

    // Complex mixed violations
    mixed_violations: `{
      "user_name": "snake_case_violation",
      "constructor": "reserved_word_violation",
      "thisIsAnExtremelyLongPropertyNameThatExceedsRecommendedLimits": "long_name_violation",
      "__proto__": "dangerous_property",
      "unsafeNumber": 9007199254740992,
      "duplicate": "first",
      "duplicate": "second",
      "largeArray": [${Array.from({length: 12000}, (_, i) => `"item_${i}"`).join(',')}],
      "deepNesting": {
        "level1": {"level2": {"level3": {"level4": {"level5": "deep"}}}}
      }
    }`
  },

  // Edge cases and special scenarios
  edgeCases: {
    // Minimal valid JSON
    minimal_object: '{}',
    minimal_array: '[]',
    minimal_string: '""',
    minimal_number: '0',
    minimal_boolean: 'true',
    minimal_null: 'null',

    // Whitespace variations
    leading_whitespace: '   {"test": "value"}',
    trailing_whitespace: '{"test": "value"}   ',
    internal_whitespace: '{  "test"  :  "value"  }',
    mixed_whitespace: '\\t\\n  {\\n  "test": "value"\\n}  \\t',

    // Unicode edge cases
    unicode_keys: `{
      "🔑": "emoji_key",
      "中文键": "chinese_key",
      "مفتاح": "arabic_key",
      "\\u006B\\u0065\\u0079": "escaped_unicode_key"
    }`,

    // Extremely nested but valid
    valid_deep_nesting: (() => {
      let nested = '{"value": "deep"}';
      for (let i = 0; i < 15; i++) { // Within limits
        nested = `{"level${i}": ${nested}}`;
      }
      return nested;
    })(),

    // Large but valid structures
    large_valid_object: (() => {
      const obj: Record<string, any> = {};
      for (let i = 0; i < 800; i++) { // Within strict mode limits
        obj[`prop${i}`] = `value_${i}`;
      }
      return JSON.stringify(obj);
    })(),

    // Complex valid JSON with all features
    comprehensive_valid: `{
      "metadata": {
        "version": "1.0.0",
        "created": "2024-01-01T00:00:00.000Z",
        "author": "Test Suite"
      },
      "data": {
        "users": [
          {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",    
            "profile": {
              "preferences": {
                "theme": "dark",
                "language": "en",
                "notifications": {
                  "email": true,
                  "push": false,
                  "sms": null
                }
              }
            },
            "tags": ["admin", "active", "premium"]
          }
        ],
        "statistics": {
          "totalUsers": 1,
          "activeUsers": 1,
          "lastLogin": "2024-01-01T12:00:00.000Z"
        }
      },
      "config": {
        "debug": false,
        "maxRetries": 3,
        "timeout": 30000,
        "endpoints": {
          "api": "https://api.example.com",
          "auth": "https://auth.example.com"
        }
      }
    }`
  }
};

// Validation profile configurations for testing
export const VALIDATION_PROFILES = {
  strict: {
    enableSchemaValidation: true,
    enableBestPractices: true,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 10,
    maxPropertyNameLength: 50,
    maxArrayLength: 10000,
    maxObjectProperties: 1000,
    warnOnLargeNumbers: true,
    strictPropertyNaming: true
  },
  lenient: {
    enableSchemaValidation: false,
    enableBestPractices: false,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 50,
    maxPropertyNameLength: 100,
    maxArrayLength: 100000,
    maxObjectProperties: 10000,
    warnOnLargeNumbers: false,
    strictPropertyNaming: false
  },
  custom: {
    enableSchemaValidation: true,
    enableBestPractices: true,
    enablePerformanceLinting: true,
    enableSecurityLinting: true,
    maxNestingDepth: 20,
    maxPropertyNameLength: 75,
    maxArrayLength: 50000,
    maxObjectProperties: 5000,
    warnOnLargeNumbers: true,
    strictPropertyNaming: false
  }
};

// Expected validation results for automated testing
export const EXPECTED_RESULTS = {
  performance: {
    large_file_1mb: {
      expectedWarnings: ['MEDIUM_FILE'],
      expectedInfos: [],
      shouldHavePerformanceData: true
    },
    large_file_5mb: {
      expectedWarnings: ['LARGE_FILE'],
      expectedInfos: [],
      shouldHavePerformanceData: true
    },
    high_line_count: {
      expectedWarnings: ['HIGH_LINE_COUNT'],
      shouldHaveLineCountWarning: true
    }
  },
  security: {
    excessive_nesting_25: {
      expectedWarnings: ['EXCESSIVE_NESTING'],
      expectedErrors: [],
      strictMode: 'error'
    },
    excessive_nesting_100: {
      expectedErrors: ['EXCESSIVE_NESTING'],
      severityLevel: 'error'
    },
    prototype_pollution: {
      expectedWarnings: ['DANGEROUS_PROPERTIES'],
      securityRisk: true
    },
    long_string_attack: {
      expectedWarnings: ['LONG_STRINGS'],
      memoryRisk: true
    }
  },
  bestPractices: {
    naming_violations: {
      expectedInfos: ['NAMING_CONVENTION'],
      onlyInStrictMode: true
    },
    reserved_words: {
      expectedWarnings: ['RESERVED_WORD'],
      allModes: true
    },
    large_structures: {
      expectedWarnings: ['LARGE_OBJECT', 'LARGE_ARRAY'],
      dependsOnLimits: true
    },
    duplicate_keys: {
      expectedWarnings: ['DUPLICATE_KEY'],
      shouldShowLineNumbers: true
    },
    unsafe_numbers: {
      expectedWarnings: ['UNSAFE_NUMBER'],
      onlyWhenEnabled: true
    }
  }
};