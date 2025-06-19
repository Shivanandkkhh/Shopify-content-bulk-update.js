const fs = require('fs');
const csv = require('csv-parser');

const SHOPIFY_STORE = 'shopURL.myshopify.com';
const ACCESS_TOKEN = 'shpat_111111111111111111';

const results = [];

function updateProductMeta(productId, metaTitle, metaDescription) {
  return fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/products/${productId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({
      product: {
        id: productId,
        metafields_global_title_tag: metaTitle,
        metafields_global_description_tag: metaDescription,
      },
    }),
  });
}

fs.createReadStream('products.csv')
  .pipe(csv())
  .on('data', (data) => {
    const productId = data['id']?.trim();
    const metaTitle = data['productMetaTitle']?.trim();
    const metaDescription = data['productMetaDescription']?.trim();

    if (productId && metaTitle && metaDescription) {
      results.push({ productId, metaTitle, metaDescription });
    }
  })
  .on('end', async () => {
    for (const { productId, metaTitle, metaDescription } of results) {
      try {
        const response = await updateProductMeta(productId, metaTitle, metaDescription);
        const json = await response.json();

        if (response.ok) {
          console.log(`✅ Updated product ${productId}`);
        } else {
          console.error(`❌ Failed to update ${productId}:`, JSON.stringify(json));
        }
      } catch (err) {
        console.error(`❌ Error updating ${productId}:`, err.message);
      }
    }
  });
