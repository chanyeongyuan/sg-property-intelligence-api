# HubSpot Custom Objects and Properties Schema

This document defines the HubSpot CRM schema for Singapore Property Intelligence integration.

## Overview

The integration uses:
1. **Custom Object**: `sg_property` - Represents a property/area in Singapore
2. **Contact Properties**: Extended properties to enrich contact records
3. **Associations**: Links between contacts and properties

---

## 1. Custom Object: SG Property

### Object Definition

```json
{
  "name": "sg_property",
  "labels": {
    "singular": "Singapore Property",
    "plural": "Singapore Properties"
  },
  "primaryDisplayProperty": "property_name",
  "description": "Singapore property areas with demographics and transaction data",
  "associatedObjects": ["CONTACT", "DEAL", "COMPANY"]
}
```

### Properties

#### Basic Information

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `property_name` | Property/Area Name | text | Name of the planning area or town (e.g., "Tampines", "Bishan") |
| `property_type` | Property Type | enumeration | HDB, Private Condo, Landed |
| `region` | Region | enumeration | Core Central, Rest of Central, Outside Central |
| `postal_district` | Postal District | number | Singapore postal district (1-28) |

#### Demographics (Census 2020)

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `total_population` | Total Population | number | Total residents in planning area |
| `working_age_population` | Working Age Population | number | Residents aged 25-64 |
| `working_age_percentage` | Working Age % | number | Percentage of working age residents |
| `affluent_population` | Affluent Population | number | Residents aged 35-54 (peak earning years) |
| `affluent_percentage` | Affluent % | number | Percentage of affluent residents |
| `data_year` | Data Year | number | Year of census data (2020) |

#### HDB Resale Activity

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `recent_resale_count` | Recent Resale Count | number | Number of resale transactions (last 3 months) |
| `avg_resale_price` | Average Resale Price | number | Average HDB resale price |
| `min_resale_price` | Minimum Resale Price | number | Lowest resale price in period |
| `max_resale_price` | Maximum Resale Price | number | Highest resale price in period |
| `resale_trend` | Resale Trend | enumeration | up, down, stable |

#### BTO/Completion Data

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `units_under_construction` | Units Under Construction | number | HDB units currently under construction |
| `units_completed_fy` | Units Completed (FY) | number | Units completed in current financial year |
| `estimated_new_movers` | Estimated New Movers | number | Expected new homeowners (BTO + resale) |
| `completion_quarters` | Completion Quarters | text | Upcoming completion quarters (e.g., "2024Q4, 2025Q1") |

#### Private Property Trends

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `private_price_index` | Private Property Price Index | number | Latest URA price index for region |
| `private_price_trend` | Private Price Trend % | number | Percentage change over last 4 quarters |
| `private_price_quarter` | Private Price Data Quarter | text | Quarter of latest data (e.g., "2025-Q2") |

#### Lead Scoring

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `target_score` | Target Score | number | 0-100 score for targeting potential |
| `target_priority` | Target Priority | enumeration | HIGH, MEDIUM, LOW |
| `scoring_factors` | Scoring Factors | text | JSON string of score breakdown |

#### Metadata

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `last_updated` | Last Updated | datetime | Last API data sync |
| `data_source` | Data Source | text | "Data.gov.sg" |
| `api_resource_ids` | API Resource IDs | text | JSON of resource IDs used |

---

## 2. Contact Properties (Extended)

These properties enrich existing HubSpot contacts with property intelligence.

### Properties to Add

| Property Name | Label | Type | Description |
|--------------|-------|------|-------------|
| `sg_area` | Singapore Area | text | Planning area/town of residence |
| `sg_area_affluent_percentage` | Area Affluent % | number | Affluent population percentage |
| `sg_area_population` | Area Population | number | Total population in area |
| `sg_area_target_score` | Area Target Score | number | Targeting score for this area |
| `sg_recent_mover` | Recent Mover | boolean | Identified as recent mover |
| `sg_bto_buyer` | BTO Buyer Potential | boolean | In area with upcoming BTO completions |
| `sg_property_value_estimate` | Property Value Estimate | number | Estimated property value based on area |
| `sg_data_enriched_date` | Data Enriched Date | datetime | When contact was enriched with SG data |

---

## 3. Associations

### Contact to SG Property
- **Association Type**: Contact lives in area
- **Use**: Link contacts to their residential planning area
- **Cardinality**: Many contacts to one property area

### Deal to SG Property
- **Association Type**: Deal location
- **Use**: Link deals/opportunities to property areas
- **Cardinality**: Many deals to one property area

### Company to SG Property
- **Association Type**: Company service area
- **Use**: Link companies to their target/service areas
- **Cardinality**: Many companies to many property areas

---

## 4. Implementation Steps

### Step 1: Create Custom Object

```bash
# Using HubSpot API
POST https://api.hubapi.com/crm/v3/schemas

{
  "name": "sg_property",
  "labels": {
    "singular": "Singapore Property",
    "plural": "Singapore Properties"
  },
  "primaryDisplayProperty": "property_name",
  "requiredProperties": ["property_name"],
  "searchableProperties": ["property_name", "property_type", "region"],
  "associatedObjects": ["CONTACT"]
}
```

### Step 2: Define Properties

Create each property using:
```bash
POST https://api.hubapi.com/crm/v3/properties/sg_property

{
  "name": "property_name",
  "label": "Property/Area Name",
  "type": "string",
  "fieldType": "text",
  "groupName": "sg_property_information"
}
```

### Step 3: Create Contact Properties

```bash
POST https://api.hubapi.com/crm/v3/properties/contact

{
  "name": "sg_area",
  "label": "Singapore Area",
  "type": "string",
  "fieldType": "text",
  "groupName": "singapore_property_data"
}
```

### Step 4: Set Up Associations

```bash
POST https://api.hubapi.com/crm/v4/associations/sg_property/contact/labels

{
  "label": "Lives in Area",
  "name": "lives_in_area"
}
```

---

## 5. Sample Data Flow

### Enriching a Contact

```javascript
// 1. Contact created/updated with Singapore address
{
  "email": "john@example.com",
  "city": "Singapore",
  "sg_area": "Tampines"
}

// 2. Webhook triggers enrichment API
POST /api/hubspot/enrich-contact
{
  "contactId": "12345",
  "town": "Tampines"
}

// 3. API fetches data and updates contact
{
  "sg_area_affluent_percentage": 27,
  "sg_area_population": 259900,
  "sg_area_target_score": 72,
  "sg_recent_mover": false,
  "sg_bto_buyer": true,
  "sg_data_enriched_date": "2025-10-15T02:30:00Z"
}

// 4. Associate contact with SG Property object
Associate contactId:12345 with sg_property:Tampines
```

### Creating Property Records

```javascript
// Create one record per planning area
POST /crm/v3/objects/sg_property

{
  "properties": {
    "property_name": "Tampines",
    "property_type": "HDB",
    "region": "Outside Central",
    "total_population": 259900,
    "affluent_percentage": 27,
    "recent_resale_count": 156,
    "avg_resale_price": 485000,
    "units_under_construction": 2500,
    "private_price_index": 260.9,
    "private_price_trend": 4.74,
    "target_score": 72,
    "target_priority": "HIGH",
    "last_updated": "2025-10-15T02:30:00Z"
  }
}
```

---

## 6. Automation Workflows

### Workflow 1: Auto-Enrich on Contact Creation

**Trigger**: Contact created with `sg_area` populated
**Actions**:
1. HTTP POST to `/api/hubspot/enrich-contact`
2. Wait for response
3. Update contact with enrichment data
4. Create association to SG Property object

### Workflow 2: High-Value Area Alert

**Trigger**: Contact associated with SG Property where `target_score > 70`
**Actions**:
1. Add to list: "High-Value Area Residents"
2. Send internal notification to sales team
3. Set lifecycle stage to "Marketing Qualified Lead"

### Workflow 3: BTO Completion Alert

**Trigger**: SG Property `units_under_construction` > 500 AND completion within 6 months
**Actions**:
1. Find all associated contacts
2. Add contacts to campaign: "New Homeowner Welcome"
3. Set `sg_bto_buyer` = true
4. Schedule follow-up tasks

### Workflow 4: Monthly Data Refresh

**Trigger**: First day of month
**Actions**:
1. HTTP GET to `/api/intelligence/hot-targets`
2. Update all SG Property objects with latest scores
3. Re-evaluate contact segments based on new data

---

## 7. Reporting & Analytics

### Key Reports to Create

#### 1. Area Performance Dashboard
- **Metrics**: Total contacts by area, conversion rate by area
- **Dimensions**: SG Property objects
- **Filters**: Target priority, affluent percentage

#### 2. New Mover Pipeline
- **Metrics**: Contacts with `sg_recent_mover = true`
- **Stage Progression**: By area and target score
- **Conversion Tracking**: From MQL to customer

#### 3. BTO Opportunity Report
- **Metrics**: Units under construction, estimated new movers
- **Timeline**: By completion quarters
- **Contact Overlap**: Existing contacts in BTO areas

#### 4. Private Property Trends Impact
- **Metrics**: Private price index trends vs HDB resale activity
- **Correlation**: High private prices → HDB demand
- **Targeting Insights**: Which areas show strongest growth

---

## 8. API Integration Endpoints

### Enrichment Endpoint
```
POST /api/hubspot/enrich-contact
{
  "contactId": "12345",
  "town": "Tampines"
}
```

### Bulk Property Sync
```
GET /api/intelligence/hot-targets?limit=50
→ Update all SG Property objects
```

### Area Scoring
```
POST /api/intelligence/score-area
{
  "planningArea": "Bishan"
}
→ Get comprehensive targeting score
```

---

## 9. Data Refresh Schedule

| Data Type | Refresh Frequency | API Endpoint |
|-----------|------------------|--------------|
| Demographics | Annual (Census) | `/api/demographics/area/:area` |
| Resale Transactions | Monthly | `/api/resale/recent?months=1` |
| BTO Completions | Quarterly | `/api/bto/upcoming` |
| Private Property Index | Quarterly | `/api/private-property/trends` |
| Area Scores | Weekly | `/api/intelligence/hot-targets` |

---

## 10. Sample Custom Object Record

```json
{
  "id": "56789",
  "properties": {
    "property_name": "Tampines",
    "property_type": "HDB",
    "region": "Outside Central",
    "postal_district": "18",
    "total_population": 259900,
    "working_age_population": 155550,
    "working_age_percentage": 60,
    "affluent_population": 70790,
    "affluent_percentage": 27,
    "data_year": 2020,
    "recent_resale_count": 156,
    "avg_resale_price": 485000,
    "min_resale_price": 320000,
    "max_resale_price": 680000,
    "resale_trend": "up",
    "units_under_construction": 2500,
    "units_completed_fy": 800,
    "estimated_new_movers": 3300,
    "completion_quarters": "2024Q4, 2025Q1, 2025Q2",
    "private_price_index": 260.9,
    "private_price_trend": 4.74,
    "private_price_quarter": "2025-Q2",
    "target_score": 72,
    "target_priority": "HIGH",
    "scoring_factors": "{\"affluent\":28,\"resale\":15,\"bto\":18,\"private\":11}",
    "last_updated": "2025-10-15T02:30:00.000Z",
    "data_source": "Data.gov.sg",
    "api_resource_ids": "{\"demographics\":\"d_d95ae740c0f8961a0b10435836660ce0\",\"resale\":\"d_8b84c4ee58e3cfc0ece0d773c8ca6abc\"}"
  },
  "associations": {
    "contacts": 1247,
    "deals": 34,
    "companies": 8
  }
}
```

---

## 11. Next Steps

1. ✅ Define custom object schema (this document)
2. ⏭️ Create custom object in HubSpot via API or UI
3. ⏭️ Create all properties for custom object
4. ⏭️ Create contact properties for enrichment
5. ⏭️ Set up association definitions
6. ⏭️ Implement enrichment webhook endpoint
7. ⏭️ Create automation workflows
8. ⏭️ Build dashboards and reports
9. ⏭️ Test end-to-end integration
10. ⏭️ Deploy to production

---

## Resources

- HubSpot Custom Objects API: https://developers.hubspot.com/docs/api/crm/crm-custom-objects
- HubSpot Properties API: https://developers.hubspot.com/docs/api/crm/properties
- HubSpot Associations API: https://developers.hubspot.com/docs/api/crm/associations
- Data.gov.sg: https://data.gov.sg
