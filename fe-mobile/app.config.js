module.exports = ({ config }) => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || config?.extra?.apiBaseUrl;
  const aiServiceUrl = process.env.EXPO_PUBLIC_AI_SERVICE_URL || config?.extra?.aiServiceUrl;

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      apiBaseUrl,
      aiServiceUrl,
    },
  };
};
