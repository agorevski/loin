import type { GatsbyConfig } from 'gatsby';
import { createCloudRedirectsAdapter } from './adapter-cloud-redirects';

const config: GatsbyConfig = {
  trailingSlash: 'always',
  siteMetadata: {
    title: 'Loin',
    titleTemplate: '{title} - Loin',
    siteUrl: 'https://loin.com',
    description:
      'Loin is a Decentralized, Multichain Yield Optimizer that trims the fat from DeFi yield farming. Near-zero fees, maximum returns.',
    twitterUsername: '@loinfinance',
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  adapter: createCloudRedirectsAdapter(),
  plugins: [
    'gatsby-plugin-emotion',
    'gatsby-plugin-image',
    'gatsby-plugin-sitemap',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'Loin',
        short_name: 'Loin',
        start_url: '/',
        background_color: '#121420',
        theme_color: '#121420',
        icon: 'src/images/icon.png',
      },
    },
    'gatsby-plugin-sharp',
    `gatsby-transformer-json`,
    'gatsby-transformer-sharp',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'images',
        path: './src/images/',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'pages',
        path: './src/pages/',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'jsonContent',
        path: './src/content/json/',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'blogContent',
        path: './src/content/blog/',
      },
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 720,
            },
          },
          {
            resolve: 'remark-video',
            options: {
              autoplay: true,
              muted: true,
              playsinline: true,
              loop: true,
            },
          },
          {
            resolve: 'gatsby-remark-copy-linked-files',
          },
        ],
      },
    },
  ],
};

export default config;
