import { Helmet } from 'react-helmet-async';

// Per-page SEO: sets a descriptive <title> and meta/OG description so each route
// is independently shareable and indexable.
export default function Seo({ title, description }) {
  const fullTitle = title ? `${title} · InLink` : 'InLink — Connect with your professional world';
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
}
