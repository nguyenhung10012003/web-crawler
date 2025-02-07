export const urlIsSitemap = (url: string) => {
  return /sitemap.*\.xml$/.test(url);
};
