# assets

`MPLUS1-800-subset.ttf` is the face drawn into the Open Graph card
(`src/app/[locale]/opengraph-image.tsx`). It is the same display face the site
uses for its headings, cut down to the characters the card actually shows.

Any character missing from it silently falls back to a different face, so when
the card's copy changes, rebuild the subset:

```sh
curl -sL -o /tmp/MPLUS1[wght].ttf \
  "https://github.com/google/fonts/raw/main/ofl/mplus1/MPLUS1[wght].ttf"

fonttools varLib.instancer /tmp/MPLUS1[wght].ttf wght=800 -o /tmp/MPLUS1-800.ttf

pyftsubset /tmp/MPLUS1-800.ttf \
  --text="Galopen もう会議に遅れない。Never be late to a meeting." \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2010-2027,U+3000-303F,U+30FB" \
  --output-file=assets/MPLUS1-800-subset.ttf \
  --no-hinting --desubroutinize --layout-features=''
```
