-- ========================
-- CAR BOOKING PLATFORM SCHEMA
-- ========================

-- DROP existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;

-- ========================
-- USERS TABLE
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- CARS TABLE
-- ========================
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  seats INTEGER NOT NULL,
  transmission VARCHAR(50) NOT NULL,
  fuel VARCHAR(50) NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  location VARCHAR(100),
  image_url TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  fuel_efficiency INTEGER,
  badge VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- BOOKINGS TABLE
-- ========================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  car_id UUID REFERENCES cars(id) ON DELETE RESTRICT NOT NULL,
  pickup_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP NOT NULL,
  pickup_location VARCHAR(255),
  return_location VARCHAR(255),
  driver_name VARCHAR(255) NOT NULL,
  driver_email VARCHAR(255) NOT NULL,
  driver_phone VARCHAR(20),
  promo_code VARCHAR(50),
  base_price DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  days INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- PROMO CODES TABLE
-- ========================
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent DECIMAL(5, 2) NOT NULL,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_car_id ON bookings(car_id);
CREATE INDEX idx_bookings_reference ON bookings(reference);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(pickup_date, return_date);
CREATE INDEX idx_cars_category ON cars(category);
CREATE INDEX idx_cars_location ON cars(location);
CREATE INDEX idx_cars_available ON cars(available);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

-- ========================
-- SAMPLE DATA
-- ========================

-- Insert sample users
INSERT INTO users (email, name, phone) VALUES
('demo@example.com', 'Demo User', '+1-555-0100'),
('john@example.com', 'John Smith', '+1-555-0101'),
('jane@example.com', 'Jane Doe', '+1-555-0102');

-- Insert sample cars (Prices in Indian Rupees ₹)
INSERT INTO cars (make, model, year, category, seats, transmission, fuel, price_per_day, available, location, image_url, rating, reviews, fuel_efficiency, features, badge) VALUES
('Toyota', 'Camry', 2023, 'sedan', 5, 'automatic', 'petrol', 4500, TRUE, 'Mumbai', 'https://via.placeholder.com/400x250?text=Toyota+Camry', 4.5, 120, 38, ARRAY['GPS', 'Bluetooth', 'Backup Camera'], 'Best Seller'),
('Ford', 'Explorer', 2023, 'suv', 7, 'automatic', 'petrol', 7000, TRUE, 'Delhi', 'https://via.placeholder.com/400x250?text=Ford+Explorer', 4.7, 95, 28, ARRAY['GPS', 'Sunroof', 'Third Row Seating', 'Apple CarPlay'], 'Family Pick'),
('Tesla', 'Model 3', 2024, 'sedan', 5, 'automatic', 'electric', 9100, TRUE, 'Bangalore', 'https://via.placeholder.com/400x250?text=Tesla+Model+3', 4.9, 210, 130, ARRAY['Autopilot', 'Supercharging', 'Premium Sound', 'Glass Roof'], 'Eco Choice'),
('BMW', 'X5', 2023, 'suv', 5, 'automatic', 'petrol', 12000, TRUE, 'Mumbai', 'https://via.placeholder.com/400x250?text=BMW+X5', 4.8, 78, 32, ARRAY['Leather Seats', 'Heads-Up Display', 'Parking Assist', 'Ambient Lighting'], 'Premium'),
('Honda', 'Civic', 2022, 'sedan', 5, 'manual', 'petrol', 3500, FALSE, 'Delhi', 'https://via.placeholder.com/400x250?text=Honda+Civic', 4.3, 145, 38, ARRAY['GPS', 'Bluetooth', 'Backup Camera'], NULL),
('Chevrolet', 'Spark', 2022, 'compact', 4, 'automatic', 'petrol', 2900, TRUE, 'Pune', 'https://via.placeholder.com/400x250?text=Chevrolet+Spark', 4.1, 60, 42, ARRAY['Bluetooth', 'Air Conditioning'], NULL),
('Mercedes', 'GLE', 2024, 'luxury', 5, 'automatic', 'hybrid', 16500, TRUE, 'Bangalore', 'https://via.placeholder.com/400x250?text=Mercedes+GLE', 4.9, 44, 45, ARRAY['Leather Seats', 'Panoramic Roof', 'Bose Sound System', 'GPS'], NULL),
('Toyota', 'Sienna', 2023, 'van', 8, 'automatic', 'hybrid', 7900, TRUE, 'Mumbai', 'https://via.placeholder.com/400x250?text=Toyota+Sienna', 4.6, 33, 35, ARRAY['Dual Sliding Doors', 'backup Camera', 'Apple CarPlay'], NULL),
('Jeep', 'Wrangler', 2023, 'suv', 4, 'manual', 'petrol', 8200, TRUE, 'Hyderabad', 'https://via.placeholder.com/400x250?text=Jeep+Wrangler', 4.7, 88, 25, ARRAY['All-Terrain Tires', 'GPS', 'Bluetooth'], NULL),
('Audi', 'A4', 2024, 'luxury', 5, 'automatic', 'petrol', 13200, TRUE, 'Delhi', 'https://via.placeholder.com/400x250?text=Audi+A4', 4.8, 56, 35, ARRAY['Leather Seats', 'Bang & Olufsen Sound', 'Virtual Cockpit'], NULL),
('Nissan', 'Leaf', 2023, 'compact', 5, 'automatic', 'electric', 5400, TRUE, 'Bangalore', 'https://via.placeholder.com/400x250?text=Nissan+Leaf', 4.4, 72, 126, ARRAY['DC Fast Charging', 'Apple CarPlay', 'Backup Camera'], NULL),
('Porsche', 'Cayenne', 2024, 'luxury', 5, 'automatic', 'hybrid', 23100, TRUE, 'Mumbai', 'https://via.placeholder.com/400x250?text=Porsche+Cayenne', 5.0, 21, 42, ARRAY['Leather Seats', 'Panoramic Roof', 'Premium Sound', 'Sport Package'], NULL);

-- Insert sample promo codes
INSERT INTO promo_codes (code, discount_percent, is_active) VALUES
('DRIVE10', 10, TRUE),
('WELCOME20', 20, TRUE),
('SUMMER15', 15, TRUE),
('SAVE25', 25, TRUE);

-- ========================
-- ROW LEVEL SECURITY (Optional but Recommended)
-- ========================

-- Enable RLS on tables
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to cars and promo codes
CREATE POLICY "public_can_read_cars" ON cars FOR SELECT USING (true);
CREATE POLICY "public_can_read_promo_codes" ON promo_codes FOR SELECT USING (true);

-- Allow anyone to create bookings (for public booking)
CREATE POLICY "public_can_create_bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "public_can_read_own_bookings" ON bookings FOR SELECT USING (true);

-- Users can read their own data
CREATE POLICY "users_can_read_own_data" ON users FOR SELECT USING (true);

-- ========================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ========================

-- Function to check car availability
CREATE OR REPLACE FUNCTION check_car_availability(
  p_car_id UUID,
  p_pickup_date TIMESTAMP,
  p_return_date TIMESTAMP
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
    AND status != 'cancelled'
    AND p_pickup_date < return_date
    AND p_return_date > pickup_date
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate days between dates
CREATE OR REPLACE FUNCTION calculate_days(
  p_pickup_date TIMESTAMP,
  p_return_date TIMESTAMP
)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_return_date - p_pickup_date)) / 86400));
END;
$$ LANGUAGE plpgsql;
