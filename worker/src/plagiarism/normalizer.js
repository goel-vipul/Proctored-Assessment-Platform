/**
 * Source code normalizer for plagiarism detection.
 * Strips comments, whitespace, and optionally normalizes identifier names
 * to reduce trivial evasion (variable renaming).
 */

const Normalizer = {
  /**
   * Normalize source code for plagiarism comparison.
   *
   * @param {string} code - Raw source code
   * @param {string} language - Programming language
   * @returns {string} Normalized code string
   */
  normalize(code, language) {
    if (!code) return '';

    let normalized = code;

    // Step 1: Remove comments
    normalized = this._removeComments(normalized, language);

    // Step 2: Normalize string literals (replace with placeholder)
    normalized = normalized.replace(/"[^"]*"/g, '"S"');
    normalized = normalized.replace(/'[^']*'/g, "'S'");

    // Step 3: Normalize identifier names (tokenization pass)
    normalized = this._normalizeIdentifiers(normalized, language);

    // Step 4: Remove all whitespace and newlines
    normalized = normalized.replace(/\s+/g, '');

    // Step 5: Convert to lowercase
    normalized = normalized.toLowerCase();

    return normalized;
  },

  /**
   * Remove comments based on language syntax.
   */
  _removeComments(code, language) {
    switch (language) {
      case 'python':
        // Remove # comments (but not inside strings — simplified approach)
        code = code.replace(/#[^\n]*/g, '');
        // Remove docstrings
        code = code.replace(/"""[\s\S]*?"""/g, '');
        code = code.replace(/'''[\s\S]*?'''/g, '');
        return code;

      case 'cpp':
      case 'java':
      case 'javascript':
        // Remove // single-line comments
        code = code.replace(/\/\/[^\n]*/g, '');
        // Remove /* */ multi-line comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        return code;

      default:
        return code;
    }
  },

  /**
   * Normalize identifier names to reduce variable-renaming evasion.
   * Replaces user-defined identifiers with generic tokens (V0, V1, etc.).
   */
  _normalizeIdentifiers(code, language) {
    // Language keywords that should NOT be replaced
    const keywords = this._getKeywords(language);
    const keywordSet = new Set(keywords);

    // Find all identifiers (sequences of word characters starting with a letter or _)
    const identifierMap = new Map();
    let counter = 0;

    return code.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      if (keywordSet.has(match.toLowerCase())) {
        return match; // Preserve keywords
      }
      // Built-in functions and common library names — preserve
      if (this._isBuiltin(match, language)) {
        return match;
      }

      if (!identifierMap.has(match)) {
        identifierMap.set(match, `V${counter++}`);
      }
      return identifierMap.get(match);
    });
  },

  /**
   * Get language keywords.
   */
  _getKeywords(language) {
    const common = ['if', 'else', 'for', 'while', 'return', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false', 'null', 'new', 'class', 'void', 'int', 'float', 'double', 'char', 'string', 'bool', 'boolean'];

    const languageSpecific = {
      cpp: ['include', 'using', 'namespace', 'std', 'cout', 'cin', 'endl', 'vector', 'map', 'set', 'auto', 'const', 'static', 'struct', 'template', 'typename', 'typedef', 'sizeof', 'long', 'short', 'unsigned', 'signed', 'public', 'private', 'protected'],
      java: ['import', 'package', 'extends', 'implements', 'interface', 'abstract', 'final', 'static', 'public', 'private', 'protected', 'throws', 'try', 'catch', 'finally', 'synchronized', 'this', 'super', 'instanceof', 'enum'],
      python: ['def', 'lambda', 'import', 'from', 'as', 'class', 'self', 'with', 'try', 'except', 'finally', 'raise', 'yield', 'pass', 'in', 'not', 'and', 'or', 'is', 'global', 'nonlocal', 'assert', 'del', 'elif', 'print', 'range', 'len', 'input', 'int', 'str', 'list', 'dict', 'set', 'tuple', 'none'],
      javascript: ['var', 'let', 'const', 'function', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'this', 'super', 'import', 'export', 'from', 'require', 'module', 'console', 'log', 'undefined', 'nan', 'infinity', 'promise', 'array', 'object', 'map', 'set'],
    };

    return [...common, ...(languageSpecific[language] || [])];
  },

  /**
   * Check if an identifier is a builtin function/type.
   */
  _isBuiltin(name, language) {
    const builtins = {
      cpp: ['main', 'printf', 'scanf', 'getline', 'push_back', 'size', 'begin', 'end', 'sort', 'min', 'max', 'abs', 'pow', 'sqrt'],
      java: ['main', 'System', 'String', 'Integer', 'Scanner', 'Math', 'Arrays', 'Collections', 'ArrayList', 'HashMap', 'StringBuilder', 'println', 'parseInt', 'valueOf'],
      python: ['main', 'print', 'input', 'range', 'len', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'sorted', 'enumerate', 'zip', 'map', 'filter', 'max', 'min', 'abs', 'sum', 'append', 'split', 'join', 'strip'],
      javascript: ['console', 'log', 'parseInt', 'parseFloat', 'JSON', 'stringify', 'parse', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Map', 'Set', 'Promise', 'setTimeout', 'setInterval', 'process', 'readline'],
    };
    return (builtins[language] || []).includes(name);
  },
};

module.exports = Normalizer;
