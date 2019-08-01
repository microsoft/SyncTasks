const path = require('path');
const ROOT_PATH = path.resolve(__dirname, '..', '..');
const TEST_PATH = path.resolve(ROOT_PATH, 'test');

module.exports = {
    devtool: 'cheap-eval-source-map',
    entry: path.resolve(TEST_PATH, 'SyncTasksTests.ts'),

    output: {
        filename: './SyncTasksTestsPack.js',
        path: path.resolve(ROOT_PATH, 'dist-test'),
    },

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [{
            test: /\.ts?$/,
            loader: 'awesome-typescript-loader',
            exclude: /node_modules/,
            options: {
               configFileName: path.resolve(TEST_PATH, 'support', 'tsconfig.json'),
            }
        }]
    }
};
