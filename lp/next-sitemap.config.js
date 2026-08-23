/** @type {import('next-sitemap').IConfig} */
const siteUrl = "https://galopen.kkweb.io";

const locales = ["en", "ja"];
const defaultLocale = "en";

// 既定の言語は接頭辞なしが正。localePrefix: "as-needed" に合わせる。
// next-sitemap は Next のビルド出力をそのまま読むので、放っておくと /en を
// 載せる。/en は実体ではなく / へ 307 で飛ぶ URL なので、canonical と
// 食い違ったまま Google に渡ることになる
function splitLocale(url) {
  const matched = url.match(new RegExp(`^/(${locales.join("|")})(/.*)?$`));

  return matched
    ? { locale: matched[1], path: matched[2] || "" }
    : { locale: defaultLocale, path: url };
}

function pathFor(locale, path) {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  return `${prefix}${path}` || "/";
}

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  // 画像を返すルートで、ページではない
  exclude: ["/opengraph-image", "/*/opengraph-image"],
  transform: async (config, url) => {
    const { locale, path } = splitLocale(url);

    return {
      loc: pathFor(locale, path),
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: [
        ...locales.map((one) => ({
          href: `${siteUrl}${pathFor(one, path) === "/" ? "" : pathFor(one, path)}`,
          hreflang: one,
          hrefIsAbsolute: true,
        })),
        {
          href: `${siteUrl}${pathFor(defaultLocale, path) === "/" ? "" : pathFor(defaultLocale, path)}`,
          hreflang: "x-default",
          hrefIsAbsolute: true,
        },
      ],
    };
  },
};
