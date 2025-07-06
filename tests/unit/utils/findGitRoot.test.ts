import * as fs from 'fs';
import { findGitRoot, resolveRepositoryPath } from '../../../src/utils/findGitRoot';

jest.mock('fs');

describe('findGitRoot', () => {
    const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should find git root in current directory', () => {
        const currentDir = '/home/user/project';
        mockStatSync.mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = findGitRoot(currentDir);

        expect(result).toBe(currentDir);
        expect(mockStatSync).toHaveBeenCalledWith('/home/user/project/.git');
    });

    it('should find git root in parent directory', () => {
        const currentDir = '/home/user/project/src/utils';
        mockStatSync
            .mockImplementationOnce(() => { throw new Error('Not found'); })
            .mockImplementationOnce(() => { throw new Error('Not found'); })
            .mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = findGitRoot(currentDir);

        expect(result).toBe('/home/user/project');
        expect(mockStatSync).toHaveBeenCalledTimes(3);
        expect(mockStatSync).toHaveBeenNthCalledWith(1, '/home/user/project/src/utils/.git');
        expect(mockStatSync).toHaveBeenNthCalledWith(2, '/home/user/project/src/.git');
        expect(mockStatSync).toHaveBeenNthCalledWith(3, '/home/user/project/.git');
    });

    it('should handle git submodules (where .git is a file)', () => {
        const currentDir = '/home/user/project/submodule';
        mockStatSync.mockReturnValueOnce({ 
            isDirectory: () => false, 
            isFile: () => true 
        } as any);

        const result = findGitRoot(currentDir);

        expect(result).toBe(currentDir);
    });

    it('should return null if no git root found', () => {
        const currentDir = '/home/user/no-git-project';
        mockStatSync.mockImplementation(() => { throw new Error('Not found'); });

        const result = findGitRoot(currentDir);

        expect(result).toBeNull();
    });

    it('should check root directory', () => {
        const currentDir = '/project';
        mockStatSync
            .mockImplementationOnce(() => { throw new Error('Not found'); })
            .mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = findGitRoot(currentDir);

        expect(result).toBe('/');
        expect(mockStatSync).toHaveBeenCalledWith('/.git');
    });

    it('should use current working directory if no path provided', () => {
        const cwd = process.cwd();
        mockStatSync.mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = findGitRoot();

        expect(result).toBe(cwd);
    });
});

describe('resolveRepositoryPath', () => {
    const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, 'cwd').mockReturnValue('/current/working/dir');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should use explicit path when provided', () => {
        const result = resolveRepositoryPath('./my-repo');

        expect(result).toBe('/current/working/dir/my-repo');
    });

    it('should use absolute explicit path', () => {
        const result = resolveRepositoryPath('/absolute/path/to/repo');

        expect(result).toBe('/absolute/path/to/repo');
    });

    it('should respect -C flag and explicit path', () => {
        const result = resolveRepositoryPath('./repo', '/change/to/dir');

        expect(result).toBe('/change/to/dir/repo');
    });

    it('should auto-discover when no explicit path provided', () => {
        mockStatSync
            .mockImplementationOnce(() => { throw new Error('Not found'); })
            .mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = resolveRepositoryPath();

        expect(result).toBe('/current/working');
        expect(mockStatSync).toHaveBeenCalledWith('/current/working/dir/.git');
        expect(mockStatSync).toHaveBeenCalledWith('/current/working/.git');
    });

    it('should use -C directory for auto-discovery', () => {
        mockStatSync.mockReturnValueOnce({ isDirectory: () => true } as any);

        const result = resolveRepositoryPath(undefined, '/start/here');

        expect(result).toBe('/start/here');
        expect(mockStatSync).toHaveBeenCalledWith('/start/here/.git');
    });

    it('should use start directory if no git root found', () => {
        mockStatSync.mockImplementation(() => { throw new Error('Not found'); });

        const result = resolveRepositoryPath();

        expect(result).toBe('/current/working/dir');
    });

    it('should handle explicit empty string as current directory', () => {
        const result = resolveRepositoryPath('', '/start/here');

        expect(result).toBe('/start/here');
    });
});