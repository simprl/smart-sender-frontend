import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'public/mockServiceWorker.js',
            'node_modules',
            '.npm-cache',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    { rules: { curly: ['error', 'all'] } },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        plugins: { 'react-hooks': hooks },
        settings: {
            'react-hooks': {
                additionalEffectHooks:
                    '^useOn(Login|Logout|ParamsChange|Save|Change|Event)$',
            },
        },
        rules: { ...hooks.configs.recommended.rules },
    },
);
