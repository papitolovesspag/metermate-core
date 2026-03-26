// src/config/db.js
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Check if we are in a production environment
const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Only apply SSL if we are in production (Neon), ignore for local dev
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('Checking and initializing database tables...');

    const createTablesQuery = `
    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Meter Groups Table
    CREATE TABLE IF NOT EXISTS meter_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        host_id UUID REFERENCES users(id) ON DELETE CASCADE,
        meter_number VARCHAR(100) NOT NULL,
        target_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Funding',
        current_balance DECIMAL(10, 2) DEFAULT 0.00,
        last_active_session UUID,
        can_start_new_session BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Group Members
    CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
    );

    -- 4. Appliances Table
    CREATE TABLE IF NOT EXISTS appliances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        device_name VARCHAR(255) NOT NULL,
        wattage INTEGER NOT NULL,
        daily_hours INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Billing Sessions Table (MOVED UP)
    CREATE TABLE IF NOT EXISTS billing_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_end TIMESTAMP,
        total_cost DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Payments Table (Now safely references billing_sessions)
    CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        interswitch_ref VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        payment_type VARCHAR(50) DEFAULT 'session_payment',
        description TEXT,
        session_id UUID REFERENCES billing_sessions(id) ON DELETE CASCADE, -- ✅ Foreign key applied here
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Consumption Breakdown Table
    CREATE TABLE IF NOT EXISTS consumption_breakdown (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES billing_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        consumption_kwh DECIMAL(10, 4),
        cost_allocated DECIMAL(10, 2),
        cost_paid DECIMAL(10, 2) DEFAULT 0,
        outstanding DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'calculated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Transaction History Table
    CREATE TABLE IF NOT EXISTS transaction_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50),
        amount DECIMAL(10, 2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    await client.query(createTablesQuery);
    console.log('✅ Database tables are ready to go! All schemas initialized.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  } finally {
    client.release();
  }
};