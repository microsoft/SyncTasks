const path = require('path');

module.exports = {
    devtool: 'cheap-eval-source-map',
    mode: 'development',

    entry: './src/tests/SyncTasksTests.ts',
    output: {
        filename: './SyncTasksTestsPack.js',
        path: path.resolve(__dirname, 'dist-test'),
    },

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: 'awesome-typescript-loader',
            exclude: /node_modules/,
        }]
    }
};
