# MeterMate - Complete Setup Guide

## 🚀 Project Overview

MeterMate is a shared electricity expense management platform featuring:
- ✅ **Database Schema** - Fully optimized PostgreSQL with cascading deletes
- ✅ **Python FastAPI Microservice** - Intelligent cost calculation engine
- ✅ **Node.js Backend** - Express API with Interswitch payment integration
- ✅ **React Frontend** - Modern, responsive UI with Tailwind CSS + CSS Modules
- ✅ **Real Interswitch Integration** - Production-ready payment verification
- ✅ **Delete Functionality** - Host can delete groups, members can leave
- ✅ **Transaction History** - Full payment audit trail
- ✅ **Appliances Management** - Grouped by member with soft delete support

---

## 📦 Installation Guide

### Prerequisites

- Node.js 16+ and npm
- Python 3.9+
- PostgreSQL 12+
- Git

### Backend Setup

#### 1. Install Node Dependencies

```bash
cd backend
npm install
```

#### 2. Database Configuration

Create a `.env` file in the `backend` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metermate
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
JWT_SECRET=your_jwt_secret_key_here

# Interswitch Configuration
INTERSWITCH_API_URL=https://sandbox.interswitchng.com/api/v2
INTERSWITCH_PASSPORT_URL=https://sandbox.interswitchng.com/api/v2.0/oauth2/oauth/authorize
INTERSWITCH_CLIENT_ID=your_client_id
INTERSWITCH_SECRET_KEY=your_secret_key
INTERSWITCH_TERMINAL_ID=3TLP0001

# Python Engine
PYTHON_ENGINE_URL=http://localhost:8001
```

#### 3. Initialize Database

The database schema will auto-initialize on first server startup. Tables created:
- `users`
- `meter_groups`
- `group_members`
- `appliances`
- `payments`
- `billing_sessions` *(NEW)*
- `consumption_breakdown` *(NEW)*
- `transaction_history` *(NEW)*

#### 4. Start Backend Server

```bash
npm start
# Server runs on http://localhost:5000
```

---

### Python Calculation Engine Setup

#### 1. Create Virtual Environment

```bash
cd python-engine
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Create `.env` File

```env
PORT=8001
LOG_LEVEL=INFO
```

#### 4. Start Python Engine

```bash
python main.py
# Engine runs on http://localhost:8001
```

**API Endpoints:**
- `GET /` - Health check
- `POST /calculate/consumption` - Calculate kWh per user
- `POST /calculate/cost-allocation` - Calculate exact cost distribution
- `POST /calculate/settlement` - Calculate settlement status

---

### Frontend Setup

#### 1. Install Dependencies

```bash
cd metermate-frontend
npm install
```

#### 2. Create `.env` File

```env
VITE_API_URL=http://localhost:5000/api
```

#### 3. Start Development Server

```bash
npm run dev
# Frontend runs on http://localhost:5173
```

#### 4. Build for Production

```bash
npm run build
# Outputs to `dist/`
```

---

## 📋 API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Groups
- `POST /api/groups/create` - Create meter group
- `GET /api/groups/my-groups` - Get user's groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/invite` - Invite member
- `DELETE /api/groups/:id` - Delete group (host only)
- `DELETE /api/groups/:id/leave` - Leave group (members)

### Appliances
- `POST /api/appliances/add` - Add appliance
- `GET /api/appliances/:group_id` - Get group's appliances
- `DELETE /api/appliances/:id` - Delete appliance (owner only)

### Payments
- `POST /api/payments/initialize` - Start payment session
- `POST /api/payments/verify` - Verify payment from Interswitch
- `GET /api/payments/history/:group_id` - Get transaction history

### Sessions
- `POST /api/sessions/create` - Create billing session
- `GET /api/sessions/history/:group_id` - Get billing history
- `POST /api/sessions/settle` - Mark session as settled

---

## 💳 Interswitch Integration

### Configuration Steps

1. Create a business account at [Interswitch Developer Portal](https://developer.interswitchng.com)

2. Get your credentials:
   - Client ID
   - Secret Key
   - Terminal ID (typically provided as 3TLP0001 for test)

3. Add to `.env`:
   ```env
   INTERSWITCH_CLIENT_ID=your_client_id
   INTERSWITCH_SECRET_KEY=your_secret_key
   ```

4. **Payment Verification Flow:**
   - Frontend initiates payment via Interswitch WebPAY modal
   - After completion, frontend calls `/api/payments/verify`
   - Backend verifies with Interswitch API (with retry logic)
   - If verified, balance is updated and transaction is recorded
   - Fallback to mock verification if service unavailable (for demos)

### Testing

Use these test credentials in sandbox mode:
- **Merchant Code:** MX007
- **Pay Item ID:** 101007
- **Mode:** TEST
- **Test Meter Numbers:** Any valid Nigerian meter number format

---

## 🎨 UI Features

### Dashboard
- Beautiful gradient cards showing group status and progress
- Real-time progress bars with color indicators
- Quick action buttons (View Details, Delete, Leave)
- Create new group form with validation

### Group Detail Page
- Funding status with progress tracking
- Members list with join dates
- **Appliances grouped by member** (collapsible accordion)
- **Transaction history** - Full payment audit trail with timestamps
- Settlement breakdown showing who owes what
- Invite members form (host only)
- Delete group / Leave group buttons

### New Components
1. **AppliancesByMember** - Accordion showing each member's devices
2. **TransactionHistory** - Timeline of all payments
3. **SettlementModal** - Cost breakdown and payment summary

### Styling
- Tailwind CSS for responsive design
- CSS Modules for component-scoped styling
- Smooth animations and transitions
- Mobile-first responsive design
- Dark hover states and focus indicators

---

## 🔐 Security Features

- ✅ JWT authentication on all protected routes
- ✅ SQL injection prevention (parameterized queries)
- ✅ Group membership verification before operations
- ✅ Host-only operations enforced server-side
- ✅ Soft deletes for audit trail
- ✅ Transaction safety with database rollback
- ✅ MAC signature authentication with Interswitch
- ✅ No sensitive data in localStorage beyond JWT

---

## 🧮 Cost Calculation Algorithm

### Consumption Calculation
```
Daily kWh = (Wattage / 1000) × Daily Hours
User Total kWh = Sum of all their appliances' daily kWh
```

### Cost Allocation (Exact to Naira)
```
Cost per User = (User Consumption / Total Consumption) × Total Cost
Last User = Total Cost - Sum of all others (ensures exact match)
All amounts rounded to 2 decimals (Naira precision)
```

### Example
```
Group Total: ₦50,000
User A: 30 kWh (60%) → ₦30,000
User B: 20 kWh (40%) → ₦20,000
Total = ₦50,000 ✓
```

---

## 🧪 Testing Checklist

### Backend
- [ ] All database tables created successfully
- [ ] JWT auth working on protected routes
- [ ] Group creation with Interswitch validation
- [ ] Payment initialization and verification
- [ ] Delete group - cascade deletes members, appliances, payments
- [ ] Leave group - removes user from group_members
- [ ] Delete appliance - soft delete (status = 'inactive')
- [ ] Transaction history endpoint returns payments only

### Frontend
- [ ] Login/Register flow
- [ ] Display user's groups on dashboard
- [ ] Create new group with provider selection
- [ ] Delete group (if host)
- [ ] Leave group (if member)
- [ ] View group details
- [ ] Appliances grouped by member (accordion)
- [ ] Add appliance to group
- [ ] Delete appliance (if owner)
- [ ] Invite member by email
- [ ] Payment flow with Interswitch modal
- [ ] Transaction history displays
- [ ] Settlement modal shows correct amounts

### Integration
- [ ] Python engine responsive at http://localhost:8001
- [ ] Backend can call Python engine for calculations
- [ ] Fallback to equal split if engine down
- [ ] Interswitch verification with real API calls
- [ ] Retry logic works on payment verification timeout
- [ ] Full workflow: create → invite → add appliances → fund → settle

---

## 🚀 Deployment

### Backend (Node.js)

#### Option 1: Heroku
```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create metermate-backend

# Set environment variables
heroku config:set DB_HOST=your_db_host
heroku config:set INTERSWITCH_CLIENT_ID=your_id
# ... etc

# Deploy
git push heroku main
```

#### Option 2: AWS/DigitalOcean
```bash
# Build Docker image
docker build -t metermate:latest -f Dockerfile .

# Push and deploy
```

### Frontend (React)

#### Option 1: Vercel
```bash
npm install -g vercel
vercel
```

#### Option 2: Netlify
```bash
npm run build
# Drag and drop `dist/` folder to Netlify
```

#### Option 3: GitHub Pages
```bash
npm run build
# Deploy `dist/` folder
```

### Python Engine

#### Docker Deployment
```bash
cd python-engine
docker build -t metermate-engine:latest .
docker run -p 8001:8001 metermate-engine:latest
```

---

## 📝 Environment Variables Summary

### Backend (.env)
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
PORT, JWT_SECRET
INTERSWITCH_API_URL, INTERSWITCH_PASSPORT_URL
INTERSWITCH_CLIENT_ID, INTERSWITCH_SECRET_KEY, INTERSWITCH_TERMINAL_ID
PYTHON_ENGINE_URL
```

### Frontend (.env)
```
VITE_API_URL
```

### Python Engine (.env)
```
PORT, LOG_LEVEL
```

---

## 🪦 Troubleshooting

### Database Connection Error
```bash
# Verify PostgreSQL is running
# Check credentials in .env
# Ensure database exists
createdb metermate
```

### Python Engine Not Responding
```bash
# Check it's running on port 8001
curl http://localhost:8001

# Verify requirements installed
pip install -r requirements.txt
```

### Interswitch Verification Failing
- Check credentials in .env
- Verify API URLs are correct
- Check network connectivity
- Look at server logs for detailed error
- Use mock fallback for demos

### Frontend API Connection Failed
- Verify backend running on correct port
- Check VITE_API_URL in .env
- Check CORS is enabled in backend
- Verify JWT token in localStorage

---

## 📚 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  (Dashboard, GroupDetail, Modals, Components)               │
└─────────────────────────────────────────────────────────────┘
                          ↕ (HTTP)
┌─────────────────────────────────────────────────────────────┐
│              Node.js Express Backend (5000)                  │
│  Routes: Auth, Groups, Appliances, Payments, Sessions      │
└─────────────────────────────────────────────────────────────┘
           ↕ (HTTP)              ↕ (Direct)
      ┌─────────────────┐    ┌─────────────────┐
      │  Python Engine  │    │  PostgreSQL DB  │
      │   (FastAPI)     │    │      (8001)     │
      │  Calculations   │    │                 │
      └─────────────────┘    └─────────────────┘
           ↕ (HTTP)
    ┌─────────────────┐
    │   Interswitch   │
    │      API        │
    │   (Payments)    │
    └─────────────────┘
```

---

## 🎯 Next Steps

1. **Install all components** as per setup guide
2. **Start all three services** (Backend, Python, Frontend)
3. **Run tests** against the checklist above
4. **Deploy** to your chosen platform
5. **Monitor** logs for errors
6. **Scale** as needed

---

## 📞 Support

For issues or questions:
1. Check logs in each service
2. Verify all environment variables are set
3. Test API endpoints with Postman/curl
4. Review troubleshooting section above

---

**Happy Metering! ⚡💡**
