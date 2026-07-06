export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-card">
          <h2 className="hero-title">Рассчитайте материалы для строительства дома</h2>
          <p className="hero-text">
            Проект выполнен при поддержке «<strong>Фонда содействия инновациям</strong>»
            в рамках программы «<strong>Студенческий стартап</strong>» федерального проекта
            «<strong>Платформа университетского технологического предпринимательства</strong>»
          </p>

          <div className="hero-logos">
            <img
              src="/static/images/new_proje.png"
              alt="Фонд содействия инновациям"
              className="hero-logo hero-logo-fond"
            />
            <img
              src="/static/images/platform_black.png"
              alt="Платформа университетского технологического предпринимательства"
              className="hero-logo hero-logo-platform hero-logo-platform-light"
            />
            <img
              src="/static/images/platform_white.png"
              alt="Платформа университетского технологического предпринимательства"
              className="hero-logo hero-logo-platform hero-logo-platform-dark"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
