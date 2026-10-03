module.exports = function override(config) {
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /react-datepicker[\\/]dist[\\/]index\.es\.js$/,
      message: /Critical dependency: the request of a dependency is an expression/
    }
  ];

  return config;
};
