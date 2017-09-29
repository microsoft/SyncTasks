var path = require('path');
var webpack = require('webpack');

var webpackConfig = {
    entry: './src/tests/SyncTasksTests.ts',
    
    output: {
        filename: './SyncTasksTestsPack.js',
    },

    resolve: {
        modules: [
            path.resolve('./src'),
            path.resolve('./node_modules')
        ],
        extensions: ['.ts', '.js']
    },
    
    module: {
        loaders: [{
            // Compile TS.
            test: /\.tsx?$/, 
            exclude: /node_modules/,
            loader: 'awesome-typescript-loader',
        }]
    }  
};

module.exports = webpackConfig;
