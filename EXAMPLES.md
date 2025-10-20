# Usage Examples

Practical examples for using the Singapore Property Intelligence API.

## Getting Started

```bash
# Start the server
npm run dev

# Base URL
BASE_URL="http://localhost:3001/api"
```

## 1. Finding New Homeowner Leads

### Scenario: Target BTO buyers moving in next 6 months

```bash
curl "$BASE_URL/bto/next-6-months"
```

**Response**: Areas with BTO completions, unit counts, estimated leads

**Use Case**: Plan marketing campaigns 3-6 months before move-in dates

---

### Scenario: Find all new movers (BTO + Resale) in next quarter

```bash
curl "$BASE_URL/intelligence/new-movers?quarters=1&limit=20"
```

**Response**: Combined BTO completions + recent resale transactions

**Use Case**: Generate comprehensive new mover target list

---

## 2. Identifying Affluent Areas

### Scenario: Find top 10 areas with highest spending power

```bash
curl "$BASE_URL/demographics/high-spending-power?limit=10"
```

**Response**: Areas ranked by spending power score (affluent% + working age%)

**Use Case**: Target premium product marketing

---

### Scenario: Compare demographics of 3 competing areas

```bash
curl "$BASE_URL/demographics/compare?areas=BISHAN,ANG MO KIO,TOA PAYOH"
```

**Response**: Side-by-side demographic comparison

**Use Case**: Choose between multiple expansion areas

---

## 3. Tracking High-Value Transactions

### Scenario: Find buyers who paid $1M+ in last 3 months

```bash
curl "$BASE_URL/resale/high-value?minPrice=1000000&months=3"
```

**Response**: High-value transactions by area with buyer profiles

**Use Case**: Target wealth management or premium services

---

### Scenario: Monitor transaction activity in specific area

```bash
curl "$BASE_URL/resale/by-town/TAMPINES?months=6"
```

**Response**: All transactions in Tampines (last 6 months)

**Use Case**: Track market activity in your service area

---

## 4. Area Scoring & Prioritization

### Scenario: Score Punggol for targeting potential

```bash
curl -X POST $BASE_URL/intelligence/score-area \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "PUNGGOL", "includeResale": true, "includeBTO": true}'
```

**Response**:
```json
{
  "success": true,
  "planningArea": "PUNGGOL",
  "score": 78,
  "priority": "HIGH",
  "factors": {
    "demographics": {...},
    "affluentScore": 28,
    "resaleActivity": {...},
    "resaleScore": 15,
    "btoActivity": {...},
    "btoScore": 18
  },
  "recommendation": [
    "🎯 HIGH PRIORITY: Excellent area for targeting",
    "📍 2500 BTO units - Target pre-move marketing",
    "💰 Affluent demographics - Premium product targeting"
  ]
}
```

**Use Case**: Prioritize marketing budget allocation

---

### Scenario: Get top 15 hot targets for Q4 2024 - Q2 2025

```bash
curl "$BASE_URL/intelligence/hot-targets?limit=15&quarterStart=2024Q4&quarterEnd=2025Q2"
```

**Response**: Ranked list of areas with scores and metrics

**Use Case**: Strategic planning for next 2 quarters

---

## 5. HubSpot Integration

### Scenario: Enrich HubSpot contact with area intelligence

```bash
curl -X POST $BASE_URL/hubspot/enrich-contact \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "12345",
    "town": "BEDOK"
  }'
```

**Response**: Contact enriched with:
- Area affluent percentage
- Population
- Recent resale count
- Average resale price
- Upcoming BTO units

**Use Case**: Auto-populate contact records for segmentation

---

### Scenario: Create target list for campaign

```bash
curl -X POST $BASE_URL/hubspot/create-target-list \
  -H "Content-Type: application/json" \
  -d '{
    "quarterStart": "2025Q1",
    "quarterEnd": "2025Q4",
    "minScore": 65
  }'
```

**Response**: List of areas scoring 65+ with estimated lead counts

**Use Case**: Build campaign target list programmatically

---

## 6. Market Research

### Scenario: Find hottest property markets (most transactions)

```bash
curl "$BASE_URL/resale/hot-areas?months=3&limit=10"
```

**Response**: Top 10 areas by transaction volume

**Use Case**: Identify trending neighborhoods

---

### Scenario: Get price distribution for mid-range properties

```bash
curl "$BASE_URL/resale/price-range?minPrice=400000&maxPrice=600000&months=6"
```

**Response**: Transactions in $400K-$600K range by area

**Use Case**: Understand affordable housing market

---

### Scenario: Analyze age distribution in specific area

```bash
curl "$BASE_URL/demographics/age-distribution/SENGKANG"
```

**Response**: Detailed breakdown of population by age group

**Use Case**: Tailor marketing messages to demographic profile

---

## 7. Automation & Workflows

### Example: Daily New Mover Report

```bash
#!/bin/bash
# save as: daily_report.sh

curl -s "$BASE_URL/intelligence/new-movers?quarters=1" | \
  jq '.areas[] | select(.totalNewMovers > 100)' > daily_movers.json

echo "New mover report generated: daily_movers.json"
```

**Use Case**: Automated daily reporting

---

### Example: Weekly Hot Target Update

```bash
#!/bin/bash
# save as: weekly_targets.sh

YEAR=$(date +%Y)
NEXT_YEAR=$((YEAR + 1))

curl -s "$BASE_URL/intelligence/hot-targets?quarterStart=${YEAR}Q3&quarterEnd=${NEXT_YEAR}Q2&limit=20" \
  > targets_$(date +%Y%m%d).json

echo "Target list saved"
```

**Use Case**: Weekly strategic updates

---

## 8. Cache Management

### Clear cache after Data.gov.sg update

```bash
curl -X POST $BASE_URL/cache/clear
```

### Check cache performance

```bash
curl $BASE_URL/cache/stats
```

---

## 9. Complete Workflow Example

### Scenario: Launch new home services in Singapore

```bash
#!/bin/bash
# Complete workflow: Find best areas, score them, create target list

echo "Step 1: Find new mover opportunities"
curl -s "$BASE_URL/intelligence/new-movers?quarters=2&limit=10" > step1_movers.json

echo "Step 2: Get affluent areas"
curl -s "$BASE_URL/demographics/high-spending-power?limit=10" > step2_affluent.json

echo "Step 3: Score top candidates"
for area in TAMPINES BEDOK PUNGGOL SENGKANG BISHAN; do
  echo "Scoring $area..."
  curl -s -X POST $BASE_URL/intelligence/score-area \
    -H "Content-Type: application/json" \
    -d "{\"planningArea\": \"$area\"}" \
    > "score_${area}.json"
done

echo "Step 4: Create final target list"
curl -s -X POST $BASE_URL/hubspot/create-target-list \
  -H "Content-Type: application/json" \
  -d '{
    "quarterStart": "2024Q4",
    "quarterEnd": "2025Q3",
    "minScore": 60
  }' > final_targets.json

echo "✅ Complete! Check the JSON files for results"
```

---

## 10. Error Handling

### Rate limiting

```bash
# This will eventually hit rate limit
for i in {1..150}; do
  curl "$BASE_URL/bto/all"
done

# Response when rate limited:
{
  "success": false,
  "error": "Too many requests",
  "retryAfter": 45,
  "limit": 100,
  "window": "60 seconds"
}
```

### Invalid parameters

```bash
curl "$BASE_URL/intelligence/score-area"

# Response:
{
  "success": false,
  "error": "planningArea is required"
}
```

---

## Tips for Production Use

1. **Implement retry logic** for rate limits
2. **Cache responses** on your end for frequently accessed data
3. **Use specific date ranges** to reduce payload size
4. **Monitor API health** with `/health` endpoint
5. **Clear cache** periodically or after known Data.gov.sg updates

---

## Integration with HubSpot Workflows

### Workflow 1: Auto-enrich on contact creation

**Trigger**: Contact created
**Action**: HTTP POST to `/api/hubspot/webhook/contact-created`
**Result**: Contact automatically enriched with area data

### Workflow 2: Monthly target list update

**Trigger**: First day of month
**Action**: HTTP POST to `/api/hubspot/create-target-list`
**Result**: Updated list of high-priority areas

### Workflow 3: New mover alert

**Trigger**: Weekly schedule
**Action**: HTTP GET to `/api/intelligence/new-movers`
**Result**: Notification to sales team with new opportunities

---

Ready to start? Run `npm run dev` and try these examples!
