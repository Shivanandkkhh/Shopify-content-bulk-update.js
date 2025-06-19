const fs = require('fs');
const csv = require('csv-parser');

const SHOPIFY_STORE = 'ShopURL.myshopify.com';
const ACCESS_TOKEN = 'shpat_111111111111111111';

const results = [];

function updateMetaDescription(articleId, description) {
  return fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/articles/${articleId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({
      article: {
        id: articleId,
        metafields: [
          {
            namespace: 'global',
            key: 'description_tag',
            type: 'single_line_text_field',
            value: description,
          },
        ],
      },
    }),
  });
}

fs.createReadStream('article.csv')
  .pipe(csv({ strict: false }))
  .on('data', (data) => {
    const keys = Object.keys(data);
    const articleId = data[keys[0]].trim();
    const description = keys.slice(1).map(k => data[k]).join(',').trim(); // Re-join all parts of the broken description
    results.push({ id: articleId, description });
  })
  .on('end', async () => {
    for (const item of results) {
      const { id: articleId, description } = item;

      try {
        const response = await updateMetaDescription(articleId, description);
        const json = await response.json();

        if (response.ok) {
          console.log(`✅ Updated article ${articleId}`);
        } else {
          console.error(`❌ Failed to update ${articleId}:`, JSON.stringify(json));
        }
      } catch (err) {
        console.error(`❌ Error updating article ${articleId}:`, err.message);
      }
    }
  });
