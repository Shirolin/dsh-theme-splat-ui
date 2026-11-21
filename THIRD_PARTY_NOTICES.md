# Third-party notices

## Nunito

The client bundle embeds Nunito Latin WOFF2 files (weights 400–900) from
[`@fontsource/nunito`](https://fontsource.org/fonts/nunito) 5.2.7.

Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito).

Nunito is licensed under the SIL Open Font License, Version 1.1. The full
license text is included at [`licenses/Nunito-OFL.txt`](licenses/Nunito-OFL.txt).

## Splatoon

Splatoon and Splatoon 2 are trademarks of Nintendo. This project is an
unofficial, non-commercial fan theme. It is not affiliated with, endorsed by,
or sponsored by Nintendo.

The sidebar squid sticker (`brand-squid-pink.svg`), boot badge (`boot-squid.svg`),
squid/octopus vector silhouettes (`squid-solid.svg`, `squid-outline.svg`,
`octo-solid.svg`, `octo-outline.svg`), background patterns (`squid-pattern*.svg`,
`arena-bands.svg`), watermark (`squid-watermark.svg`), barcode sticker
(`sticker-barcode.svg`), website squids, and package icon (`assets/icon-256.png`)
are original project vector artwork covered by this repository's MIT license.
The earlier Nintendo raster placeholder (`brand-squid-official.png`) has been
removed.

`src/client/assets/inkopolis-square.png` is generated monochrome fan artwork created
with the built-in image generation tool using a user-supplied *Splatoon 2*
Inkopolis Square screenshot as a reference, and quantized to a `2172×724`
16-color indexed transparent PNG (`~72 KB`). The raw reference screenshot
(`inkopolis-square-reference.png`) and intermediate generation drafts have been
excluded from the repository. The reference screenshot's original creator,
acquisition URL, and redistribution permission were not recorded, and the
artwork depicts *Splatoon 2* plaza silhouettes.

Accordingly, **`src/client/assets/inkopolis-square.png` is NOT covered by this
repository's MIT license**; it is included solely as unofficial, non-commercial
fan-theme artwork. The MIT license applies only to original project code and
original project assets, and does not grant rights to Nintendo trademarks, visual
designs, or third-party material.
## Validation tooling and static component catalogue

The runtime extractor, fixture runner, compatibility and coverage checks,
local installer, release verifier and catalogue shell are adapted from
Shirolin's `dsh-theme-animal-island-ui` project (MIT).
The generated catalogue includes CSS extracted from DeepSeek Harness
0.2.2-rc.1 packages, whose package metadata declares MIT.
These files are prefixed with source notices.
Nunito embedded by the catalogue remains covered by the OFL notice above.
