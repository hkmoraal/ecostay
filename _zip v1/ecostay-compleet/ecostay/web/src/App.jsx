import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import StayDetail from './pages/StayDetail.jsx';
import Certify from './pages/Certify.jsx';
import Auditor from './pages/Auditor.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verblijf/:slug" element={<StayDetail />} />
          <Route path="/certificering" element={<Certify />} />
          <Route path="/auditor" element={<Auditor />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
