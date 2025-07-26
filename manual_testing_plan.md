
# JSON Error Linting and Validation - Manual Testing Plan

## Phase 2, Task 2: JSON Error Linting and Format Validation

### Implementation Summary
Enhanced JsonParser with comprehensive linting capabilities:
- **Configuration System**: Validation profiles (strict/lenient/custom) with configurable rules
- **Performance Linting**: File size warnings, line count analysis, validation timing
- **Security Linting**: Deep nesting detection, prototype pollution, long string attacks
- **Best Practices**: Property naming conventions, structure validation, duplicate key detection
- **Advanced Error Reporting**: Line/column positioning, severity levels, actionable messages

### Test Data Sets

#### 1. Valid JSON Samples
```json
// basic_valid.json
{"name": "John", "age": 30, "active": true}

// nested_valid.json  
{
  "user": {
    "profile": {
      "name": "Jane",
      "settings": {"theme": "dark"}
    }
  }
}

// array_valid.json
[{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]
```

#### 2. Syntax Error Samples
```json
// missing_comma.json
{"name": "test" "age": 30}

// unterminated_string.json
{"name": "unterminated string, "age": 30}

// unmatched_brackets.json
{"data": [1, 2, 3}

// trailing_comma.json
{"name": "test", "age": 30,}
```

#### 3. Security Test Samples
```json
// deep_nesting.json (25+ levels deep)
{"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":{"i":{"j":{"k":{"l":{"m":{"n":{"o":{"p":{"q":{"r":{"s":{"t":{"u":{"v":{"w":{"x":{"y":"deep"}}}}}}}}}}}}}}}}}}}}}}}}

// prototype_pollution.json
{"__proto__": {"isAdmin": true}, "constructor": {"prototype": {"hack": true}}}

// large_strings.json
{"data": "extremely_long_string_content_here..."}
```

#### 4. Performance Test Samples
```json
// large_file_1mb.json (generated ~1MB file)
// large_file_5mb.json (generated ~5MB file) 
// high_line_count.json (50,000+ lines)
```

#### 5. Best Practices Test Samples
```json
// naming_violations.json
{"user_name": "snake_case", "UserAge": "PascalCase", "123invalid": "starts with number"}

// large_structures.json
{"users": [/* 15,000 user objects */], "properties": {/* 2,000 properties */}}

// duplicate_keys.json
{"name": "first", "age": 30, "name": "duplicate"}
```

### Manual Testing Categories

#### Test Category 1: Basic JSON Validation
**Objective**: Verify core JSON syntax validation works correctly

**Test Cases**:
1. **Empty Content**
   - Input: `""`
   - Expected: Error with code `EMPTY_CONTENT`
   - Verify: Message is user-friendly

2. **Valid JSON Objects**
   - Input: `{"name": "test", "age": 30}`
   - Expected: No errors, successful parsing
   - Verify: Data integrity preserved

3. **Valid JSON Arrays**
   - Input: `[1, 2, "three", {"four": 4}]`
   - Expected: No errors, correct array structure
   - Verify: Mixed data types handled

4. **Syntax Errors**
   - Input: `{"name": "test" "age": 30}`
   - Expected: Error with line/column positioning
   - Verify: Error message suggests missing comma

5. **Bracket Matching**
   - Input: `{"data": [1, 2, 3}`
   - Expected: `MISMATCHED_BRACKETS` error
   - Verify: Points to exact location

#### Test Category 2: Advanced Linting Rules
**Objective**: Test comprehensive linting capabilities

**Performance Linting Tests**:
1. **File Size Warnings**
   - Input: 1MB+ JSON file
   - Expected: `MEDIUM_FILE` info message
   - Verify: File size calculated correctly

2. **Large File Detection**
   - Input: 5MB+ JSON file  
   - Expected: `LARGE_FILE` warning
   - Verify: Performance impact noted

3. **High Line Count**
   - Input: 50,000+ line JSON
   - Expected: `HIGH_LINE_COUNT` warning
   - Verify: Suggests compression

**Security Linting Tests**:
1. **Deep Nesting Detection**
   - Input: 25+ nested levels
   - Expected: `EXCESSIVE_NESTING` warning/error
   - Verify: Exact depth reported

2. **Prototype Pollution**
   - Input: `{"__proto__": {...}}`
   - Expected: `DANGEROUS_PROPERTIES` warning
   - Verify: Security risk explained

3. **Long String Attack**
   - Input: 10,000+ character strings
   - Expected: `LONG_STRINGS` warning
   - Verify: Memory exhaustion risk noted

**Best Practices Tests**:
1. **Property Naming**
   - Input: `{"user_name": "snake_case"}`
   - Expected: `NAMING_CONVENTION` info (if strict mode)
   - Verify: Suggests camelCase

2. **Reserved Words**
   - Input: `{"constructor": "value"}`
   - Expected: `RESERVED_WORD` warning
   - Verify: Alternative suggested

3. **Large Arrays**
   - Input: Array with 15,000+ elements
   - Expected: `LARGE_ARRAY` warning
   - Verify: Performance recommendation

4. **Large Objects**
   - Input: Object with 2,000+ properties
   - Expected: `LARGE_OBJECT` warning
   - Verify: Structure recommendation

5. **Duplicate Keys**
   - Input: `{"name": "first", "name": "second"}`
   - Expected: `DUPLICATE_KEY` warning
   - Verify: Both line numbers reported

#### Test Category 3: Configuration Profiles
**Objective**: Verify validation profile system works

**Profile Tests**:
1. **Strict Profile**
   - Config: `new JsonParser('strict')`
   - Input: Property naming violations
   - Expected: All linting rules active
   - Verify: Maximum validation coverage

2. **Lenient Profile**
   - Config: `new JsonParser('lenient')`
   - Input: Same violations
   - Expected: Only security/performance warnings
   - Verify: Best practices disabled

3. **Custom Profile**
   - Config: Custom configuration object
   - Input: Violations matching custom limits
   - Expected: Rules match configuration
   - Verify: Selective rule application

4. **Runtime Configuration**
   - Test: `setValidationConfig()` method
   - Verify: Configuration changes apply immediately
   - Expected: Different validation behavior

#### Test Category 4: Error Reporting Quality
**Objective**: Ensure error messages are actionable

**Error Message Tests**:
1. **Line/Column Accuracy**
   - Input: Multi-line JSON with error at line 5, column 12
   - Expected: Exact position reported
   - Verify: Easy to locate in editor

2. **Message Clarity**
   - Input: Various error types
   - Expected: User-friendly explanations
   - Verify: Technical terms avoided

3. **Severity Levels**
   - Test: Error, warning, info messages
   - Expected: Appropriate severity assigned
   - Verify: Critical vs. advisory distinction

4. **Error Codes**
   - Test: All error types
   - Expected: Consistent, descriptive codes
   - Verify: Programmatic handling possible

#### Test Category 5: Performance Benchmarks
**Objective**: Validate performance characteristics

**Performance Tests**:
1. **Small Files (<1KB)**
   - Expected: <1ms validation time
   - Verify: Instant feedback

2. **Medium Files (100KB)**
   - Expected: <10ms validation time
   - Verify: Real-time validation viable

3. **Large Files (1MB)**
   - Expected: <100ms validation time
   - Verify: Acceptable for large datasets

4. **Very Large Files (5MB)**
   - Expected: <500ms validation time
   - Verify: Performance warning accuracy

5. **Memory Usage**
   - Test: Large file parsing
   - Expected: <50MB memory usage
   - Verify: No memory leaks

### Integration Testing

#### UI Integration Tests
1. **StatusBar Updates**
   - Verify: Error/warning counts display correctly
   - Test: Real-time updates on content change

2. **Error Panel Display**
   - Verify: Errors show with line numbers
   - Test: Click-to-navigate functionality

3. **Validation Profiles UI**
   - Verify: Profile switching works
   - Test: Configuration persistence

### Expected Results

#### Performance Targets
- **Validation Speed**: <100ms for 1MB files
- **Memory Usage**: <50MB for large datasets  
- **Error Accuracy**: 100% line/column positioning
- **Coverage**: All major JSON syntax issues detected

#### Quality Metrics
- **User Experience**: Clear, actionable error messages
- **Security**: All common attack vectors detected
- **Best Practices**: Comprehensive coding standard validation
- **Performance**: Real-time validation for typical files

### Success Criteria
✅ All syntax errors detected with precise positioning
✅ Security vulnerabilities identified and explained  
✅ Performance warnings accurate and helpful
✅ Best practices violations caught with suggestions
✅ Configuration system works across all profiles
✅ Error messages are user-friendly and actionable
✅ Performance targets met for all file sizes
✅ Integration with existing UI components seamless

### Risk Mitigation
- **False Positives**: Validate linting rules don't flag valid patterns
- **Performance Impact**: Ensure validation doesn't slow down UI
- **Configuration Complexity**: Test default profiles work well
- **Error Message Quality**: Verify messages help rather than confuse users

This comprehensive testing plan ensures the JSON error linting and validation system meets enterprise-grade quality standards while providing excellent user experience.
