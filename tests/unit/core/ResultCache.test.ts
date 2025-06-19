import { ResultCache } from '../../../src/core/ResultCache';

describe('ResultCache', () => {
    let cache: ResultCache;

    beforeEach(() => {
        cache = new ResultCache();
    });

    it('should cache values from factory function', async () => {
        const factory = jest.fn().mockResolvedValue('cached value');

        const result1 = await cache.get('key1', factory);
        const result2 = await cache.get('key1', factory);

        expect(result1).toBe('cached value');
        expect(result2).toBe('cached value');
        expect(factory).toHaveBeenCalledTimes(1); // Factory called only once
    });

    it('should cache different values for different keys', async () => {
        const factory1 = jest.fn().mockResolvedValue('value1');
        const factory2 = jest.fn().mockResolvedValue('value2');

        const result1 = await cache.get('key1', factory1);
        const result2 = await cache.get('key2', factory2);

        expect(result1).toBe('value1');
        expect(result2).toBe('value2');
        expect(factory1).toHaveBeenCalledTimes(1);
        expect(factory2).toHaveBeenCalledTimes(1);
    });

    it('should check if key exists', async () => {
        expect(cache.has('key1')).toBe(false);

        await cache.get('key1', async () => 'value');

        expect(cache.has('key1')).toBe(true);
        expect(cache.has('key2')).toBe(false);
    });

    it('should manually set values', () => {
        cache.set('key1', 'manual value');

        expect(cache.has('key1')).toBe(true);
        expect(cache.get('key1', async () => 'factory value')).resolves.toBe('manual value');
    });

    it('should clear all cached values', async () => {
        await cache.get('key1', async () => 'value1');
        await cache.get('key2', async () => 'value2');

        expect(cache.has('key1')).toBe(true);
        expect(cache.has('key2')).toBe(true);

        cache.clear();

        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(false);
    });

    it('should handle async factory errors', async () => {
        const factory = jest.fn().mockRejectedValue(new Error('Factory error'));

        await expect(cache.get('key1', factory)).rejects.toThrow('Factory error');

        // Error should not be cached
        expect(cache.has('key1')).toBe(false);
    });

    it('should support typed values', async () => {
        interface User {
            id: number;
            name: string;
        }

        const user: User = { id: 1, name: 'John' };
        const factory = async (): Promise<User> => user;

        const result = await cache.get<User>('user', factory);

        expect(result).toEqual(user);
        expect(result.id).toBe(1);
        expect(result.name).toBe('John');
    });
});
