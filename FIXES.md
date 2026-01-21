# Form Data Type Conversion Fixes

## Issue
Frontend forms were sending string values for fields that the backend expects as integers or null values. This caused validation errors when creating/updating records.

## Fixed Files

### 1. `src/pages/Vehicles.jsx`
**Problem:** The `year` field was being sent as a string instead of an integer.

**Fix:** Updated `handleSubmit` to properly convert form data:
```javascript
const payload = {
    plateNumber: formData.plateNumber,
    vehicleType: formData.vehicleType || null,
    brand: formData.brand || null,
    model: formData.model || null,
    year: formData.year ? parseInt(formData.year, 10) : null, // ✅ Convert to integer
    color: formData.color || null,
    ownerId: formData.ownerId || null,
    companyId: formData.companyId || null,
    status: formData.status,
};
```

### 2. `src/pages/Devices.jsx`
**Problem:** Optional fields were being sent as empty strings instead of null.

**Fix:** Updated `handleSubmit` to convert empty strings to null:
```javascript
const payload = {
    imei: formData.imei,
    deviceModel: formData.deviceModel || null,
    firmwareVersion: formData.firmwareVersion || null,
    simCardId: formData.simCardId || null, // ✅ Convert empty string to null
    status: formData.status,
};
```

## Type Conversion Rules

| Field Type | Input Type | Backend Expects | Conversion |
|------------|-----------|-----------------|------------|
| Integer (year) | `type="number"` | `Int?` | `parseInt(value, 10)` or `null` |
| UUID (IDs) | `<select>` | `String?` | Empty string → `null` |
| String (optional) | `<input>` | `String?` | Empty string → `null` |

## Testing
After these fixes:
- ✅ Vehicle creation with year field works correctly
- ✅ Empty optional fields are properly sent as `null` instead of empty strings
- ✅ No more type validation errors from the backend

## Other Pages Checked
- `Owners.jsx` - No numeric fields ✅
- `SimCards.jsx` - No numeric fields ✅
- `Companies.jsx` - No numeric fields ✅
