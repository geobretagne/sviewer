import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';

export default [
    {
        ignores: ['static/js/*.min.js', 'static/js/sviewer.min.js', 'static/js/embed.min.js', 'static/lib/**', 'node_modules/**']
    },
    {
        files: ['js/sviewer.js', 'js/embed.js', 'static/js/i18n.js'],
        languageOptions: {
            ecmaVersion: 2017,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                '$': 'readonly',
                'jQuery': 'readonly',
                'Mustache': 'readonly',
                'ol': 'readonly',
                'bootstrap': 'readonly',
                'QRCode': 'readonly',
                'SViewer': 'writable',
                'customConfig': 'readonly',
                'SViewerHardConfig': 'writable',
                'SViewerConfig': 'readonly',
                'SViewerState': 'writable',
                'SViewerTemplates': 'writable',
                'SViewerAdapters': 'writable',
                'log': 'readonly',
                'parseISOMetadata': 'readonly',
                'buildISOTable': 'readonly',
                'XPathResult': 'readonly',
            }
        },
        plugins: { security },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['warn', { vars: 'all', args: 'none', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
            'no-redeclare': 'off',
            'no-undef': 'error',
            'eqeqeq': ['warn', 'always', { null: 'ignore' }],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-proto': 'error',
            'no-extend-native': 'error',
            'no-global-assign': 'error',
            'no-loss-of-precision': 'off',
            'complexity': ['warn', { max: 20 }],
            'security/detect-eval-with-expression': 'error',
            'security/detect-object-injection': 'off',
            'security/detect-non-literal-regexp': 'warn'
        }
    },
    {
        // Extensions — ES2017, relaxed (third-party authors, modern browsers only)
        files: ['ext/**/*.js'],
        languageOptions: {
            ecmaVersion: 2017,
            globals: {
                ...globals.browser,
                '$': 'readonly',
                'SViewer': 'readonly'
            }
        },
        rules: {
            'no-var': 'off',
            'eqeqeq': ['warn', 'always', { null: 'ignore' }],
            'no-eval': 'error'
        }
    }
];
