const fs = require('fs');
const csv = require('csv-parser');

const SHOPIFY_STORE = 'SHopURL.myshopify.com';
const ACCESS_TOKEN = 'shpat_111111111111111111';

const results = [];

function updateMetaTitle(articleId, metaTitle) {
  return fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/articles/${articleId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({
      article: {
        id: articleId,
        title: metaTitle,
      },
    }),
  });
}

fs.createReadStream('article.csv')
  .pipe(csv())
  .on('data', (data) => {
    const articleId = data['id']?.trim();
    const metaTitle = data['metaTitle']?.trim();
    if (articleId && metaTitle) {
      results.push({ articleId, metaTitle });
    }
  })
  .on('end', async () => {
    for (const { articleId, metaTitle } of results) {
      try {
        const response = await updateMetaTitle(articleId, metaTitle);
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
