import { SelectCommandOutputRule } from '../../../src/selectors/SelectCommandOutputRule';
import { EvaluationContext } from '../../../src/types';
import { ResultCache } from '../../../src/core';
import { exec } from 'child_process';

jest.mock('child_process');
const mockedExec = exec as unknown as jest.Mock;

describe('SelectCommandOutputRule', () => {
    let context: EvaluationContext;

    beforeEach(() => {
        context = {
            repository: {} as any,
            diff: {} as any,
            cache: new ResultCache(),
            config: { type: 'select_command_output' },
        };
        mockedExec.mockClear();
    });

    it('should resolve with command output on successful execution (exit code 0)', async () => {
        const rule = new SelectCommandOutputRule('test-rule', 'npm run success');
        
        mockedExec.mockImplementation((_command, callback) => {
            callback(null, 'Success stdout', 'Success stderr');
        });

        const result = await rule.select(context);

        expect(mockedExec).toHaveBeenCalledWith('npm run success', expect.any(Function));
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            command: 'npm run success',
            exitCode: 0,
            stdout: 'Success stdout',
            stderr: 'Success stderr',
        });
    });

    it('should resolve with command output on failed execution (non-zero exit code)', async () => {
        const rule = new SelectCommandOutputRule('test-rule', 'npm run fail');
        
        const mockError = new Error('Command failed');
        (mockError as any).code = 127;
        
        mockedExec.mockImplementation((_command, callback) => {
            callback(mockError, 'Failure stdout', 'Failure stderr');
        });

        const result = await rule.select(context);

        expect(mockedExec).toHaveBeenCalledWith('npm run fail', expect.any(Function));
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            command: 'npm run fail',
            exitCode: 127,
            stdout: 'Failure stdout',
            stderr: 'Failure stderr',
        });
    });

    it('should trim whitespace from stdout and stderr', async () => {
        const rule = new SelectCommandOutputRule('test-rule', 'npm run padded');

        mockedExec.mockImplementation((_command, callback) => {
            callback(null, '  Padded stdout  \n', '\n  Padded stderr  ');
        });

        const result = await rule.select(context);
        
        expect(result[0]?.stdout).toBe('Padded stdout');
        expect(result[0]?.stderr).toBe('Padded stderr');
    });
});