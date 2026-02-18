import { memo } from 'react';
import { legacyMakeStyles } from '../../helpers/mui.ts';
import { styles } from './styles.ts';
import { useTranslation } from 'react-i18next';
import IconGithub from '../../images/socials/github.svg?react';
import IconTelegram from '../../images/socials/telegram.svg?react';
import IconDiscord from '../../images/socials/discord.svg?react';
import IconTwitter from '../../images/socials/twitter.svg?react';
import IconReddit from '../../images/socials/reddit.svg?react';
import IconDebank from '../../images/socials/debank.svg?react';
import { ExternalLink } from '../Links/ExternalLink.tsx';

// Re-using header translations, allowing overwrite with footer specific ones
const navLinks = [
  {
    title: ['Footer-Proposals', 'Header-Proposals'],
    path: 'https://vote.loin.finance',
  },
  {
    title: ['Footer-News', 'Header-News'],
    path: 'https://loin.com/articles/',
  },
  {
    title: ['Footer-Docs', 'Header-Docs'],
    path: 'https://docs.loin.finance',
  },
  {
    title: 'Footer-Audit',
    path: 'https://github.com/loinfinance/beefy-audits',
  },
  {
    title: 'Footer-MediaKit',
    path: 'https://loin.com/media-kit/',
  },
  {
    title: 'Footer-Partners',
    path: 'https://loin.com/partners/',
  },
];

const socialLinks = [
  {
    title: 'GitHub',
    path: 'https://github.com/loinfinance',
    Icon: IconGithub,
  },
  {
    title: 'Telegram',
    path: 'https://t.me/loinfinance',
    Icon: IconTelegram,
  },
  {
    title: 'Discord',
    path: 'https://loin.finance/discord',
    Icon: IconDiscord,
  },
  {
    title: 'Twitter',
    path: 'https://x.com/loinfinance',
    Icon: IconTwitter,
  },
  {
    title: 'Reddit',
    path: 'https://www.reddit.com/r/Loin/',
    Icon: IconReddit,
  },
  {
    title: 'Debank',
    path: 'https://debank.com/official/Loin',
    Icon: IconDebank,
  },
];

const useStyles = legacyMakeStyles(styles);

export const Footer = memo(function Footer() {
  const classes = useStyles();
  const { t } = useTranslation();

  return (
    <div className={classes.footer}>
      <ul className={classes.nav}>
        {navLinks.map(({ title, path }) => (
          <li key={path} className={classes.navItem}>
            <ExternalLink href={path} className={classes.navLink}>
              {t(title)}
            </ExternalLink>
          </li>
        ))}
      </ul>
      <ul className={classes.nav}>
        {socialLinks.map(({ title, path, Icon }) => (
          <li key={path} className={classes.navItem}>
            <ExternalLink href={path} className={classes.navLink} title={t(title)}>
              <Icon />
            </ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
});
