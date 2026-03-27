// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/groupDetail';

function App() {
  return (
    <Router>
      <Toaster position="top-center" /> 
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/group/:id" element={<GroupDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
