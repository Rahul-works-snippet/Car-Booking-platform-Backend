# 🚗 Car Booking API

A RESTful backend for a car booking web app. Covers **Car Search & Browse** and **Car Details & Booking** flows.

---

## Setup

```bash
npm install
npm run dev      # with hot-reload
# or
npm start        # production
```

Server runs on **http://localhost:3001**

---

## API Reference

### 🔍 Cars

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cars` | Search & filter cars |
| GET | `/api/cars/:id` | Get car details |
| GET | `/api/cars/:id/availability` | Check availability for dates |
| GET | `/api/locations` | List all pickup locations |
| GET | `/api/categories` | List all car categories |

#### `GET /api/cars` — Query Params

| Param | Type | Example |
|-------|------|---------|
| `location` | string | `New York` |
| `category` | string | `suv`, `sedan`, `luxury`, `compact`, `van` |
| `fuel` | string | `petrol`, `electric`, `hybrid` |
| `transmission` | string | `automatic`, `manual` |
| `seats` | number | `5` (minimum seats) |
| `available` | boolean | `true` |
| `minPrice` | number | `40` |
| `maxPrice` | number | `150` |
| `sort` | string | `price_asc`, `price_desc`, `rating_desc`, `newest` |
| `page` | number | `1` |
| `limit` | number | `9` |

#### `GET /api/cars/:id/availability` — Query Params

```
?pickupDate=2026-04-01&returnDate=2026-04-05
```

---

### 💰 Pricing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pricing` | Calculate total price |
| POST | `/api/promo/validate` | Validate a promo code |

#### `POST /api/pricing` — Body

```json
{
  "carId": "car-003",
  "pickupDate": "2026-04-01",
  "returnDate": "2026-04-05",
  "promoCode": "DRIVE10"
}
```

#### Promo Codes (built-in)

| Code | Discount |
|------|----------|
| `DRIVE10` | 10% off |
| `WELCOME20` | 20% off |
| `SUMMER15` | 15% off |

---

### 📋 Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings/:reference` | Get booking by reference |
| PATCH | `/api/bookings/:reference/cancel` | Cancel a booking |
| GET | `/api/bookings` | List all bookings |

#### `POST /api/bookings` — Body

```json
{
  "carId": "car-003",
  "pickupDate": "2026-04-01",
  "returnDate": "2026-04-05",
  "pickupLocation": "Los Angeles",
  "returnLocation": "Los Angeles",
  "promoCode": "DRIVE10",
  "driver": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-1234",
    "licenseNumber": "DL-98765"
  }
}
```

#### Response (201)

```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "reference": "DE-2026-78432",
    "carId": "car-003",
    "car": { "make": "Tesla", "model": "Model 3", ... },
    "pickupDate": "2026-04-01",
    "returnDate": "2026-04-05",
    "pricing": {
      "days": 4,
      "base": 440,
      "tax": 52.80,
      "discount": 44,
      "total": 448.80
    },
    "status": "confirmed",
    "createdAt": "2026-03-10T..."
  }
}
```

---

### ❤️ Health

```
GET /api/health
```

---

## Connecting to Your Frontend

Set your frontend API base URL to:
```
http://localhost:3001/api
```

Example fetch:
```js
const res = await fetch('http://localhost:3001/api/cars?location=New+York&category=suv&available=true');
const { cars } = await res.json();
```
