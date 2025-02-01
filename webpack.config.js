const path = require('path');
// const TerserPlugin = require("terser-webpack-plugin");

const config = {
  target: 'web',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.wgsl$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-shader-loader"
        }
      },
      {
        test: /\.(glsl|vs|fs)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-shader-loader"
        }
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.vs', '.fs', '.glsl', '.wgsl'],
  },
};

const d_config = Object.assign({}, config, {
  mode: 'production',
  entry: './src/webgl-static.ts',
  output: {
    path: path.resolve(__dirname, 'dist/release'),
    filename: 'gl2gpu.js',
    library: {
      name: "GL2GPU",
      type: "umd",
      umdNamedDefine: true
    }
  },
  optimization: {
    minimize: false,
  },
});

module.exports = [
  d_config
];