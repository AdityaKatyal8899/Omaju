/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://omaju-onboarding.onrender.com',
  generateRobotsTxt: false, // keep our custom public/robots.txt
  // Exclude everything by default; we'll add /onboarding via additionalPaths
  exclude: ['/((?!onboarding).*)'],
  additionalPaths: async (config) => {
    return [
      await config.transform(config, '/onboarding'),
    ]
  },
}
