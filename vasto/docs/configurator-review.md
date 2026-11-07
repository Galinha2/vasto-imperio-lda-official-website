# Configurator and proposal review — 2026-11-07

## Implemented

- All three storage configurators compare requested length per row with effective calculated length, signed difference, installation-clearance note and original request in quote/cart details.
- Invalid, zero, negative and above-30 m lengths block the action. Repeated-row input accepts 1–100 and states that limit.
- VAT-inclusive estimate alongside the existing net estimate. The illustration uses 23% for mainland Portugal and explicitly leaves final taxation subject to confirmation. Reference: Portuguese Tax Authority, CIVA article 18, https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva18.aspx . This is not automatic regional tax determination.
- Expandable explanation of evenly distributed load, per-shelf/beam-pair capacity, concentrated loads, overall stability and technical validation.
- Local PDF export for each configuration and the combined cart. Contains drawing, requested/effective dimensions, components/quantities, net and gross estimate, conditions and an informational configuration fingerprint. Does not reserve an official quote number or make a network request to create an order.
- Actions now use add-to-request and proposal wording, including the final submission disclaimer. Existing cart/current-configuration merge behavior is preserved.
- General quote form has installation location and assembly choice, sent in the message. Existing photo/PDF attachments remain; client and server agree on 3 files and a 3 MB aggregate limit, below the existing hosting request limit.
- NP 1116 certification wording is retained for lockers in both languages, as explicitly confirmed by the company representative.
- Permanent redirects from the three Portuguese product duplicates to their existing landing pages. Canonicals and reciprocal PT/EN alternates use those destinations. Sitemap regenerated without redirected duplicates.
- Product JSON-LD uses actual page descriptions and images, without fabricated prices, ratings or availability.

## Local validation

- 23 automated tests: dimension differences, tax rounding, reference stability, SEO mappings, existing cart merge, pallet fit, shelf/brace separation and shared rack levels/model.
- Chrome at 1440 and 390 px: all three configurators; 30 m, 100 rows, maximum available heights/depths/levels, invalid lengths, PDF downloads, cart and combined proposal. No page errors or horizontal overflow in these flows.
- Chrome: module-specific level removal, 3D switch, PDF export while 3D is active and minimum available dimensions in all three families.
- Downloaded PDFs parsed to verify drawings, references, dimensions, components and conditions. Combined-cart PDF tested separately.
- General form: photo attachment and aggregate-size rejection; mock submission checked installation/assembly/photo payload. No real email sent.
- Redirect status/destination, canonical/hreflang links, JSON-LD parsing and sitemap checked locally.

## Requires separate verification

- Real Google indexation/Search Console and live deployment behavior.
- Manufacturer certification documents and configuration-specific technical approval.
- Real email delivery, regional/final taxation and legal/consent operational compliance were not certified by these code/browser checks.
