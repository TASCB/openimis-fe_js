// const webpack = require("webpack");

// module.exports = {
//   webpack: {
//     configure: (webpackConfig) => {
//       // Set publicPath to serve assets under /front/
//       webpackConfig.output.publicPath = "/front/";

//       // Inject environment variables explicitly
//       webpackConfig.plugins.push(
//         new webpack.DefinePlugin({
//           "process.env.REACT_APP_API_URL": JSON.stringify(
//             process.env.REACT_APP_API_URL || "/api"
//           ),
//           "process.env.PUBLIC_URL": JSON.stringify(
//             process.env.PUBLIC_URL || "/front"
//           ),
//           "process.env.OPENIMIS_CONF_JSON": JSON.stringify(
//             process.env.OPENIMIS_CONF_JSON || ""
//           ),
//           "process.env.NODE_ENV": JSON.stringify(
//             process.env.NODE_ENV || "development"
//           ),
//         })
//       );

//       return webpackConfig;
//     },
//   },
//   devServer: {
//   },
// };

const webpack = require("webpack");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // --- your existing settings ---

      // Serve assets under /front/
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

      // --- NEW: silence noisy source-map-loader warnings ---

      const addSourceMapExcludes = (rules) => {
        if (!rules) return;

        rules.forEach((rule) => {
          if (!rule) return;

          // Drill into nested oneOf rules (CRA style)
          if (rule.oneOf) {
            addSourceMapExcludes(rule.oneOf);
            return;
          }

          // Look for the source-map-loader rule
          const usesSourceMapLoader =
            rule.enforce === "pre" &&
            rule.use &&
            rule.use.some((u) => {
              const loader = typeof u === "string" ? u : u.loader;
              return loader && loader.includes("source-map-loader");
            });

          if (usesSourceMapLoader) {
            rule.exclude = rule.exclude || [];

            rule.exclude.push(
              /[\\/]node_modules[\\/]@formatjs[\\/]fast-memoize[\\/]/,
              /[\\/]node_modules[\\/]react-double-scrollbar[\\/]/
            );
          }
        });
      };

      if (webpackConfig.module && webpackConfig.module.rules) {
        addSourceMapExcludes(webpackConfig.module.rules);
      }

      return webpackConfig;
    },
  },
  devServer: {
    // keep empty / as is – your existing config
  },
};
