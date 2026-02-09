# Financial Articles Web App

## Folder Structure

```
articles-app/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── app.js             # Application logic
├── sample-data/       # Sample data for testing
│   ├── index.json     # Articles index
│   ├── art-001.json   # Sample article 1
│   └── art-002.json   # Sample article 2
└── README.md          # This file
```

## Features

- ✅ Fetches articles from Google Cloud Storage
- ✅ Displays articles sorted by date (newest first)
- ✅ Category filtering
- ✅ Click to view full article
- ✅ Loading and error states
- ✅ Responsive design
- ✅ No external dependencies
- ✅ XSS protection
- ✅ Production-ready code

## Configuration

Edit `app.js` to configure your GCS bucket:

```javascript
const CONFIG = {
    bucketUrl: 'https://storage.googleapis.com/YOUR-BUCKET-NAME/',
    useSampleData: false  // Set to false for production
};
```

## Local Testing

1. Open `index.html` in a browser
2. The app uses sample data by default (`useSampleData: true`)
3. Sample data is in the `sample-data/` folder

## GCS Setup

### 1. Create Bucket
```bash
gsutil mb gs://finance-articles-bucket
```

### 2. Make Bucket Public
```bash
gsutil iam ch allUsers:objectViewer gs://finance-articles-bucket
```

### 3. Enable CORS
Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://finance-articles-bucket
```

### 4. Upload Files
```bash
# Upload index
gsutil cp index.json gs://finance-articles-bucket/

# Upload articles
gsutil cp articles/*.json gs://finance-articles-bucket/articles/
```

## Data Structure

### index.json
```json
{
  "articles": [
    {
      "id": "art-001",
      "title": "Article Title",
      "category": "Investment",
      "publishedAt": "2026-02-08T10:30:00Z",
      "filePath": "articles/art-001.json",
      "author": "Author Name",
      "excerpt": "Brief description"
    }
  ]
}
```

### Article JSON
```json
{
  "id": "art-001",
  "title": "Article Title",
  "category": "Investment",
  "author": "Author Name",
  "publishedAt": "2026-02-08T10:30:00Z",
  "readTime": "8 min read",
  "tags": ["tag1", "tag2"],
  "content": [
    {
      "type": "paragraph",
      "text": "Content here..."
    },
    {
      "type": "heading",
      "text": "Section Title"
    },
    {
      "type": "list",
      "items": ["Item 1", "Item 2"]
    },
    {
      "type": "quote",
      "text": "Quote text",
      "author": "Quote author"
    }
  ]
}
```

## Content Block Types

- **paragraph**: Regular text
- **heading**: Section heading
- **list**: Bulleted list
- **quote**: Blockquote with optional author

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest

## Performance

- Lazy loading of article content
- Minimal DOM manipulation
- Efficient state management
- No external dependencies

## Security

- XSS protection via HTML escaping
- CORS-enabled GCS bucket
- No eval() or innerHTML with user data
