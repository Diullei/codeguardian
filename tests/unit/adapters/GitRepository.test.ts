import { GitRepository } from '../../../src/adapters/GitRepository';
import simpleGit from 'simple-git';

jest.mock('simple-git');

describe('GitRepository', () => {
    describe('getDefaultBranch', () => {
        let mockGit: any;
        let repository: GitRepository;

        beforeEach(() => {
            mockGit = {
                raw: jest.fn(),
                diffSummary: jest.fn(),
                status: jest.fn(),
            };
            (simpleGit as any).mockReturnValue(mockGit);
            repository = new GitRepository('/test/repo');
        });

        it('should return branch from remote HEAD if available', async () => {
            mockGit.raw.mockResolvedValueOnce('refs/remotes/origin/develop\n');
            
            const result = await repository.getDefaultBranch();
            
            expect(result).toBe('develop');
            expect(mockGit.raw).toHaveBeenCalledWith(['symbolic-ref', 'refs/remotes/origin/HEAD']);
        });

        it('should return main if it exists locally', async () => {
            mockGit.raw
                .mockRejectedValueOnce(new Error('No remote HEAD')) // symbolic-ref fails
                .mockResolvedValueOnce('some-commit-hash'); // main exists
            
            const result = await repository.getDefaultBranch();
            
            expect(result).toBe('main');
            expect(mockGit.raw).toHaveBeenCalledWith(['rev-parse', '--verify', 'refs/heads/main']);
        });

        it('should fallback to master if main does not exist', async () => {
            mockGit.raw
                .mockRejectedValueOnce(new Error('No remote HEAD')) // symbolic-ref fails
                .mockRejectedValueOnce(new Error('main not found')) // main doesn't exist
                .mockResolvedValueOnce('some-commit-hash'); // master exists
            
            const result = await repository.getDefaultBranch();
            
            expect(result).toBe('master');
            expect(mockGit.raw).toHaveBeenCalledWith(['rev-parse', '--verify', 'refs/heads/master']);
        });

        it('should default to main if neither main nor master exist', async () => {
            mockGit.raw
                .mockRejectedValueOnce(new Error('No remote HEAD')) // symbolic-ref fails
                .mockRejectedValueOnce(new Error('main not found')) // main doesn't exist
                .mockRejectedValueOnce(new Error('master not found')); // master doesn't exist
            
            const result = await repository.getDefaultBranch();
            
            expect(result).toBe('main');
        });
    });
});