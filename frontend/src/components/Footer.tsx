import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand">
          <div className="footer-brand-name">BuildMate — СтройНапарник</div>
          <p className="footer-description">
            Калькулятор материалов для строительства дома — точно знайте, что и сколько вам нужно.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Навигация</h4>
          <ul className="footer-links">
            <li><Link to="/">Конструктор</Link></li>
            <li><Link to="/furniture">Подбор мебели</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-title">Связаться с нами</h4>
          <div className="footer-contacts">
            <a className="footer-contact-item" href="mailto:arturraush@outlook.com">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>arturraush@outlook.com</span>
            </a>
            <a className="footer-contact-item" href="tel:+79373060257">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span>8 (937) 30-60-257</span>
            </a>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>© 2025-2026 BuildMate — СтройНапарник.</p>
      </div>
    </footer>
  );
}
