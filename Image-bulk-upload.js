import fetch from 'node-fetch';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Shopify API credentials
const SHOPIFY_ADMIN_API_URL = 'https://shivu-apps-testing.myshopify.com/admin/api/2025-01/graphql.json';
const ADMIN_API_ACCESS_TOKEN = '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';

// Load CSV file
const csvFilePath = './images.csv';
const csvContent = fs.readFileSync(csvFilePath);
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// GraphQL mutation to upload files
const fileCreateMutation = `
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      id
      alt
      fileStatus
      preview {
        image {
          url
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

// GraphQL query to check file status
const fileStatusQuery = `
query getFile($id: ID!) {
  node(id: $id) {
    ... on MediaImage {
      id
      fileStatus
      alt
      preview {
        image {
          url
        }
      }
    }
  }
}
`;

// Call Shopify API
async function shopifyRequest(query, variables) {
  const res = await fetch(SHOPIFY_ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_API_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

// Poll for file status until READY
async function waitForFileReady(fileId, maxAttempts = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Checking file status (attempt ${attempt}/${maxAttempts})...`);
    
    const data = await shopifyRequest(fileStatusQuery, { id: fileId });
    

    
    if (!data.data || !data.data.node) {
      console.error(`❌ Failed to retrieve file status for ID: ${fileId}`);
      return null;
    }
    
    const file = data.data.node;
    console.log(`📊 File status: ${file.fileStatus}`);
    
    if (file.fileStatus === 'READY') {
      if (file.preview && file.preview.image && file.preview.image.url) {
        return file.preview.image.url;
      } else {
        console.warn(`⚠️ File is READY but no preview image available`);
        return null;
      }
    } else if (file.fileStatus === 'FAILED') {
      console.error(`❌ File processing failed for ID: ${fileId}`);
      return null;
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting ${delayMs}ms before next check...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error(`❌ File not ready after ${maxAttempts} attempts`);
  return null;
}

// Upload one file
async function uploadFile(url, altText) {
  const variables = {
    files: [
      {
        alt: altText,
        contentType: "IMAGE",
        originalSource: url
      }
    ]
  };

  const data = await shopifyRequest(fileCreateMutation, variables);

  if (!data.data) {
    console.error("❌ Shopify API error:", JSON.stringify(data, null, 2));
    return;
  }

  const errors = data.data.fileCreate?.userErrors || [];
  if (errors.length) {
    console.error(`❌ Error for ${url}:`, errors);
    return;
  }

  // Check if files array exists and has content
  const files = data.data.fileCreate?.files;
  if (!files || files.length === 0) {
    console.error(`❌ No files returned for ${url}`);
    return;
  }

  const file = files[0];
  console.log(`📁 File uploaded successfully. ID: ${file.id}, Status: ${file.fileStatus}`);

  // If file is already READY, check for immediate preview
  if (file.fileStatus === 'READY' && file.preview && file.preview.image && file.preview.image.url) {
    console.log(`✅ Immediate preview available: ${file.preview.image.url}`);
    return file.preview.image.url;
  }

  // If not ready, wait for processing
  console.log(`⏳ File is processing, waiting for READY status...`);
  const previewUrl = await waitForFileReady(file.id);
  
  if (previewUrl) {
    console.log(`✅ Final upload success: ${previewUrl}`);
    return previewUrl;
  } else {
    console.error(`❌ Failed to get preview URL for ${url}`);
    return null;
  }
}

// Main loop
async function bulkUploadFromCSV() {
  for (const record of records) {
    const { url, altText } = record;
    await uploadFile(url, altText);
  }
}

bulkUploadFromCSV().catch(console.error);
