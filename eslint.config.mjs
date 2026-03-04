// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        // Ignore patterns
        ignores: ['**/dist/**', '**/node_modules/**', 'jest.config.js', '*.md', 'src/edit-ui/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // TypeScript specific rules
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-non-null-assertion': 'off',

            // General rules
            'no-console': 'off',
            'no-debugger': 'error',
        },
    },
    {
        // Test files specific config
        files: ['**/*.test.ts', '**/*.spec.ts'],
        languageOptions: {
            parserOptions: {
                project: false,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-console': 'off',
        },
    },
    {
        // CLI files - allow console
        files: ['**/cli/**/*.ts'],
        rules: {
            'no-console': 'off',
        },
    }
);
