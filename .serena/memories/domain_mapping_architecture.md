# Domain Mapping Architecture

## Key Design Decisions

### Database Schema vs API Types
The database schema and API types may differ due to:
1. **Normalization**: Database uses `categoryId` (foreign key), API may include full `category` object
2. **Enums**: Database uses string enums (e.g., `staffLevel`), API may use different representations
3. **Audit fields**: Database tracks internal fields that may not be exposed via API

### Mapping Strategy
1. **Read Mappers**: Transform database records into domain models, then to API responses
   - Handle null values from database
   - Populate denormalized fields for API response
   - Omit internal database fields

2. **Write Mappers**: Transform API requests into domain models, then to database inserts/updates
   - Validate business rules
   - Generate IDs for new records
   - Set audit fields (createdAt, updatedAt)

### Type Mismatches to Handle
- `requiredStaffLevel`: Database uses enum strings, API spec defines as number
- `category`: API expects object/enum, database stores as `categoryId` foreign key
- Audit fields: Database has different audit fields than API exposes

### Resolution Approach
- Create adapter functions in mappers to handle these conversions
- Use domain model as the source of truth between database and API
- Document all conversions clearly in mapper functions