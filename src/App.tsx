import { NavLink, BrowserRouter, Routes, Route } from 'react-router-dom';
import { AddProductPage } from './pages/AddProductPage';
import { HomePage } from './pages/HomePage';
import { useDiaryStore } from './store/useDiaryStore';

export default function App() {
  const selectedDate = useDiaryStore((state) => state.selectedDate);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header>
          <div>
            <p className="eyebrow">eat2track · телеграм мини-апп</p>
            <h1>Дневник питания</h1>
          </div>
          <div className="header-right">
            <div className="today-chip">{selectedDate}</div>
            <nav className="nav-buttons">
              <NavLink to="/" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
                Домой
              </NavLink>
              <NavLink to="/add" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
                Добавить
              </NavLink>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add" element={<AddProductPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
