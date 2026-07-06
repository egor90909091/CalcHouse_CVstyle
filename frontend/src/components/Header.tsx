import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 2.5L3 9.7v11.8h18V9.7L12 2.5zM16 18.5h-3v-3h-2v3H8V13l4-3.4 4 3.4v5.5z" />
            </svg>
          </span>
          <span className="brand-name">BuildMate</span>
          <span className="brand-suffix">СтройНапарник</span>
        </Link>

        <nav className="site-nav">
          <Link to="/" className={pathname === "/" ? "active" : ""}>
            Конструктор
          </Link>
          <Link to="/furniture" className={pathname === "/furniture" ? "active" : ""}>
            Подбор мебели
          </Link>
        </nav>

        <div className="site-header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
