import { ResultCache as IResultCache } from '../types';

export class ResultCache implements IResultCache {
    private cache = new Map<string, any>();

    async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
        if (this.cache.has(key)) {
            return this.cache.get(key) as T;
        }

        const result = await factory();
        this.cache.set(key, result);
        return result;
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }

    set(key: string, value: any): void {
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }
}
