const webpack = require("webpack");

const excludeBrokenSourceMaps = [
  /node_modules[\\/]@formatjs[\\/]fast-memoize[\\/]/,
  /node_modules[\\/]react-double-scrollbar[\\/]/,
];

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Set publicPath to serve assets under /front/
      webpackConfig.output.publicPath = "/front/";

      // Inject environment variables explicitly
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          "process.env.REACT_APP_API_URL": JSON.stringify(
            process.env.REACT_APP_API_URL || "/api"
          ),
          "process.env.PUBLIC_URL": JSON.stringify(
            process.env.PUBLIC_URL || "/front"
          ),
          "process.env.OPENIMIS_CONF_JSON": JSON.stringify(
            process.env.OPENIMIS_CONF_JSON || ""
          ),
          "process.env.NODE_ENV": JSON.stringify(
            process.env.NODE_ENV || "development"
          ),
        })
      );

      webpackConfig.module.rules.forEach((rule) => {
        if (!Array.isArray(rule.oneOf)) return;

        rule.oneOf.forEach((oneOfRule) => {
          if (oneOfRule.enforce !== "pre") return;
          if (!String(oneOfRule.test).includes("js|mjs|jsx|ts|tsx")) return;

          const currentExclude = oneOfRule.exclude;
          oneOfRule.exclude = Array.isArray(currentExclude)
            ? [...currentExclude, ...excludeBrokenSourceMaps]
            : currentExclude
              ? [currentExclude, ...excludeBrokenSourceMaps]
              : excludeBrokenSourceMaps;
        });
      });

      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        (warning) => {
          const message = warning?.message || "";
          return message.includes("@formatjs/fast-memoize/index.ts")
            || message.includes("react-double-scrollbar/dist/DoubleScrollbar.js.map");
        },
      ];

      return webpackConfig;
    },
  },
  devServer: {
  },
};
