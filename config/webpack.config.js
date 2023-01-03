const path = require("path");
const ESLintWebpackPlugin = require("eslint-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserWebpackPlugin = require("terser-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { DefinePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

// element-plus 按需引入插件
const AutoImport = require("unplugin-auto-import/webpack");
const Components = require("unplugin-vue-components/webpack");
const { ElementPlusResolver } = require("unplugin-vue-components/resolvers");


// 需要通过 cross-env 定义环境变量
const isProduction = process.env.NODE_ENV === "production";

const publicCssLoaders = () => {
  return [
    isProduction ? MiniCssExtractPlugin.loader : "vue-style-loader", 
    "css-loader",
    {
        loader: "postcss-loader",
        options: {
            postcssOptions: {
                plugins: [
                    // 能解决大多数样式兼容性问题
                    "postcss-preset-env",
                ],
            },
        },
    },
  ];
};

module.exports = {
    entry: "./src/main.js",
    output: {
        path: isProduction ? path.resolve(__dirname, "../dist") : undefined,
        filename: isProduction ? "static/js/[name].[contenthash:10].js" : "static/js/[name].js",
        chunkFilename: isProduction ? "static/js/[name].[contenthash:10].chunk.js" : "static/js/[name].chunk.js",
        assetModuleFilename: "static/js/[hash:10][ext][query]",
        clean: true,
    },
    module: {
        rules: [
            // 处理css
            {
                test: /\.css$/,
                use: [...publicCssLoaders()],
            },
            {
                test: /\.less$/,
                use: [
                    ...publicCssLoaders(),
                    "less-loader",
                ],
            },
            {
                test: /\.s[ac]ss$/,
                use: [
                    ...publicCssLoaders(),
                    {
                        loader: "sass-loader",
                        options: {
                            // 自定义主题：自动引入我们定义的scss文件
                            additionalData: `@use "@/styles/element/index.scss" as *;`,
                        },
                    },
                ],
            },
            {
                test: /\.styl$/,
                use: [
                    ...publicCssLoaders(),
                    'stylus-loader',
                ],
            },
            // 处理图片
            {
                test: /\.(png|jpe?g|gif|svg)$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 10 * 1024, // 小于10kb的图片会被base64处理
                    },
                },
            },
            // 其他资源
            {
                test: /\.(ttf|woff2?)$/,
                type: "asset/resource",
            },
            // 处理js
            {
                test: /\.(jsx|js)$/,
                include: path.resolve(__dirname, "../src"),
                loader: "babel-loader",
                options: {
                    cacheDirectory: true,
                    cacheCompression: false,
                    plugins: [
                        // "@babel/plugin-transform-runtime", // presets中包含了
                    ],
                },
            },
            // vue-loader不支持oneOf
            {
                test: /\.vue$/,
                // 内部会给vue文件注入HMR功能代码
                loader: "vue-loader",
                options: {
                    // 开启缓存
                    cacheDirectory: path.resolve(__dirname, "node_modules/.cache/vue-loader")
                },
            },
        ],
    },
    plugins: [
        new ESLintWebpackPlugin({
            context: path.resolve(__dirname, "../src"),
            exclude: "node_modules",
            cache: true,
            cacheLocation: path.resolve(
                __dirname,
                "../node_modules/.cache/.eslintcache"
            ),
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "../public/index.html"),
        }),
        isProduction &&
            new MiniCssExtractPlugin({
                filename: "static/css/[name].[contenthash:10].css",
                chunkFilename: "static/css/[name].[contenthash:10].chunk.css",
            }),
        // 将public下面的资源复制到dist目录去（除了index.html）
        isProduction &&
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, "../public"),
                        to: path.resolve(__dirname, "../dist"),
                        toType: "dir",
                        noErrorOnMissing: true, // 不生成错误
                        globOptions: {
                            // 忽略文件
                            ignore: ["**/index.html"],
                        },
                        info: {
                            // 跳过terser压缩js
                            minimized: true,
                        },
                    },
                ],
            }),
        new VueLoaderPlugin(),
        new DefinePlugin({
          __VUE_OPTIONS_API__: "true",
          __VUE_PROD_DEVTOOLS__: "false",
        }),
        // 按需加载element-plus组件样式
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        Components({
            resolvers: [
                ElementPlusResolver({
                    importStyle: "sass", // 自定义主题
                }),
            ],
        }),
    ].filter(Boolean),
    optimization: {
        minimize: isProduction,
        // 压缩的操作
        minimizer: [
            // 压缩css
            new CssMinimizerPlugin(),
            // 压缩js
            new TerserWebpackPlugin(),
            // 压缩图片
            new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.imageminGenerate,
                    options: {
                        plugins: [
                            ["gifsicle", { interlaced: true }],
                            ["jpegtran", { progressive: true }],
                            ["optipng", { optimizationLevel: 5 }],
                            [
                                "svgo",
                                {
                                    plugins: [
                                        "preset-default",
                                        "prefixIds",
                                        {
                                            name: "sortAttrs",
                                            params: {
                                                xmlnsOrder: "alphabetical",
                                            },
                                        },
                                    ],
                                },
                            ],
                        ],
                    },
                },
            }),
        ],
        // 代码分割配置
        splitChunks: {
            chunks: "all",
            // 其他一般都用默认值
            cacheGroups: {
                // layouts通常是admin项目的主体布局组件，所有路由组件都要使用的
                // 可以单独打包，从而复用
                // 如果项目中没有，请删除
                layouts: {
                    name: "layouts",
                    test: path.resolve(__dirname, "../src/layouts"),
                    priority: 40,
                },
                // 如果项目中使用element-plus，此时将所有node_modules打包在一起，那么打包输出文件会比较大。
                // 所以我们将node_modules中比较大的模块单独打包，从而并行加载速度更好
                // 如果项目中没有，请删除
                elementUI: {
                    name: "chunk-elementPlus",
                    test: /[\\/]node_modules[\\/]_?element-plus(.*)/,
                    priority: 30,
                },
                // 将vue相关的库单独打包，减少node_modules的chunk体积。
                vue: {
                    name: "vue",
                    test: /[\\/]node_modules[\\/]vue(.*)?[\\/]/,
                    chunks: "initial",
                    priority: 20,
                },
                libs: {
                    name: "chunk-libs",
                    test: /[\\/]node_modules[\\/]/,
                    // 权重最低，优先考虑前面内容
                    priority: 10, 
                    chunks: "initial",
                },
            },
        },
        runtimeChunk: {
            name: (entrypoint) => `runtime~${entrypoint.name}`,
        },
    },
    resolve: {
        extensions: [".jsx", ".vue", ".js", ".json"],
        alias: {
            // 路径别名
            "@": path.resolve(__dirname, "../src"),
        },
    },
    devServer: {
        open: true,
        host: "localhost",
        port: 3000,
        hot: true,
        compress: true,
        historyApiFallback: true,
    },
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "source-map" : "cheap-module-source-map",
    performance: false,
};