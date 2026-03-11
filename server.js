require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:4028,http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json());

// ─── Supabase Client ─────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_KEY || 'your-anon-key'
);

// ─── Error Handler ──────────────────────────────────────────────────────────

function handleError(res, error, statusCode = 500) {
  console.error('Error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDays(pickupDate, returnDate) {
  const ms = new Date(returnDate) - new Date(pickupDate);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function calcPrice(car, days, discountPercent = 0) {
  const base = parseFloat(car.price_per_day) * days;
  const tax = +(base * 0.12).toFixed(2);
  const discount = +(base * (discountPercent / 100)).toFixed(2);
  const total = +(base + tax - discount).toFixed(2);
  return { base, tax, discount, total, days };
}

// ─── Welcome Route ───────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Car Booking Platform API',
    version: '1.0.0',
    status: 'running',
    database: 'Supabase',
    availableEndpoints: {
      cars: [
        'GET /api/cars - Search and filter cars',
        'GET /api/cars/:id - Get car details',
        'GET /api/cars/:id/availability - Check availability',
        'GET /api/locations - Get all locations',
        'GET /api/categories - Get all categories',
      ],
      bookings: [
        'POST /api/bookings - Create booking',
        'GET /api/bookings/:reference - Get booking details',
        'PATCH /api/bookings/:reference/cancel - Cancel booking',
        'GET /api/bookings - List all bookings',
      ],
      pricing: [
        'POST /api/pricing - Calculate price',
        'POST /api/promo/validate - Validate promo code',
      ],
      system: [
        'GET /api/health - Health check',
        'GET / - This welcome message',
      ],
    },
    testPromoCards: ['DRIVE10', 'WELCOME20', 'SUMMER15', 'SAVE25'],
    documentation: 'See DEPLOYMENT_GUIDE.md or README.md for more info',
  });
});

// ─── Routes: Cars ────────────────────────────────────────────────────────────

// GET /api/cars — search & filter
app.get('/api/cars', async (req, res) => {
  try {
    const { location, category, fuel, transmission, minPrice, maxPrice, seats, available, sort, page = 1, limit = 9 } = req.query;

    let query = supabase.from('cars').select('*');

    // Apply filters
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (fuel) {
      query = query.eq('fuel', fuel);
    }
    if (transmission) {
      query = query.eq('transmission', transmission);
    }
    if (seats) {
      query = query.gte('seats', parseInt(seats));
    }
    if (available !== undefined) {
      query = query.eq('available', available === 'true');
    }
    if (minPrice) {
      query = query.gte('price_per_day', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price_per_day', parseFloat(maxPrice));
    }

    // Get total count
    const { count } = await query;

    // Apply sorting
    let orderColumn = 'created_at';
    let orderDirection = 'desc';

    if (sort === 'price_asc') {
      orderColumn = 'price_per_day';
      orderDirection = 'asc';
    } else if (sort === 'price_desc') {
      orderColumn = 'price_per_day';
      orderDirection = 'desc';
    } else if (sort === 'rating_desc') {
      orderColumn = 'rating';
      orderDirection = 'desc';
    } else if (sort === 'newest') {
      orderColumn = 'year';
      orderDirection = 'desc';
    }

    query = query.order(orderColumn, { ascending: orderDirection === 'asc' });

    // Apply pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(start, start + parseInt(limit) - 1);

    const { data: cars, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / parseInt(limit)),
      cars: cars || [],
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/cars/:id — car details
app.get('/api/cars/:id', async (req, res) => {
  try {
    const { data: car, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    res.json({ success: true, car });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/cars/:id/availability — check availability for date range
app.get('/api/cars/:id/availability', async (req, res) => {
  try {
    const { pickupDate, returnDate } = req.query;

    if (!pickupDate || !returnDate) {
      return res.status(400).json({
        success: false,
        message: 'pickupDate and returnDate are required',
      });
    }

    // Get car
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (carError || !car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    // Check for conflicts
    const { data: conflicting } = await supabase
      .from('bookings')
      .select('*')
      .eq('car_id', req.params.id)
      .neq('status', 'cancelled')
      .lt('pickup_date', new Date(returnDate).toISOString())
      .gt('return_date', new Date(pickupDate).toISOString())
      .limit(1);

    const days = calcDays(pickupDate, returnDate);
    const pricing = calcPrice(car, days);

    res.json({
      success: true,
      available: !conflicting || conflicting.length === 0,
      carId: req.params.id,
      pickupDate,
      returnDate,
      pricing,
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/locations — unique locations
app.get('/api/locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('location')
      .not('location', 'is', null);

    if (error) throw error;

    const locations = [...new Set(data.map(c => c.location))].filter(Boolean).sort();
    res.json({ success: true, locations });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/categories — unique categories
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('category')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data.map(c => c.category))].filter(Boolean).sort();
    res.json({ success: true, categories });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// ─── Routes: Pricing ─────────────────────────────────────────────────────────

// POST /api/pricing — calculate price for a booking
app.post('/api/pricing', async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, promoCode } = req.body;

    // Get car
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    // Get promo code if provided
    let discountPercent = 0;
    let promoValid = null;

    if (promoCode) {
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('discount_percent')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo) {
        discountPercent = promo.discount_percent;
        promoValid = true;
      } else {
        promoValid = false;
      }
    }

    const days = calcDays(pickupDate, returnDate);
    const pricing = calcPrice(car, days, discountPercent);

    res.json({ success: true, pricing, promoValid });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// POST /api/promo/validate — validate promo code
app.post('/api/promo/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
      });
    }

    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('discount_percent, code')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive promo code',
      });
    }

    res.json({
      success: true,
      code: promo.code,
      discountPercent: promo.discount_percent,
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// ─── Routes: Bookings ────────────────────────────────────────────────────────

// POST /api/bookings — create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { carId, pickupDate, returnDate, pickupLocation, returnLocation, promoCode, driver } = req.body;

    // Validation
    if (!carId || !pickupDate || !returnDate || !driver?.name || !driver?.email) {
      return res.status(400).json({
        success: false,
        message: 'carId, pickupDate, returnDate, driver.name, driver.email are required',
      });
    }

    // Get car
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (!car.available) {
      return res.status(409).json({
        success: false,
        message: 'Car is not available',
      });
    }

    // Check for booking conflicts
    const { data: conflicting, error: conflictError } = await supabase
      .from('bookings')
      .select('id')
      .eq('car_id', carId)
      .neq('status', 'cancelled')
      .lt('pickup_date', new Date(returnDate).toISOString())
      .gt('return_date', new Date(pickupDate).toISOString())
      .limit(1);

    if (conflicting && conflicting.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Car already booked for selected dates',
      });
    }

    // Get promo code discount
    let discountPercent = 0;
    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('discount_percent')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo) {
        discountPercent = promo.discount_percent;
      }
    }

    // Calculate pricing
    const days = calcDays(pickupDate, returnDate);
    const pricing = calcPrice(car, days, discountPercent);
    const reference = `DE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        reference,
        car_id: carId,
        pickup_date: new Date(pickupDate).toISOString(),
        return_date: new Date(returnDate).toISOString(),
        pickup_location: pickupLocation || car.location,
        return_location: returnLocation || car.location,
        driver_name: driver.name,
        driver_email: driver.email,
        driver_phone: driver.phone || null,
        promo_code: promoCode || null,
        base_price: pricing.base,
        tax: pricing.tax,
        discount: pricing.discount,
        total_price: pricing.total,
        days: pricing.days,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        carId: booking.car_id,
        car: {
          make: car.make,
          model: car.model,
          year: car.year,
          image: car.image_url,
        },
        pickupDate: booking.pickup_date,
        returnDate: booking.return_date,
        pickupLocation: booking.pickup_location,
        returnLocation: booking.return_location,
        driver: {
          name: booking.driver_name,
          email: booking.driver_email,
          phone: booking.driver_phone,
        },
        promoCode: booking.promo_code,
        pricing: {
          base: booking.base_price,
          tax: booking.tax,
          discount: booking.discount,
          total: booking.total_price,
          days: booking.days,
        },
        status: booking.status,
        createdAt: booking.created_at,
      },
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/bookings/:reference — get booking by reference
app.get('/api/bookings/:reference', async (req, res) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, cars!car_id(make, model, year, image_url)')
      .eq('reference', req.params.reference)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        car: {
          make: booking.cars?.make,
          model: booking.cars?.model,
          year: booking.cars?.year,
          image: booking.cars?.image_url,
        },
        pickupDate: booking.pickup_date,
        returnDate: booking.return_date,
        pickupLocation: booking.pickup_location,
        returnLocation: booking.return_location,
        driver: {
          name: booking.driver_name,
          email: booking.driver_email,
          phone: booking.driver_phone,
        },
        pricing: {
          base: booking.base_price,
          tax: booking.tax,
          discount: booking.discount,
          total: booking.total_price,
          days: booking.days,
        },
        status: booking.status,
        createdAt: booking.created_at,
      },
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// PATCH /api/bookings/:reference/cancel — cancel booking
app.patch('/api/bookings/:reference/cancel', async (req, res) => {
  try {
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select('*')
      .eq('reference', req.params.reference)
      .single();

    if (getError || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking already cancelled',
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('reference', req.params.reference)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Booking cancelled',
      booking: {
        reference: updated.reference,
        status: updated.status,
        cancelledAt: updated.cancelled_at,
      },
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// GET /api/bookings — list all bookings (admin/demo)
app.get('/api/bookings', async (req, res) => {
  try {
    const { data: bookings, count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact' });

    if (error) throw error;

    res.json({
      success: true,
      total: count,
      bookings: bookings || [],
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { error } = await supabase.from('cars').select('id').limit(1);

    res.json({
      success: true,
      status: 'ok',
      uptime: process.uptime(),
      database: error ? 'disconnected' : 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      success: false,
      status: 'error',
      uptime: process.uptime(),
      database: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Not Found Handler ───────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚗 Car Booking API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.SUPABASE_URL ? 'Supabase' : 'Not configured'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
