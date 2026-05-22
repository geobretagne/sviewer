const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'superset-plugin-chart-sviewer.js',
    library: {
      type: 'umd',
      name: 'SupersetPluginChartSviewer',
    },
    globalObject: 'window',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
          },
        },
      },
    ],
  },
  externals: [
    function({ request }, callback) {
      const map = {
        'react': '__superset__/react',
        'react-dom': '__superset__/react-dom',
        '@superset-ui/core': '__superset__/@superset-ui/core',
        '@superset-ui/chart-controls': '__superset__/@superset-ui/chart-controls',
      };
      if (map[request]) {
        return callback(null, `root window['${map[request]}']`);
      }
      callback();
    },
  ],
};
