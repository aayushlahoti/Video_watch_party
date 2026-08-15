import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { RoomProvider } from './context/RoomContext.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import Navbar from './components/Navbar/Navbar.jsx';

import Home from './pages/Home/Home.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import CreateRoom from './pages/CreateRoom/CreateRoom.jsx';
import JoinRoom from './pages/JoinRoom/JoinRoom.jsx';
import Room from './pages/Room/Room.jsx';

import './styles/globals.css';

const App = () => {
  return (
    <AuthProvider>
      <RoomProvider>
        <Router>
          <Navbar />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/create-room"
                element={
                  <ProtectedRoute>
                    <CreateRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join-room"
                element={
                  <ProtectedRoute>
                    <JoinRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join"
                element={
                  <ProtectedRoute>
                    <JoinRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room/:id"
                element={
                  <ProtectedRoute>
                    <Room />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </Router>
      </RoomProvider>
    </AuthProvider>
  );
};

export default App;
