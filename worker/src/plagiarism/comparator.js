/**
 * Pairwise comparison of fingerprint sets using Jaccard similarity.
 */

const Comparator = {
  /**
   * Compute Jaccard similarity between two fingerprint sets.
   * Jaccard = |A ∩ B| / |A ∪ B|
   *
   * @param {Set<number>} setA - Fingerprint set A
   * @param {Set<number>} setB - Fingerprint set B
   * @returns {{ similarity: number, matchedCount: number }} Similarity score (0-1) and count of matched fingerprints
   */
  jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) {
      return { similarity: 0, matchedCount: 0 };
    }

    let intersection = 0;
    const smaller = setA.size <= setB.size ? setA : setB;
    const larger = setA.size <= setB.size ? setB : setA;

    for (const fp of smaller) {
      if (larger.has(fp)) {
        intersection++;
      }
    }

    const union = setA.size + setB.size - intersection;
    const similarity = union > 0 ? intersection / union : 0;

    return {
      similarity: Math.round(similarity * 10000) / 10000, // 4 decimal places
      matchedCount: intersection,
    };
  },

  /**
   * Compare all pairs of submissions and return pairs exceeding the threshold.
   *
   * @param {Array<{ id: string, fingerprints: Set<number> }>} submissions - Array of submissions with fingerprint sets
   * @param {number} threshold - Similarity threshold (0-1, default 0.70)
   * @returns {Array<{ submissionAId: string, submissionBId: string, similarity: number, matchedCount: number }>}
   */
  comparePairwise(submissions, threshold = 0.70) {
    const flaggedPairs = [];

    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const { similarity, matchedCount } = this.jaccardSimilarity(
          submissions[i].fingerprints,
          submissions[j].fingerprints
        );

        if (similarity >= threshold) {
          flaggedPairs.push({
            submissionAId: submissions[i].id,
            submissionBId: submissions[j].id,
            similarity,
            matchedCount,
          });
        }
      }
    }

    // Sort by similarity descending
    flaggedPairs.sort((a, b) => b.similarity - a.similarity);

    return flaggedPairs;
  },
};

module.exports = Comparator;
