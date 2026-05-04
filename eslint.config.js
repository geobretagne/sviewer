import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';

export default [
    js.configs.recommended,
    security.configs.recommended,
    {
        files: ['js/sviewer.js', 'js/embed.js'],
        languageOptions: {
            ecmaVersion: 2017,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                $: 'readonly',
                jQuery: 'readonly',
                Mustache: 'readonly',
                ol: 'readonly',
                bootstrap: 'readonly',
                QRCode: 'readonly',
                SViewer: 'writable',
                customConfig: 'readonly',
                hardConfig: 'writable',
                log: 'readonly',
                parseISOMetadata: 'readonly',
                buildISOTable: 'readonly',
                XPathResult: 'readonly',
            }
        },
        rules: {
            'no-unused-vars': ['warn', { caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
            'no-redeclare': 'off',
            'no-undef': 'error',
            'eqeqeq': ['warn', 'always', { null: 'ignore' }],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-proto': 'error',
            'no-extend-native': 'error',
            'no-global-assign': 'error',
        }
    }
];
