# HubSpot workflow simulation

This mode reuses the existing area-scoring handlers with fictional data. It makes no Data.gov.sg calls and exposes no HubSpot write routes. No credentials are required. The standalone runner does not load `.env` or the live data services.

Start locally with `npm run simulate`. Then send a JSON POST to `http://127.0.0.1:4317/api/simulation/score-area`:

```json
{"planningArea":"TAMPINES"}
```

| Fictional fixture | Returned score | Priority |
| --- | ---: | --- |
| TAMPINES | 86 | HIGH |
| BISHAN | 57 | MEDIUM |
| BEDOK | 42 | LOW |

All figures are synthetic demonstration inputs, not property intelligence about those areas. The original `affluentPercentage` field is an age-band proxy for residents aged 35–54; it does not measure wealth or income. The simulation preserves that existing scoring model rather than representing it as a validated targeting model.

Optional `includeResale` and `includeBTO` fields accept JSON booleans and default to true. With both false, TAMPINES returns 50 / MEDIUM. Send only `planningArea` from HubSpot for the simplest test. Unknown areas return HTTP 400 with supported area names.

Outputs for a HubSpot workflow: `success`, `planningArea`, `score`, `priority`, `recommendationText`, and `simulation`. The response also contains detailed factors. `recommendationText` is a plain string so it is easy to map to a workflow output.

For hosting, use Node with `npm ci --omit=dev` and `npm run simulate`; set `NODE_ENV=production`. Render supplies `PORT`, and the server binds to all interfaces in production. Health endpoint: `/health`. The synthetic endpoint is public and requires no authentication. Do not send personal or confidential data; the only required input is the area name.

In HubSpot, add **Send a webhook**, choose **POST**, and use **Customize request body**. Add a static field `planningArea` = `TAMPINES`. Use **Test action**, inspect the response, and select the returned scalar fields as outputs. Change the static area to BISHAN or BEDOK to demonstrate other branches; alternatively map a property containing one of those three values. A workflow can use `priority` to branch, or copy `score` and `recommendationText` to demo properties. The simulation itself does not write CRM records.

HubSpot's webhook action requires a public HTTPS URL; localhost will not work. The service can run without a HubSpot app or private access token. See [HubSpot's webhook workflow guide](https://knowledge.hubspot.com/workflows/how-do-i-use-webhooks-with-hubspot-workflows) for subscription availability and response output selection.

Run `npm run test:simulation` to check all three priority outcomes, input toggles, retry stability, invalid requests and isolation from CRM routes.
