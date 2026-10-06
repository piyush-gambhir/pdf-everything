# Bundled fonts

Installed into both worker images as system fonts, so a document that names
`font-family: Manrope` renders in Manrope even when it does not embed the face.

`manrope/`: Manrope, variable weight 200 to 800, licensed under the SIL Open
Font License 1.1 (`manrope/OFL.txt`). The six files are the unicode-range
subsets published as `@fontsource-variable/manrope` 5.3.0 (latin, latin-ext,
cyrillic, cyrillic-ext, greek, vietnamese), converted from WOFF2 to TrueType
with fontTools, with the typographic family name (name ID 16) set to `Manrope`
so fontconfig lists them as one family.

CJK and emoji coverage comes from Alpine's `font-noto-cjk` and
`font-noto-emoji` packages; FreeFont (`ttf-freefont`) remains the default
serif and sans fallback.
