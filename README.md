# MeterMate ⚡💡

> **Smart Shared Electricity Management for Households & Groups**

Split electricity bills fairly based on actual appliance consumption, not guesswork.

![MeterMate](/metermate-frontend/public/logo.png)

## 🎯 What is MeterMate?

MeterMate solves the common problem of splitting electricity bills fairly among roommates or flat mates. Instead of equal splits, it uses an intelligent cost-allocation algorithm that calculates each person's share based on:

- **Appliances they own/use**
- **Power consumption (Watts)**
- **Usage duration (hours per day)**

The system then allocates costs fairly and provides a transparent breakdown of who owes what.

## ✨ Key Features

### 💰 Smart Cost Allocation
- Calculates consumption per member based on appliances
- Allocates costs proportionally (exact to the Naira)
- Handles multiple billing sessions
- Comprehensive settlement tracking

### 👥 Group Management
- **Host creates groups** and invites members
- **Members can join** via email invitations
- **Members can leave anytime** (soft exit)
- **Host can delete entire group** (cascades properly)
- Track who joined and when

### 🔌 Appliance Ledger
- Log appliances with wattage and daily usage
- **Grouped by member** (collapsible interface)
- Delete own appliances anytime
- Real-time consumption calculations
- Visual breakdown of who uses what

### 💳 Payment Integration
- **Interswitch WebPAY** integration for real payments
- Secure payment initialization and verification
- Real API verification with retry logic
- Payment status tracking (Pending/Successful/Failed)

### 📊 Transaction History
- Complete audit trail of all payments
- Timestamp on each transaction
- Filter and sort transactions
- Settlement breakdown per member

### 🗑️ Delete Functionality
- **Host:** Delete entire group (includes all data cascades)
- **Member:** Leave group anytime (soft exit)
- **Owner:** Delete own appliances (soft delete)
- No data loss - cascading deletions handle cleanup

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18 + Vite | Modern, fast UI |
| **Styling** | Tailwind CSS + CSS Modules | Beautiful, responsive design |
| **Backend** | Node.js + Express | RESTful API |
| **Database** | PostgreSQL | Reliable data storage |
| **Calculations** | Python + FastAPI | Intelligent cost allocation |
| **Payments** | Interswitch | Secure transactions |

### Database Schema

```sql
-- Core Tables
users              -- User accounts
meter_groups       -- Electrical meter groups
group_members      -- Many-to-many membership
appliances         -- Devices in groups
payments           -- Payment transactions

-- NEW: Billing Management
billing_sessions   -- Track charging periods
consumption_breakdown -- Cost per member per session
transaction_history   -- Complete payment audit trail
```

### Calculation Engine (Python)

The FastAPI microservice handles:
1. **Consumption Calculation** - Convert wattage to kWh
2. **Cost Allocation** - Distribute costs proportionally
3. **Settlement Tracking** - Determine outstanding balances

**Algorithm:**
```
Daily kWh = (Wattage / 1000) × Daily Hours
Percentage = User Consumption / Total Consumption
Cost Share = Percentage × Total Cost
```

---

## 🚀 Getting Started

### Quick Start (3 steps)

#### 1. Install Backend
```bash
cd backend
npm install
# Create .env with database credentials
npm start
```

#### 2. Install Python Engine
```bash
cd python-engine
pip install -r requirements.txt
python main.py
```

#### 3. Install Frontend
```bash
cd metermate-frontend
npm install
npm run dev
```

**That's it!** Your local instance is now running on `http://localhost:5173`

### Full Setup Guide

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- Detailed installation instructions
- Environment variable configuration
- Database initialization
- Interswitch integration
- Testing checklist
- Deployment options

---

## 📖 Usage Workflow

### 1. Create a Group
- **Host** creates a meter group
- Specifies electricity provider (IKEDC, AEDC, etc.)
- Sets meter number (verified with grid)
- Sets bill target amount (e.g., ₦50,000)

### 2. Invite Members
- **Host** invites members by email
- Members automatically added to group
- Can join multiple groups

### 3. Log Appliances
- Each member logs their devices
- Specify: Device name, Wattage, Daily hours
- E.g., AC: 3500W × 8h = 28 kWh/day

### 4. Pool Money
- Members make payments via Interswitch
- Each pays their calculated share
- Payments tracked and verified

### 5. Settlement
- View transaction history
- See detailed breakdown
- Settle group for next billing period
- Start new session anytime

### 6. Manage Group
- Leave group anytime (member)
- Delete group (host)
- Delete appliances (owner)
- Modify membership

---

## 🔐 Security & Privacy

✅ JWT authentication on all endpoints
✅ SQL injection prevention
✅ Role-based access control (host vs member)
✅ Server-side authorization checks
✅ Secure payment verification with Interswitch
✅ Transaction audit trail
✅ Soft deletes preserve data history

---

## 🎨 User Interface

### Dashboard
- Overview of all groups
- Progress bars showing funding status
- Quick stats (target, collected, percentage)
- Create new group / Delete group buttons
- Beautiful gradient cards with hover effects

### Group Detail Page
- **Left:** Funding status, members, payment button
- **Center-Right:** Appliance ledger grouped by member
- **Bottom-Right:** Complete transaction history
- Member-specific options (leave/delete based on role)

### Components
- **AppliancesByMember** - Collapsible accordion interface
- **TransactionHistory** - Timeline with status badges
- **SettlementModal** - Cost breakdown confirmation

---

## 📊 Example

### Scenario
- Group Target: ₦100,000
- Members: Alice, Bob, Charlie

### Appliances
- Alice: AC (3500W × 8h = 28 kWh), Fridge (600W × 24h = 14.4 kWh) = **42.4 kWh**
- Bob: TV (100W × 6h = 0.6 kWh), Fan (75W × 10h = 0.75 kWh) = **1.35 kWh**
- Charlie: Heater (5000W × 4h = 20 kWh) = **20 kWh**

### Total Consumption: 63.75 kWh

### Cost Allocation
- Alice: (42.4 / 63.75) × ₦100,000 = **₦66,535**
- Bob: (1.35 / 63.75) × ₦100,000 = **₦2,118**
- Charlie: (20 / 63.75) × ₦100,000 = **₦31,373** (gets remainder to ensure ₦100,000 total)

### Result
Fair, transparent, justified by actual usage! ✓

---

## 🧪 Testing

Run the comprehensive testing checklist:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd metermate-frontend
npm test

# Python engine tests
cd python-engine
pytest
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md#-testing-checklist) for full checklist.

---

## 🚀 Deployment

### Backend
- Heroku, AWS, DigitalOcean, or any Node.js host
- Set environment variables
- Database must be publicly accessible or on same network

### Frontend
- Vercel, Netlify, GitHub Pages, or any static host
- Build: `npm run build`
- Deploy `dist/` folder

### Python Engine
- Docker container
- AWS Lambda, Google Cloud Run
- Or co-host with backend

See [SETUP_GUIDE.md](./SETUP_GUIDE.md#-deployment) for detailed deployment instructions.

---

## 📋 API Documentation

### Authentication
```
POST /api/auth/register     - Create account
POST /api/auth/login        - Get JWT token
```

### Groups
```
POST   /api/groups/create           - Create meter group
GET    /api/groups/my-groups        - Get user's groups
GET    /api/groups/:id              - Get group details
POST   /api/groups/invite           - Invite member
DELETE /api/groups/:id              - Delete group (host)
DELETE /api/groups/:id/leave        - Leave group (member)
```

### Appliances
```
POST   /api/appliances/add              - Add device
GET    /api/appliances/:group_id        - Get devices
DELETE /api/appliances/:id              - Delete device (owner)
```

### Payments
```
POST /api/payments/initialize       - Start payment
POST /api/payments/verify           - Verify with Interswitch
GET  /api/payments/history/:group_id - Get transactions
```

Full API docs see [SETUP_GUIDE.md](./SETUP_GUIDE.md#-api-endpoints-reference)

---

## 📁 Project Structure

```
MeterMate Workspace/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # Database setup
│   │   ├── controllers/              # Request handlers
│   │   ├── middlewares/              # Auth, error handling
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # Business logic
│   │   ├── utils/                    # Utilities
│   │   └── server.js                 # Express app
│   ├── package.json
│   └── .env
│
├── metermate-frontend/
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   ├── components/               # Reusable components
│   │   ├── services/                 # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── python-engine/
│   ├── main.py                       # FastAPI app
│   ├── requirements.txt              # Python deps
│   └── README.md
│
├── SETUP_GUIDE.md                    # Setup instructions
└── README.md                         # This file
```

---

## 🎯 Features Checklist

### ✅ Completed
- [x] User authentication (register/login)
- [x] Group management (create/delete/leave)
- [x] Member management (invite/track)
- [x] Appliance ledger with soft delete
- [x] Consumption calculations
- [x] Cost allocation (exact to Naira)
- [x] Payment integration (Interswitch)
- [x] Transaction history
- [x] Settlement tracking
- [x] Beautiful UI with Tailwind CSS
- [x] Responsive mobile design
- [x] Database cascading deletes
- [x] Real Interswitch API integration
- [x] Python FastAPI microservice
- [x] Retry logic for payments
- [x] Security & access control

### 🚀 Future Enhancements
- [ ] Automated billing cycles
- [ ] Notifications & reminders
- [ ] Multiple payment methods
- [ ] Financial reports & analytics
- [ ] Dark theme
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Integration with bill payment APIs

---

## 🤝 Contributing

This is a hackathon project. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

Built for hackathon competition. Feel free to use, modify, and share!

---

## 💬 Questions?

Refer to:
- **Setup:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Python Engine:** [python-engine/README.md](./python-engine/README.md)
- **Backend:** Check `backend/` files
- **Frontend:** Check `metermate-frontend/` files

---

## 🎉 Credits

Built with ❤️ for the hackathon.

**Let's make shared electricity expenses fair and transparent!** ⚡💡

---

**Last Updated:** March 2026
**Status:** Production Ready ✓
