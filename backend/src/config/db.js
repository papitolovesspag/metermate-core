import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString,
  ...(isProduction && {
    ssl: {
      rejectUnauthorized: false
    }
  })
});

export const initDB = async () => {
  if (!connectionString) {
    console.error('DATABASE_URL is missing. Set it in backend/.env before starting the API.');
    return false;
  }

  let client = null;
  try {
    client = await pool.connect();
    console.log('Checking and initializing database tables...');

    const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meter_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      host_id UUID REFERENCES users(id) ON DELETE CASCADE,
      meter_number VARCHAR(100) NOT NULL,
      target_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'Funding',
      current_balance DECIMAL(10, 2) DEFAULT 0.00,
      cycle_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_session UUID,
      can_start_new_session BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, user_id)
    );

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

    CREATE TABLE IF NOT EXISTS billing_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
      session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      session_end TIMESTAMP,
      total_cost DECIMAL(10, 2),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      interswitch_ref VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      payment_type VARCHAR(50) DEFAULT 'session_payment',
      description TEXT,
      session_id UUID REFERENCES billing_sessions(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS transaction_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      transaction_type VARCHAR(50),
      amount DECIMAL(10, 2),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meter_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(60) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_meter_notifications_group_created
      ON meter_notifications (group_id, created_at DESC);

    ALTER TABLE meter_groups
      ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    UPDATE meter_groups
      SET cycle_started_at = COALESCE(cycle_started_at, created_at, CURRENT_TIMESTAMP);
    `;

    await client.query(createTablesQuery);
    console.log('Database tables are ready.');
    return true;
  } catch (error) {
    console.error('Error initializing database tables:', error);
    return false;
  } finally {
    if (client) client.release();
  }
};
