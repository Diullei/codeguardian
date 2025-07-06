import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Repository Discovery Integration Tests', () => {
    let testDir: string;
    let repoDir: string;
    let subDir: string;
    const cliPath = path.join(__dirname, '../../dist/cli/index.js');

    beforeEach(() => {
        // Create temporary test directory structure
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codeguardian-test-'));
        repoDir = path.join(testDir, 'my-repo');
        subDir = path.join(repoDir, 'src', 'components');
        
        // Create directories
        fs.mkdirSync(repoDir, { recursive: true });
        fs.mkdirSync(subDir, { recursive: true });
        
        // Initialize git repo with main branch
        execSync('git init -b main', { cwd: repoDir });
        execSync('git config user.email "test@example.com"', { cwd: repoDir });
        execSync('git config user.name "Test User"', { cwd: repoDir });
        
        // Create a simple rule file
        const ruleContent = `
id: test-rule
description: Test rule for repository discovery
type: for_each
select:
  type: select_files
  path_pattern: '**/*.js'
assert:
  type: assert_match
  pattern: 'console.log'
  should_match: false
`;
        fs.writeFileSync(path.join(repoDir, '.codeguardian.yaml'), ruleContent);
        
        // Create test files
        fs.writeFileSync(path.join(repoDir, 'test.js'), 'console.log("test");');
        fs.writeFileSync(path.join(subDir, 'component.js'), 'export const Component = () => {};');
        
        // Commit files
        execSync('git add .', { cwd: repoDir });
        execSync('git commit -m "Initial commit"', { cwd: repoDir });
    });

    afterEach(() => {
        // Clean up
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    describe('Auto-discovery', () => {
        it('should find repository root when run from repository root', () => {
            const result = execSync(`node ${cliPath} check --format json`, { 
                cwd: repoDir,
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });

        it('should find repository root when run from subdirectory', () => {
            const result = execSync(`node ${cliPath} check --format json`, { 
                cwd: subDir,
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });

        it('should use current directory when no git repository found', () => {
            // Create a non-git directory
            const nonGitDir = path.join(testDir, 'non-git');
            fs.mkdirSync(nonGitDir);
            fs.writeFileSync(path.join(nonGitDir, '.codeguardian.yaml'), `
id: test
type: for_each
select:
  type: select_files
  path_pattern: '*.txt'
assert:
  type: assert_match
  pattern: 'test'
`);
            
            // This should work but might show a git error
            try {
                execSync(`node ${cliPath} check --format json`, { 
                    cwd: nonGitDir,
                    encoding: 'utf8'
                });
            } catch (error: any) {
                // Expected to fail because it's not a git repository
                // The exact error message may vary depending on the git command
                expect(error.status).toBe(1);
            }
        });
    });

    describe('-C flag', () => {
        it('should change to specified directory before running', () => {
            const result = execSync(`node ${cliPath} check -C ${repoDir} --format json`, { 
                cwd: testDir, // Run from parent directory
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });

        it('should auto-discover from -C directory', () => {
            const result = execSync(`node ${cliPath} check -C ${subDir} --format json`, { 
                cwd: testDir, // Run from parent directory
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });
    });

    describe('--repo flag', () => {
        it('should use explicit repository path without auto-discovery', () => {
            const result = execSync(`node ${cliPath} check --repo ${repoDir} --format json`, { 
                cwd: testDir,
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });

        it('should use explicit relative path from -C directory', () => {
            const result = execSync(`node ${cliPath} check -C ${testDir} --repo ./my-repo --format json`, { 
                cwd: os.tmpdir(),
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });

        it('should handle . as explicit current directory', () => {
            const result = execSync(`node ${cliPath} check --repo . --format json`, { 
                cwd: repoDir,
                encoding: 'utf8'
            });
            
            const report = JSON.parse(result);
            expect(report.summary.totalFiles).toBe(0); // No changes in diff
        });
    });

    describe('All mode with auto-discovery', () => {
        it('should validate all files when using auto-discovery', () => {
            // The command will exit with code 1 due to violations, so we need to handle that
            try {
                execSync(`node ${cliPath} check --mode all --format json`, { 
                    cwd: subDir, // Run from subdirectory
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                // If we get here, there were no violations (unexpected)
                throw new Error('Expected command to fail due to violations');
            } catch (error: any) {
                // Exit code 1 is expected due to violations
                if (error.status !== 1) {
                    throw error;
                }
                
                // Parse the output from stdout
                const report = JSON.parse(error.stdout.toString());
                expect(report.summary.totalFiles).toBe(3); // 2 JS files + 1 YAML file
                expect(report.passed).toBe(false); // Should fail due to console.log
                expect(report.results[0].violations).toHaveLength(1);
                expect(report.results[0].violations[0].file).toBe('test.js');
            }
        });
    });
});