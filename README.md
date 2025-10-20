# Singapore Property Intelligence API

Real-time property and demographic intelligence for lead targeting in Singapore. Combines BTO projects, resale transactions, and demographic data from Data.gov.sg to identify high-value prospects.

## 🎯 Use Cases

- **Identify new homeowners** - Target BTO buyers before move-in
- **Find recent movers** - Track resale transactions in real-time
- **Score areas for targeting** - Combine demographics + property data
- **Enrich HubSpot contacts** - Auto-populate contact records with area intelligence
- **Build target lists** - Generate lead lists based on spending power and property activity

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm run dev

# Server runs on http://localhost:3001
```

## 📊 Features

### 1. **BTO (Build-To-Order) Intelligence**
- Track upcoming BTO projects by quarter
- Identify completions in next 6 months
- Filter by town/area
- Estimate new homeowner leads

### 2. **Resale Transaction Tracking**
- Recent transactions (last 3-6 months)
- High-value property sales
- Hot areas by transaction volume
- Price range filtering

### 3. **Demographics & Spending Power**
- Age distribution by planning area
- Affluent population percentage (35-54 years)
- Working age population metrics
- Spending power scoring

### 4. **Lead Intelligence & Scoring**
- Score areas for targeting potential
- Identify "new mover" opportunities
- Find hot targets combining all data
- AI-powered recommendations

### 5. **HubSpot Integration**
- Auto-enrich contacts with area data
- Create target lists programmatically
- Webhook for real-time enrichment
- Custom property recommendations

## 📡 API Endpoints

### BTO Endpoints
```
GET  /api/bto/all
GET  /api/bto/upcoming?quarterStart=2024Q1&quarterEnd=2025Q4
GET  /api/bto/by-town/:town
GET  /api/bto/current-year
GET  /api/bto/next-6-months
```

### Resale Endpoints
```
GET  /api/resale/recent?months=3&town=TAMPINES
GET  /api/resale/by-town/:town
GET  /api/resale/high-value?minPrice=800000
GET  /api/resale/hot-areas?limit=10
GET  /api/resale/price-range?minPrice=500000&maxPrice=800000
```

### Demographics Endpoints
```
GET  /api/demographics/area/:area
GET  /api/demographics/affluent-areas?limit=10
GET  /api/demographics/high-spending-power?limit=10
GET  /api/demographics/compare?areas=TAMPINES,BEDOK,BISHAN
GET  /api/demographics/age-distribution/:area
```

### Intelligence Endpoints
```
POST /api/intelligence/score-area
GET  /api/intelligence/hot-targets?limit=10
GET  /api/intelligence/new-movers?quarters=2
```

### HubSpot Integration Endpoints
```
POST /api/hubspot/enrich-contact
POST /api/hubspot/create-target-list
POST /api/hubspot/webhook/contact-created
GET  /api/hubspot/custom-properties
```

## 💡 Example Use Cases

### Find Areas with New Homeowners
```bash
curl "http://localhost:3001/api/intelligence/new-movers?quarters=2&limit=15"
```

**Returns:** Areas with BTO completions + recent resales = new mover opportunities

### Score an Area for Targeting
```bash
curl -X POST http://localhost:3001/api/intelligence/score-area \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "TAMPINES"}'
```

**Returns:** Score (0-100), priority level, and targeting recommendations

### Get High-Spending-Power Areas
```bash
curl "http://localhost:3001/api/demographics/high-spending-power?limit=10"
```

**Returns:** Top 10 areas ranked by spending power (affluent + working age population)

### Track Recent High-Value Resales
```bash
curl "http://localhost:3001/api/resale/high-value?minPrice=1000000&months=3"
```

**Returns:** Recent resale transactions above $1M (affluent buyers)

### Create HubSpot Target List
```bash
curl -X POST http://localhost:3001/api/hubspot/create-target-list \
  -H "Content-Type: application/json" \
  -d '{
    "quarterStart": "2024Q3",
    "quarterEnd": "2025Q2",
    "minScore": 65
  }'
```

**Returns:** Prioritized list of areas to target with estimated lead counts

## 🔧 Configuration

Create a `.env` file:

```env
# Data.gov.sg API Key (REQUIRED)
DATAGOVSG_API_KEY=your_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# HubSpot Integration (OPTIONAL)
HUBSPOT_ACCESS_TOKEN=your_hubspot_token
HUBSPOT_PORTAL_ID=your_portal_id

# Cache & Rate Limiting
CACHE_TTL=3600
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🏗️ Project Structure

```
sg-property-intelligence/
├── src/
│   ├── index.js                    # Main server
│   ├── services/
│   │   └── datagovsg.js           # Data.gov.sg API client
│   └── routes/
│       ├── bto.js                 # BTO endpoints
│       ├── resale.js              # Resale endpoints
│       ├── demographics.js        # Demographics endpoints
│       ├── intelligence.js        # Intelligence & scoring
│       └── hubspot.js             # HubSpot integration
├── package.json
├── .env
└── README.md
```

## 🎓 How the Scoring Works

Areas are scored (0-100) based on:

1. **Affluent Population (40%)** - Ages 35-54, peak earning years
2. **Resale Activity (30%)** - Recent transaction volume
3. **BTO Activity (30%)** - Upcoming completions

**Priority Levels:**
- **HIGH (70+)**: Prime targeting opportunity
- **MEDIUM (50-69)**: Good potential
- **LOW (<50)**: Limited opportunity

## 📈 Data Sources

All data from **Data.gov.sg**:

1. **HDB BTO Projects** - Launch dates, locations, units
2. **HDB Resale Transactions** - Prices, dates, locations
3. **Singapore Residents by Planning Area/Age** - Demographics

## 🔐 Security Features

- **Rate limiting**: 100 requests per minute (configurable)
- **Caching**: 1-hour TTL to reduce API load
- **CORS enabled**: For web app integration
- **Environment-based config**: Secure credential storage

## 🚀 Deployment to HubSpot Marketplace

### Prerequisites:
1. Create HubSpot Developer Account
2. Build private app → publish as public app
3. Deploy API service (Heroku, Railway, etc.)

### HubSpot Custom Properties:
Create these in HubSpot to enable full integration:
- `sg_area_affluent_percentage`
- `sg_area_population`
- `sg_recent_resale_count`
- `sg_area_avg_resale_price`
- `sg_upcoming_bto_units`
- `sg_data_last_updated`

See `/api/hubspot/custom-properties` for full details.

## 📝 API Response Format

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": { ... },
  "total": 10,
  "message": "Optional message"
}
```

Errors:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/

# Get API documentation
curl http://localhost:3001/api/docs

# Test BTO endpoint
curl "http://localhost:3001/api/bto/next-6-months"

# Test intelligence endpoint
curl -X POST http://localhost:3001/api/intelligence/score-area \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "BISHAN"}'
```

## 📊 Performance

- **Caching**: Responses cached for 1 hour
- **Rate Limiting**: 100 req/min default
- **Response Time**: <2s for most endpoints
- **Data Freshness**: Updated when Data.gov.sg updates (varies by dataset)

## 🤝 HubSpot Marketplace Integration

This API is designed for HubSpot marketplace distribution:

1. **Webhook Support**: Auto-enrich contacts on creation
2. **Custom Properties**: Pre-defined property schema
3. **Target List Creation**: Programmatic list building
4. **REST API**: Easy integration with workflows

## 📚 Documentation

- **Interactive API Docs**: `GET /api/docs`
- **OpenAPI/Swagger**: Coming soon
- **Postman Collection**: Coming soon

## 🐛 Troubleshooting

**429 Too Many Requests**
- You've exceeded rate limit
- Wait for the retry-after period or increase `RATE_LIMIT_MAX_REQUESTS`

**Empty Data Responses**
- Check your Data.gov.sg API key
- Verify planning area names are uppercase
- Some areas may not have data for all metrics

**HubSpot Integration Errors**
- Ensure `HUBSPOT_ACCESS_TOKEN` is set
- Create custom properties in HubSpot first
- Verify contact IDs are valid

## 📄 License

MIT

## 🙋 Support

For issues or questions:
- API Documentation: `/api/docs`
- Data.gov.sg: https://data.gov.sg
- HubSpot Developers: https://developers.hubspot.com

---

Built with ❤️ for Singapore's property market
