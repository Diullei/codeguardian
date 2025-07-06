import { generateFullViewCommand, OriginalCliArgs } from '../../../src/utils/cliCommandBuilder';

describe('generateFullViewCommand', () => {
    it('should generate basic command with defaults', () => {
        const args: OriginalCliArgs = {
            base: 'main'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --format=console');
    });

    it('should include config option', () => {
        const args: OriginalCliArgs = {
            config: 'rules/*.yaml',
            base: 'main'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --config "rules/*.yaml" --format=console');
    });

    it('should include multiple exclude patterns', () => {
        const args: OriginalCliArgs = {
            exclude: ['tests/**', 'docs/**'],
            base: 'main'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --exclude "tests/**" --exclude "docs/**" --format=console');
    });

    it('should include repo option', () => {
        const args: OriginalCliArgs = {
            repo: '/path/to/repo',
            base: 'main'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --repo "/path/to/repo" --format=console');
    });

    it('should include -C option', () => {
        const args: OriginalCliArgs = {
            C: '/some/directory',
            base: 'main'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check -C "/some/directory" --format=console');
    });

    it('should include non-default base branch', () => {
        const args: OriginalCliArgs = {
            base: 'develop'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --base develop --format=console');
    });

    it('should include non-default head', () => {
        const args: OriginalCliArgs = {
            base: 'main',
            head: 'feature-branch'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --head feature-branch --format=console');
    });

    it('should include non-default mode', () => {
        const args: OriginalCliArgs = {
            base: 'main',
            mode: 'all'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --mode all --format=console');
    });

    it('should combine all options', () => {
        const args: OriginalCliArgs = {
            config: 'security/*.yaml',
            exclude: ['docs/**', 'examples/**'],
            repo: '/project/path',
            C: '/working/dir',
            base: 'develop',
            head: 'feature-xyz',
            mode: 'staged'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe(
            'codeguardian check ' +
            '--config "security/*.yaml" ' +
            '--exclude "docs/**" ' +
            '--exclude "examples/**" ' +
            '--repo "/project/path" ' +
            '-C "/working/dir" ' +
            '--base develop ' +
            '--head feature-xyz ' +
            '--mode staged ' +
            '--format=console'
        );
    });

    it('should skip default values', () => {
        const args: OriginalCliArgs = {
            base: 'main',
            head: 'HEAD',
            mode: 'diff'
        };

        const result = generateFullViewCommand(args);
        
        expect(result).toBe('codeguardian check --format=console');
    });
});