# Testing Guide - HubSpot Development Sandbox

This guide walks you through testing the Singapore Property Intelligence API in a HubSpot development sandbox.

---

## **Prerequisites**

1. ✅ API server running locally on port 3001
2. ⏭️ HubSpot account with sandbox access
3. ⏭️ Ngrok or similar tool for exposing local API to HubSpot
4. ⏭️ HubSpot private app credentials

---

## **Step 1: Expose Your Local API**

Since HubSpot needs to call your API via webhooks, you need to expose your local server to the internet.

### Option A: Using Ngrok (Recommended)

```bash
# Install ngrok (if not installed)
brew install ngrok

# Expose port 3001
ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok.io`

### Option B: Using LocalTunnel

```bash
# Install localtunnel
npm install -g localtunnel

# Expose port 3001
lt --port 3001
```

### Option C: Using Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Expose port 3001
cloudflared tunnel --url http://localhost:3001
```

**Save your public URL** - you'll need it for HubSpot webhook configuration.

---

## **Step 2: Create HubSpot Development Sandbox**

### Via HubSpot UI

1. Go to **Settings** → **Account Setup** → **Account Defaults** → **Development Sandboxes**
2. Click **Create Sandbox**
3. Name: `sg-property-dev`
4. Type: **Development**
5. Click **Create**

### Via HubSpot CLI

```bash
# Initialize HubSpot config (if not done)
cd /Users/ychan/Documents/Projects/Integration/sg-property-intelligence
hs init

# Create sandbox
hs sandbox create --name "sg-property-dev" --type development

# List sandboxes
hs sandbox list
```

---

## **Step 3: Create HubSpot Private App**

1. In your **development sandbox**, go to **Settings** → **Integrations** → **Private Apps**
2. Click **Create a private app**
3. Name: `SG Property Intelligence`
4. Description: `Singapore property and demographics API`

### Required Scopes

**CRM Scopes:**
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.custom.read`
- `crm.objects.custom.write`
- `crm.schemas.custom.read`
- `crm.schemas.custom.write`

**Other Scopes:**
- `settings.users.read` (optional)

5. Click **Create app** and copy the **Access Token**

---

## **Step 4: Update Your .env File**

```bash
# Update your .env file with sandbox credentials
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_PORTAL_ID=50444105
DATAGOVSG_API_KEY=v2:97bc86b28599ce8084a4947f110dfd3a514d0ade82602d88da5d7d7e879da56e:8lFk-5VW1-z6tRZEZxzHCGQK1vkKs7cb
PORT=3001
CACHE_TTL=3600
RATE_LIMIT_MAX_REQUESTS=100

# Add your ngrok URL
PUBLIC_API_URL=https://abc123.ngrok.io
```

Restart your server:
```bash
npm run dev
```

---

## **Step 5: Create Custom Object in HubSpot**

### Via HubSpot API

Create a test script:

```javascript
// test-create-custom-object.js
import axios from 'axios';

const HUBSPOT_TOKEN = 'YOUR_PRIVATE_APP_TOKEN';

async function createCustomObject() {
  try {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/schemas',
      {
        name: 'sg_property',
        labels: {
          singular: 'Singapore Property',
          plural: 'Singapore Properties'
        },
        primaryDisplayProperty: 'property_name',
        requiredProperties: ['property_name'],
        searchableProperties: ['property_name', 'region'],
        properties: [
          {
            name: 'property_name',
            label: 'Property/Area Name',
            type: 'string',
            fieldType: 'text',
            hasUniqueValue: true
          },
          {
            name: 'region',
            label: 'Region',
            type: 'enumeration',
            fieldType: 'select',
            options: [
              { label: 'Core Central Region', value: 'core_central' },
              { label: 'Rest of Central Region', value: 'rest_central' },
              { label: 'Outside Central Region', value: 'outside_central' }
            ]
          },
          {
            name: 'total_population',
            label: 'Total Population',
            type: 'number',
            fieldType: 'number'
          },
          {
            name: 'affluent_percentage',
            label: 'Affluent %',
            type: 'number',
            fieldType: 'number'
          }
        ],
        associatedObjects: ['CONTACT']
      },
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Custom object created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createCustomObject();
```

Run it:
```bash
node test-create-custom-object.js
```

### Via HubSpot UI (Alternative)

1. Go to **Settings** → **Data Management** → **Objects**
2. Click **Create custom object**
3. Follow the schema in `HUBSPOT_SCHEMA.md`

---

## **Step 6: Create Test Contact with Singapore Data**

### Via API

```bash
# Create a test contact
curl -X POST https://api.hubapi.com/crm/v3/objects/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "email": "test@example.com",
      "firstname": "John",
      "lastname": "Tan",
      "city": "Singapore",
      "sg_area": "Tampines"
    }
  }'
```

### Via HubSpot UI

1. Go to **Contacts** → **Create contact**
2. Fill in:
   - Email: `test@example.com`
   - First Name: `John`
   - Last Name: `Tan`
   - City: `Singapore`
3. Click **Create**
4. Note the **Contact ID** (you'll see it in the URL)

---

## **Step 7: Test API Enrichment**

### Test 1: Direct API Call

```bash
# Get your test contact ID from HubSpot
CONTACT_ID="12345"

# Test enrichment endpoint
curl -X POST http://localhost:3001/api/hubspot/enrich-contact \
  -H "Content-Type: application/json" \
  -d "{
    \"contactId\": \"${CONTACT_ID}\",
    \"town\": \"Tampines\"
  }"
```

Expected response:
```json
{
  "success": true,
  "message": "Contact enriched successfully",
  "contactId": "12345",
  "enrichedData": {
    "sg_area_affluent_percentage": 27,
    "sg_area_population": 259900,
    "sg_area_target_score": 72,
    "sg_data_enriched_date": "2025-10-15T..."
  }
}
```

### Test 2: Create Property Record

```bash
# Create a property record for Tampines
curl -X POST http://localhost:3001/api/property/create \
  -H "Content-Type: application/json" \
  -d '{
    "area": "Tampines"
  }'
```

### Test 3: Score an Area

```bash
curl -X POST http://localhost:3001/api/intelligence/score-area \
  -H "Content-Type: application/json" \
  -d '{
    "planningArea": "Bishan"
  }'
```

Expected response:
```json
{
  "success": true,
  "planningArea": "BISHAN",
  "score": 68,
  "priority": "MEDIUM",
  "factors": {
    "demographics": {
      "totalPopulation": 87320,
      "affluentPercentage": 27
    },
    "affluentScore": 27,
    "resaleActivity": {...},
    "resaleScore": 15,
    "btoActivity": {...},
    "btoScore": 14
  },
  "recommendation": [...]
}
```

---

## **Step 8: Set Up HubSpot Workflow**

### Create Auto-Enrichment Workflow

1. Go to **Automation** → **Workflows**
2. Click **Create workflow** → **Contact-based**
3. Name: `Auto-Enrich Singapore Contacts`

**Enrollment Trigger:**
- Contact property `sg_area` is known

**Actions:**
1. **Webhook Action**
   - Method: POST
   - URL: `https://YOUR_NGROK_URL/api/hubspot/enrich-contact`
   - Headers:
     ```
     Content-Type: application/json
     ```
   - Body:
     ```json
     {
       "contactId": "{{contact.hs_object_id}}",
       "town": "{{contact.sg_area}}"
     }
     ```

2. **Delay** (optional): 2 seconds

3. **Update Contact** (based on webhook response)
   - Set `sg_data_enriched_date` to now

4. **Turn on workflow**

---

## **Step 9: Test the Complete Flow**

### End-to-End Test

1. **Create a new contact** in HubSpot with `sg_area = "Tampines"`
2. **Workflow triggers** automatically
3. **Webhook calls** your API
4. **API fetches** Tampines data from Data.gov.sg
5. **Contact is enriched** with demographics
6. **Check contact record** - should see:
   - `sg_area_affluent_percentage: 27`
   - `sg_area_population: 259900`
   - `sg_data_enriched_date: [timestamp]`

### Manual Test

```bash
# 1. Create contact via API
CONTACT_RESPONSE=$(curl -s -X POST https://api.hubapi.com/crm/v3/objects/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "email": "test2@example.com",
      "firstname": "Jane",
      "lastname": "Lim",
      "sg_area": "Bishan"
    }
  }')

# Extract contact ID
CONTACT_ID=$(echo $CONTACT_RESPONSE | jq -r '.id')
echo "Contact ID: $CONTACT_ID"

# 2. Enrich contact
curl -X POST http://localhost:3001/api/hubspot/enrich-contact \
  -H "Content-Type: application/json" \
  -d "{
    \"contactId\": \"${CONTACT_ID}\",
    \"town\": \"Bishan\"
  }"

# 3. Verify enrichment
curl -s "https://api.hubapi.com/crm/v3/objects/contacts/${CONTACT_ID}?properties=sg_area_affluent_percentage,sg_area_population" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## **Step 10: Monitor and Debug**

### Check API Logs

Your server logs will show:
```
📥 API Request: Get demographics for BISHAN
🔍 Fetching from Data.gov.sg V1: resource=d_d95ae740c0f8961a0b10435836660ce0, limit=5000
✅ Fetched 1500 records
📦 Cache hit for resource: d_8b84c4ee58e3cfc0ece0d773c8ca6abc
```

### Check Ngrok Inspector

1. Open `http://localhost:4040` (Ngrok web interface)
2. See all webhook requests from HubSpot
3. Inspect request/response payloads

### Check HubSpot Workflow History

1. Go to your workflow
2. Click **History** tab
3. See execution details and any errors

---

## **Step 11: Test All Endpoints**

Create a Postman collection or use this script:

```bash
#!/bin/bash
# test-all-endpoints.sh

BASE_URL="http://localhost:3001/api"

echo "🧪 Testing Singapore Property Intelligence API"
echo "================================================"
echo ""

echo "1️⃣ Demographics - Tampines"
curl -s "$BASE_URL/demographics/area/TAMPINES" | jq '.planningArea, .totalPopulation, .affluentPercentage'
echo ""

echo "2️⃣ BTO - Next 6 months"
curl -s "$BASE_URL/bto/next-6-months" | jq '.totalUnits, .totalAreas'
echo ""

echo "3️⃣ Resale - Recent (1 month)"
curl -s "$BASE_URL/resale/recent?months=1" | jq '.totalTransactions, .byTown[0]'
echo ""

echo "4️⃣ Private Property - Trends"
curl -s "$BASE_URL/private-property/trends?quarters=4" | jq '.trends[0]'
echo ""

echo "5️⃣ Intelligence - Score Bishan"
curl -s -X POST "$BASE_URL/intelligence/score-area" \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "Bishan"}' | jq '.score, .priority'
echo ""

echo "6️⃣ Hot Targets"
curl -s "$BASE_URL/intelligence/hot-targets?limit=5" | jq '.totalAreas'
echo ""

echo "✅ All tests complete!"
```

Run it:
```bash
chmod +x test-all-endpoints.sh
./test-all-endpoints.sh
```

---

## **Step 12: Create Sample Reports**

### Report 1: Contact Distribution by Area

1. Go to **Reports** → **Custom Reports** → **Single Object**
2. Select: **Contacts**
3. Configure:
   - **Visualization**: Bar chart
   - **Measure**: Count of contacts
   - **Breakdown by**: `sg_area`
   - **Filter**: `sg_area` is known

### Report 2: Area Scores Dashboard

1. Create custom report
2. Select: **SG Property** (custom object)
3. Add visualizations:
   - **Gauge**: Average `target_score`
   - **Table**: Top areas by score
   - **Line chart**: Score trends over time

---

## **Troubleshooting**

### Issue: Webhook not received

**Check:**
1. Ngrok is running: `ngrok http 3001`
2. Public URL is correct in workflow
3. Server is running: `npm run dev`
4. Check Ngrok inspector: `http://localhost:4040`

### Issue: Contact not enriched

**Check:**
1. HubSpot token has correct scopes
2. Contact ID is valid
3. Town name matches planning areas (use CAPS or Title Case)
4. API logs show successful data fetch

### Issue: Data.gov.sg errors

**Check:**
1. Internet connection working
2. Resource IDs are correct
3. Data.gov.sg service is up
4. Cache might have stale data - clear it: `POST /api/cache/clear`

---

## **Production Deployment Checklist**

Once testing is successful in sandbox:

- [ ] Deploy API to production server (Heroku, AWS, Railway, etc.)
- [ ] Set up production domain with SSL
- [ ] Update HubSpot app to use production URL
- [ ] Create production HubSpot private app
- [ ] Migrate custom objects to production account
- [ ] Update all webhook URLs
- [ ] Set up monitoring (e.g., UptimeRobot, DataDog)
- [ ] Enable error tracking (e.g., Sentry)
- [ ] Set up automated backups
- [ ] Document for end users
- [ ] Submit to HubSpot marketplace (if applicable)

---

## **Quick Reference**

### Useful URLs

- **Local API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **Ngrok Inspector**: http://localhost:4040
- **HubSpot API Docs**: https://developers.hubspot.com

### Common Planning Areas for Testing

- Tampines (large, 259,900 pop)
- Bishan (medium, 87,320 pop)
- Punggol (growing area with BTO)
- Ang Mo Kio (mature estate)
- Bedok (high resale activity)

### Sample API Calls

```bash
# Demographics
curl "http://localhost:3001/api/demographics/area/TAMPINES"

# Private property trends
curl "http://localhost:3001/api/private-property/trends?quarters=6"

# Score an area
curl -X POST "http://localhost:3001/api/intelligence/score-area" \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "Bishan"}'

# Hot targets
curl "http://localhost:3001/api/intelligence/hot-targets?limit=10"
```

---

**Happy Testing! 🚀**
