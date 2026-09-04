# Catalog import verification

- Source file: `products_from_scale.json`
- Imported products: 217
- Imported categories: 9
- Weight variants per product: 4 (`100g`, `250g`, `500g`, `1kg`)
- Database verification: 217 products, 9 categories, 217 products containing all four size keys.
- Price policy: the source `price` field is treated as the 1kg price; 100g/250g/500g are calculated at 1/10, 1/4, and 1/2 of the source price.
- Stock policy: the source file does not contain inventory counts, so the imported catalog uses 100 demo units per product to keep the storefront and checkout flow testable. Replace these values with actual stock counts before launch.
- Image policy: each category receives a pair of reusable, category-matched Unsplash image URLs stored in the product `imageUrl` and `gallery` fields.
- Import safety: the importer stops if the products table is already populated, preventing duplicate catalog entries.

Validation commands completed after catalog import:

- `pnpm check`
- `pnpm test`
- `pnpm build`
- Database count query through the project database connection
- Desktop full-page preview of the populated storefront

Interactive browser verification completed after import: the public catalog API returned imported rows; the storefront rendered `217 قطعة في المجموعة`; the first product detail opened successfully; the modal exposed `100غ`, `250غ`, `500غ`, and `1 كيلو`; selecting `500غ` and adding to cart preserved the `500غ` label and calculated `62.50 LYD` price in the cart.

The source JSON is also bundled at `data/products_from_scale.json`, and the reusable command is `pnpm catalog:import` (the importer intentionally stops when products already exist to prevent duplicates).

Final correction verification: database samples now treat the source as 1kg (for example, فاصوليا = 12.50 LYD/kg, 6.25 LYD/500g, 3.13 LYD/250g, 1.25 LYD/100g). The storefront renders corrected 100g prices, products are purchasable with demo stock, and interactive browser testing confirmed selecting 500g at 6.25 LYD and preserving the 500g label in the cart.

Customer-account update smoke test: the live storefront rendered 217 items with corrected 100g prices, nine category filter buttons, account/login control, cart count, and theme toggle. Selecting CATEGORY 04 successfully activated the category filter while preserving the storefront. The supplied account update added protected order details, favorites loading/synchronization/removal, and expandable order history; these changes passed TypeScript, Vitest, and production build validation after two Set-iteration compatibility fixes.
