const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const env = require('./config');

/**
 * Language-to-Docker-image mapping.
 */
const LANGUAGE_IMAGES = {
  cpp: 'sandbox-cpp',
  java: 'sandbox-java',
  python: 'sandbox-python',
  javascript: 'sandbox-javascript',
};

/**
 * Manages the lifecycle of ephemeral Docker containers for sandboxed code execution.
 */
class ContainerManager {
  /**
   * Execute source code against a single test case inside a Docker container.
   *
   * @param {Object} params
   * @param {string} params.language - Programming language (cpp, java, python, javascript)
   * @param {string} params.sourceCode - Source code to execute
   * @param {string} params.stdin - Standard input for the test case
   * @param {number} params.timeLimitMs - Time limit in milliseconds
   * @param {number} params.memoryLimitMb - Memory limit in MB
   * @returns {Object} { stdout, stderr, exitCode, execTimeMs, memoryUsedMb, timedOut, error }
   */
  async execute({ language, sourceCode, stdin, timeLimitMs, memoryLimitMb }) {
    const containerName = `sandbox-${uuidv4().slice(0, 12)}`;
    const image = LANGUAGE_IMAGES[language];
    if (!image) {
      return { error: `Unsupported language: ${language}`, exitCode: 1 };
    }

    // Create a temp directory for this execution
    const tmpDir = path.join(os.tmpdir(), `sandbox-${containerName}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Write source code and stdin to temp files
      const sourceFile = this._getSourceFileName(language);
      fs.writeFileSync(path.join(tmpDir, sourceFile), sourceCode);
      fs.writeFileSync(path.join(tmpDir, 'stdin.txt'), stdin || '');

      // Build the compile + run script
      const script = this._buildScript(language, sourceFile);
      fs.writeFileSync(path.join(tmpDir, 'run.sh'), script);

      // Docker run command with all security flags
      const timeLimitSec = Math.ceil(timeLimitMs / 1000) + 2; // Add 2s buffer for compile
      const memoryBytes = memoryLimitMb * 1024 * 1024;

      const dockerCmd = [
        'docker', 'run',
        '--rm',
        '--name', containerName,
        '--network', 'none',
        '--memory', `${memoryBytes}`,
        '--memory-swap', `${memoryBytes}`,  // No swap
        '--cpus', `${env.SANDBOX_CPU_LIMIT}`,
        '--pids-limit', `${env.SANDBOX_PIDS_LIMIT}`,
        '--read-only',
        '--tmpfs', '/tmp/code:rw,noexec,size=50m',
        '-v', `${tmpDir.replace(/\\/g, '/')}:/tmp/code:rw`,
        '-w', '/tmp/code',
        image,
        '-c', 'bash /tmp/code/run.sh < /tmp/code/stdin.txt',
      ];

      const startTime = Date.now();
      let result;

      try {
        result = await this._runWithTimeout(dockerCmd.join(' '), timeLimitMs + 5000, containerName);
      } catch (err) {
        // Check if it was a timeout
        if (err.timedOut) {
          return {
            stdout: '',
            stderr: 'Time Limit Exceeded',
            exitCode: 124,
            execTimeMs: timeLimitMs,
            memoryUsedMb: 0,
            timedOut: true,
          };
        }
        // OOM or other container error
        if (err.stderr && err.stderr.includes('OOMKilled')) {
          return {
            stdout: '',
            stderr: 'Memory Limit Exceeded',
            exitCode: 137,
            execTimeMs: Date.now() - startTime,
            memoryUsedMb: memoryLimitMb,
            timedOut: false,
          };
        }
        return {
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          exitCode: err.exitCode || 1,
          execTimeMs: Date.now() - startTime,
          memoryUsedMb: 0,
          timedOut: false,
        };
      }

      const execTimeMs = Date.now() - startTime;

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        execTimeMs,
        memoryUsedMb: 0,
        timedOut: false,
      };
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`Failed to clean up temp dir: ${tmpDir}`);
      }

      // Ensure container is removed (in case of errors)
      try {
        execSync(`docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore' });
      } catch (e) {
        // Container may already be removed
      }
    }
  }

  /**
   * Run a command with a timeout. Returns { stdout, stderr, exitCode }.
   * Rejects with { timedOut: true } if the timeout is exceeded.
   */
  _runWithTimeout(cmd, timeoutMs, containerName) {
    return new Promise((resolve, reject) => {
      const child = exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          if (error.killed || error.signal === 'SIGTERM') {
            // Kill the container as fallback
            try {
              execSync(`docker kill ${containerName} 2>/dev/null`, { stdio: 'ignore' });
            } catch (e) {}
            reject({ timedOut: true, stdout, stderr });
          } else {
            reject({ timedOut: false, stdout, stderr, exitCode: error.code, message: error.message });
          }
        } else {
          resolve({ stdout, stderr, exitCode: 0 });
        }
      });
    });
  }

  /**
   * Get the source file name for a language.
   */
  _getSourceFileName(language) {
    switch (language) {
      case 'cpp': return 'solution.cpp';
      case 'java': return 'Main.java';
      case 'python': return 'solution.py';
      case 'javascript': return 'solution.js';
      default: return 'solution.txt';
    }
  }

  /**
   * Build a shell script that compiles (if needed) and runs the source code.
   */
  _buildScript(language, sourceFile) {
    switch (language) {
      case 'cpp':
        return `#!/bin/bash
set -e
g++ -O2 -std=c++17 -o /tmp/code/solution /tmp/code/${sourceFile} 2>&1
/tmp/code/solution
`;
      case 'java':
        return `#!/bin/bash
set -e
javac /tmp/code/${sourceFile} 2>&1
java -cp /tmp/code Main
`;
      case 'python':
        return `#!/bin/bash
python3 /tmp/code/${sourceFile}
`;
      case 'javascript':
        return `#!/bin/bash
node /tmp/code/${sourceFile}
`;
      default:
        return `#!/bin/bash
echo "Unsupported language"
exit 1
`;
    }
  }
}

module.exports = new ContainerManager();
