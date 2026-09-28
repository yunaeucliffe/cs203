# Route provider fixtures

These are synthetic, reduced provider-shaped fixtures, not recordings of live journeys. Provider credentials were not configured during implementation. Values intentionally cover matching, timestamps, missing fields and failure cases without depending on changing live conditions.

Shape references:
- https://www.onemap.gov.sg/apidocs/routing (OneMap/OTP itineraries)
- https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf (BusArrival v3, FacilitiesMaintenance v2, TrainServiceAlerts, PCDRealTime)
- https://api-open.data.gov.sg/v2/real-time/api/rainfall (NEA v2 rainfall)

Clock used in enrichment tests: 2026-09-28T00:00:00Z (08:00 Singapore).
Before release, add sanitized recordings from the configured accounts and run the same adapter assertions, especially for OneMap station identifiers and DataMall service permissions.
