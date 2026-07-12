/**
 * K-gram generator for plagiarism detection.
 * Generates sliding-window k-grams from a normalized code string.
 */

const KGram = {
  /**
   * Generate k-grams from a string.
   * A k-gram is a substring of length k from a sliding window.
   *
   * @param {string} text - Normalized code string
   * @param {number} k - K-gram size (default 25)
   * @returns {Array<string>} Array of k-gram strings
   */
  generate(text, k = 25) {
    if (!text || text.length < k) {
      return text ? [text] : [];
    }

    const kgrams = [];
    for (let i = 0; i <= text.length - k; i++) {
      kgrams.push(text.substring(i, i + k));
    }

    return kgrams;
  },

  /**
   * Hash a k-gram string to a numeric value.
   * Uses a rolling polynomial hash for efficiency.
   *
   * @param {string} kgram - The k-gram string
   * @returns {number} Hash value
   */
  hash(kgram) {
    let hash = 0;
    const prime = 31;
    const mod = 1e9 + 7;

    for (let i = 0; i < kgram.length; i++) {
      hash = (hash * prime + kgram.charCodeAt(i)) % mod;
    }

    return hash;
  },

  /**
   * Generate hashed k-grams from a string.
   *
   * @param {string} text - Normalized code string
   * @param {number} k - K-gram size
   * @returns {Array<number>} Array of hash values
   */
  generateHashes(text, k = 25) {
    const kgrams = this.generate(text, k);
    return kgrams.map((kg) => this.hash(kg));
  },
};

module.exports = KGram;
