/**
 * Verdict computation logic.
 * Determines the verdict for each test case and computes the overall submission verdict.
 */

const VerdictComputer = {
  /**
   * Compute the verdict for a single test case execution.
   *
   * @param {Object} params
   * @param {string} params.actualOutput - The program's stdout
   * @param {string} params.expectedOutput - The expected stdout
   * @param {boolean} params.timedOut - Whether the execution timed out
   * @param {number} params.exitCode - The process exit code
   * @param {string} params.stderr - The stderr output
   * @param {number} params.memoryUsedMb - Memory used in MB
   * @param {number} params.memoryLimitMb - Memory limit in MB
   * @returns {string} Verdict: 'accepted', 'wrong_answer', 'tle', 'mle', 'runtime_error', 'compile_error'
   */
  computeTestCaseVerdict({ actualOutput, expectedOutput, timedOut, exitCode, stderr, memoryUsedMb, memoryLimitMb }) {
    // Time Limit Exceeded
    if (timedOut) {
      return 'tle';
    }

    // Memory Limit Exceeded
    if (exitCode === 137 || (memoryUsedMb && memoryLimitMb && memoryUsedMb >= memoryLimitMb)) {
      return 'mle';
    }

    // Compilation Error — detected by specific patterns in stderr
    if (stderr && this._isCompilationError(stderr)) {
      return 'compile_error';
    }

    // Runtime Error — non-zero exit code
    if (exitCode !== 0) {
      return 'runtime_error';
    }

    // Compare output (whitespace-trimmed comparison per SRS)
    const normalizedActual = this._normalizeOutput(actualOutput);
    const normalizedExpected = this._normalizeOutput(expectedOutput);

    if (normalizedActual === normalizedExpected) {
      return 'accepted';
    }

    return 'wrong_answer';
  },

  /**
   * Compute the overall submission verdict from per-test-case verdicts.
   *
   * @param {Array<string>} verdicts - Array of per-test-case verdicts
   * @returns {string} Overall verdict
   */
  computeOverallVerdict(verdicts) {
    if (verdicts.length === 0) return 'pending';

    // If any test case has a compile error, the whole submission is a compile error
    if (verdicts.includes('compile_error')) return 'compile_error';

    // If all test cases are accepted, overall is accepted
    if (verdicts.every((v) => v === 'accepted')) return 'accepted';

    // Priority: tle > mle > runtime_error > wrong_answer
    if (verdicts.includes('tle')) return 'tle';
    if (verdicts.includes('mle')) return 'mle';
    if (verdicts.includes('runtime_error')) return 'runtime_error';

    return 'wrong_answer';
  },

  /**
   * Compute the score for a coding submission.
   * Score = (accepted test cases / total test cases) × question weight
   *
   * @param {Array<string>} verdicts - Per-test-case verdicts
   * @param {number} questionWeight - The question's scoring weight
   * @returns {number} Computed score
   */
  computeScore(verdicts, questionWeight) {
    if (verdicts.length === 0) return 0;
    const accepted = verdicts.filter((v) => v === 'accepted').length;
    return (accepted / verdicts.length) * questionWeight;
  },

  /**
   * Normalize output for comparison.
   * Trims leading/trailing whitespace, normalizes line endings,
   * and trims trailing whitespace from each line.
   */
  _normalizeOutput(output) {
    if (!output) return '';
    return output
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  },

  /**
   * Detect if stderr indicates a compilation error vs a runtime error.
   */
  _isCompilationError(stderr) {
    const patterns = [
      /error:.*\.cpp/i,
      /error:.*\.java/i,
      /SyntaxError/i,
      /IndentationError/i,
      /cannot find symbol/i,
      /incompatible types/i,
      /expected.*before/i,
      /undefined reference/i,
    ];
    return patterns.some((p) => p.test(stderr));
  },
};

module.exports = VerdictComputer;
