/**
 * Winnowing algorithm for selecting fingerprints from a sequence of hash values.
 * Implements the robust winnowing algorithm from "Winnowing: Local Algorithms
 * for Document Fingerprinting" (Schleimer, Wilkerson, Aiken).
 */

const Winnowing = {
  /**
   * Apply winnowing to select fingerprints from a sequence of hashes.
   * Within each window of w consecutive hashes, select the minimum hash value.
   * Ties are broken by selecting the rightmost occurrence.
   *
   * @param {Array<number>} hashes - Sequence of hash values from k-gram hashing
   * @param {number} w - Window size (default 4)
   * @returns {Set<number>} Set of selected fingerprint hash values
   */
  winnow(hashes, w = 4) {
    if (!hashes || hashes.length === 0) {
      return new Set();
    }

    if (hashes.length <= w) {
      // If fewer hashes than window size, just take the minimum
      return new Set([Math.min(...hashes)]);
    }

    const fingerprints = new Set();
    let prevMinIdx = -1;

    for (let i = 0; i <= hashes.length - w; i++) {
      const window = hashes.slice(i, i + w);

      // Find the rightmost minimum in the window
      let minVal = Infinity;
      let minIdx = -1;

      for (let j = window.length - 1; j >= 0; j--) {
        if (window[j] <= minVal) {
          minVal = window[j];
          minIdx = i + j; // Absolute index
        }
      }

      // Only add if this is a new fingerprint position
      if (minIdx !== prevMinIdx) {
        fingerprints.add(minVal);
        prevMinIdx = minIdx;
      }
    }

    return fingerprints;
  },
};

module.exports = Winnowing;
