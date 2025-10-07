/**
 * StateTest.js - State management testing utilities
 * Provides testing and debugging capabilities for state management
 */

class StateTest {
  constructor() {
    this.testResults = [];
    this.isEnabled = false;
  }

  /**
   * Enable state testing
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable state testing
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Test state consistency
   */
  testStateConsistency(state) {
    if (!this.isEnabled) return true;

    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test basic state structure
    const basicTest = this.testBasicStructure(state);
    results.tests.push(basicTest);

    // Test state values
    const valueTest = this.testStateValues(state);
    results.tests.push(valueTest);

    // Test state transitions
    const transitionTest = this.testStateTransitions(state);
    results.tests.push(transitionTest);

    this.testResults.push(results);
    return results.tests.every(test => test.passed);
  }

  /**
   * Test basic state structure
   */
  testBasicStructure(state) {
    const requiredFields = ['currentIndex', 'isPlaying', 'currentCategory'];
    const missingFields = requiredFields.filter(field => !(field in state));

    return {
      name: 'Basic Structure Test',
      passed: missingFields.length === 0,
      details: missingFields.length === 0 ? 'All required fields present' : `Missing fields: ${missingFields.join(', ')}`
    };
  }

  /**
   * Test state values
   */
  testStateValues(state) {
    const issues = [];

    if (typeof state.currentIndex !== 'number' || state.currentIndex < 0) {
      issues.push('currentIndex must be a non-negative number');
    }

    if (typeof state.isPlaying !== 'boolean') {
      issues.push('isPlaying must be a boolean');
    }

    if (typeof state.currentCategory !== 'string') {
      issues.push('currentCategory must be a string');
    }

    return {
      name: 'State Values Test',
      passed: issues.length === 0,
      details: issues.length === 0 ? 'All state values are valid' : issues.join('; ')
    };
  }

  /**
   * Test state transitions
   */
  testStateTransitions(state) {
    // Basic transition logic tests
    const issues = [];

    if (state.isPlaying && state.currentIndex < 0) {
      issues.push('Cannot be playing with negative index');
    }

    return {
      name: 'State Transitions Test',
      passed: issues.length === 0,
      details: issues.length === 0 ? 'State transitions are valid' : issues.join('; ')
    };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults = [];
  }

  /**
   * Generate test report
   */
  generateReport() {
    if (this.testResults.length === 0) {
      return 'No test results available';
    }

    const totalTests = this.testResults.reduce((sum, result) => sum + result.tests.length, 0);
    const passedTests = this.testResults.reduce((sum, result) =>
      sum + result.tests.filter(test => test.passed).length, 0);

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) + '%' : '0%',
      results: this.testResults
    };
  }
}

// Create global instance
window.stateTest = new StateTest();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateTest;
}
