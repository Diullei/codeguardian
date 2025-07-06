import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Compact Mode Integration Tests', () => {
    let testDir: string;
    let repoDir: string;
    const cliPath = path.join(__dirname, '../../dist/cli/index.js');

    beforeEach(() => {
        // Create temporary test directory structure
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeguardian-compact-test-'));
        repoDir = path.join(testDir, 'test-repo');
        
        // Create directories
        fs.mkdirSync(repoDir, { recursive: true });
        
        // Initialize git repo with main branch
        execSync('git init -b main', { cwd: repoDir });
        execSync('git config user.email "test@example.com"', { cwd: repoDir });
        execSync('git config user.name "Test User"', { cwd: repoDir });
        
        // Create rule file that will catch violations
        const ruleContent = `
id: test-compact-rule
description: Test rule for compact mode
type: for_each
select:
  type: select_files
  path_pattern: '**/*.js'
assert:
  type: assert_match
  pattern: 'console\\.log'
  should_match: false
  message: 'Console.log statements are not allowed'
`;
        fs.writeFileSync(path.join(repoDir, '.codeguardian.yaml'), ruleContent);
        
        // Create test files with violations
        fs.writeFileSync(path.join(repoDir, 'file1.js'), 'console.log("debug 1");');
        fs.writeFileSync(path.join(repoDir, 'file2.js'), 'console.log("debug 2");');
        fs.writeFileSync(path.join(repoDir, 'file3.js'), 'console.log("debug 3");');
        
        // Commit files
        execSync('git add .', { cwd: repoDir });
        execSync('git commit -m "Initial commit"', { cwd: repoDir });
    });

    afterEach(() => {
        // Clean up
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    describe('Claude Code Hook Mode', () => {
        it('should output compact format when violations exist', () => {
            try {
                execSync(`node ${cliPath} check --claude-code-hook --mode all`, { 
                    cwd: repoDir,
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                throw new Error('Expected command to fail with violations');
            } catch (error: any) {
                // Exit code 2 is expected for claude-code-hook mode
                expect(error.status).toBe(2);
                
                const output = error.stderr.toString();
                
                // Should use compact format
                expect(output).toContain('VIOLATIONS (3 total):');
                expect(output).toContain('file1.js [test-compact-rule]');
                expect(output).toContain('Found: console.log("debug 1");');
                expect(output).toContain('Fix: Remove console.log or use proper logger');
                
                // Should not contain pytest-style headers
                expect(output).not.toContain('validation session starts');
                expect(output).not.toContain('platform linux');
                expect(output).not.toContain('collected');
                
                // Should not contain configuration file listing
                expect(output).not.toContain('Found 1 configuration file(s):');
                
                // Should not contain ANSI color codes
                expect(output).not.toMatch(/\x1b\[\d+m/);
            }
        });

        it('should show command with preserved arguments when truncated', () => {
            // Create more violations to trigger truncation
            for (let i = 4; i <= 10; i++) {
                fs.writeFileSync(path.join(repoDir, `file${i}.js`), `console.log("debug ${i}");`);
            }
            
            try {
                execSync(`node ${cliPath} check --claude-code-hook --mode all --config ".codeguardian.yaml"`, { 
                    cwd: repoDir,
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                throw new Error('Expected command to fail with violations');
            } catch (error: any) {
                expect(error.status).toBe(2);
                
                const output = error.stderr.toString();
                
                // Should show truncation with preserved command
                expect(output).toContain('VIOLATIONS (10 total, showing first 5):');
                expect(output).toContain('+5 more violations. Run: codeguardian check --config ".codeguardian.yaml" --mode all --format=console');
            }
        });

        it('should be silent on success', () => {
            // Create a file without violations
            fs.writeFileSync(path.join(repoDir, 'clean.js'), 'const x = 1;');
            
            // Remove violation files
            fs.unlinkSync(path.join(repoDir, 'file1.js'));
            fs.unlinkSync(path.join(repoDir, 'file2.js'));
            fs.unlinkSync(path.join(repoDir, 'file3.js'));
            
            const result = execSync(`node ${cliPath} check --claude-code-hook --mode all`, { 
                cwd: repoDir,
                encoding: 'utf8'
            });
            
            // Should be completely silent on success
            expect(result).toBe('');
        });
    });

    describe('Normal Mode (Non-Claude-Code-Hook)', () => {
        it('should output detailed format in normal mode', () => {
            try {
                execSync(`node ${cliPath} check --mode all`, { 
                    cwd: repoDir,
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                
                throw new Error('Expected command to fail with violations');
            } catch (error: any) {
                // Exit code 1 in normal mode
                expect(error.status).toBe(1);
                
                const output = error.stdout.toString();
                
                // Should use detailed format
                expect(output).toContain('validation session starts');
                expect(output).toContain('FAILURES');
                expect(output).toContain('[CHECK FAIL]');
                
                // Should not use compact format
                expect(output).not.toContain('VIOLATIONS (3 total):');
            }
        });
    });
});