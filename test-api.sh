#!/bin/bash

# Singapore Property Intelligence API - Quick Test Script
# This script tests all major API endpoints

BASE_URL="http://localhost:3001/api"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🇸🇬 ============================================"
echo "   Singapore Property Intelligence API Tests"
echo "   ============================================"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s "$BASE_URL/../health" > /dev/null; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo "❌ Server is not running. Please start with: npm run dev"
    exit 1
fi
echo ""

# Test 1: Demographics
echo -e "${BLUE}1️⃣ Testing Demographics - Tampines${NC}"
echo "   Endpoint: GET /api/demographics/area/TAMPINES"
DEMO_RESULT=$(curl -s "$BASE_URL/demographics/area/TAMPINES")
echo "$DEMO_RESULT" | jq '{
  success,
  area: .planningArea,
  population: .totalPopulation,
  affluent: .affluentPercentage,
  workingAge: .workingAgePercentage
}'
echo ""

# Test 2: BTO Data
echo -e "${BLUE}2️⃣ Testing BTO - All Towns${NC}"
echo "   Endpoint: GET /api/bto/all"
BTO_RESULT=$(curl -s "$BASE_URL/bto/all")
echo "$BTO_RESULT" | jq '{
  success,
  totalTowns: .total,
  topTown: .data[0].town,
  topTownUnits: .data[0].totalUnits
}'
echo ""

# Test 3: Resale Transactions
echo -e "${BLUE}3️⃣ Testing Resale - Recent Activity${NC}"
echo "   Endpoint: GET /api/resale/recent?months=1"
RESALE_RESULT=$(curl -s "$BASE_URL/resale/recent?months=1")
echo "$RESALE_RESULT" | jq '{
  success,
  period,
  totalTransactions,
  topArea: .byTown[0].town,
  topAreaCount: .byTown[0].count
}'
echo ""

# Test 4: Private Property Trends
echo -e "${BLUE}4️⃣ Testing Private Property - Price Trends${NC}"
echo "   Endpoint: GET /api/private-property/trends?quarters=4"
PRIVATE_RESULT=$(curl -s "$BASE_URL/private-property/trends?quarters=4")
echo "$PRIVATE_RESULT" | jq '.trends'
echo ""

# Test 5: Area Scoring
echo -e "${BLUE}5️⃣ Testing Intelligence - Score Area (Bishan)${NC}"
echo "   Endpoint: POST /api/intelligence/score-area"
SCORE_RESULT=$(curl -s -X POST "$BASE_URL/intelligence/score-area" \
  -H "Content-Type: application/json" \
  -d '{"planningArea": "Bishan"}')
echo "$SCORE_RESULT" | jq '{
  success,
  area: .planningArea,
  score,
  priority,
  affluentScore: .factors.affluentScore,
  resaleScore: .factors.resaleScore,
  btoScore: .factors.btoScore
}'
echo ""

# Test 6: Hot Targets
echo -e "${BLUE}6️⃣ Testing Intelligence - Hot Targets${NC}"
echo "   Endpoint: GET /api/intelligence/hot-targets?limit=5"
HOT_TARGETS=$(curl -s "$BASE_URL/intelligence/hot-targets?limit=5")
echo "$HOT_TARGETS" | jq '{
  success,
  totalAreas,
  topAreas: .areas[0:3] | map({area, score, priority})
}'
echo ""

# Test 7: Compare Demographics
echo -e "${BLUE}7️⃣ Testing Demographics - Compare Areas${NC}"
echo "   Endpoint: GET /api/demographics/compare?areas=TAMPINES,BISHAN,BEDOK"
COMPARE_RESULT=$(curl -s "$BASE_URL/demographics/compare?areas=TAMPINES,BISHAN,BEDOK")
echo "$COMPARE_RESULT" | jq '.comparison | map({area, population: .totalPopulation, affluent: .affluentPercentage})'
echo ""

# Test 8: Cache Stats
echo -e "${BLUE}8️⃣ Testing Cache - Statistics${NC}"
echo "   Endpoint: GET /api/cache/stats"
CACHE_RESULT=$(curl -s "$BASE_URL/cache/stats")
echo "$CACHE_RESULT" | jq '.'
echo ""

# Summary
echo "🇸🇬 ============================================"
echo "   Test Summary"
echo "   ============================================"
echo ""

SUCCESS_COUNT=0
TOTAL_TESTS=8

# Check each result
if echo "$DEMO_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Demographics${NC}"
else
    echo "❌ Demographics"
fi

if echo "$BTO_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ BTO Data${NC}"
else
    echo "❌ BTO Data"
fi

if echo "$RESALE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Resale Transactions${NC}"
else
    echo "❌ Resale Transactions"
fi

if echo "$PRIVATE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Private Property${NC}"
else
    echo "❌ Private Property"
fi

if echo "$SCORE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Area Scoring${NC}"
else
    echo "❌ Area Scoring"
fi

if echo "$HOT_TARGETS" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Hot Targets${NC}"
else
    echo "❌ Hot Targets"
fi

if echo "$COMPARE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Compare Areas${NC}"
else
    echo "❌ Compare Areas"
fi

if echo "$CACHE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}✅ Cache Stats${NC}"
else
    echo "❌ Cache Stats"
fi

echo ""
echo "   Result: $SUCCESS_COUNT / $TOTAL_TESTS tests passed"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! API is fully functional.${NC}"
    exit 0
else
    echo "⚠️  Some tests failed. Check the output above."
    exit 1
fi
