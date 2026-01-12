import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './features/auth/Register';
import Login from './features/auth/Login';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Cinema from './pages/Cinema';
import AdminPanel from './pages/AdminPanel';
import Arena from './pages/Arena';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/cinema" element={<Cinema />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/arena" element={<Arena />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
