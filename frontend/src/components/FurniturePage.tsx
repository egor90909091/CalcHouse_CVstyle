import { useState, useRef, useCallback } from "react";

import Header from "./Header";
import Footer from "./Footer";

interface FurnitureItem {
  type: string;
  label: string;
}

interface FurnitureResult {
  name: string;
  image?: string;
  price?: string;
  description?: string;
  link?: string;
}

const STYLE_TRANSLATIONS: Record<string, string> = {
  "Asian": "Азиатский",
  "Boho": "Бохо",
  "Contemporary": "Современный",
  "Country": "Кантри",
  "Eclectic": "Эклектика",
  "Ecostyle": "Экостиль",
  "English Style": "Английский стиль",
  "Futurism": "Футуризм",
  "Loft": "Лофт",
  "Mediterranean (Coastal)": "Средиземноморский",
  "Minimalism": "Минимализм",
  "Modern": "Модерн",
  "Neoclassicism": "Неоклассицизм",
  "Provence": "Прованс",
  "Rustic": "Рустик",
  "Scandinavian": "Скандинавский",
  "Victorian": "Викторианский",
};

function resizeImage(file: File, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context not available"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

const ROOMS: { value: string; label: string; furniture: FurnitureItem[] }[] = [
  {
    value: "Зал",
    label: "Зал",
    furniture: [
      { type: "sofa", label: "Диван" },
      { type: "coffee_table", label: "Журнальный стол" },
      { type: "tv_stand", label: "ТВ тумба" },
      { type: "tv", label: "Телевизор" },
      { type: "armchair", label: "Кресло" },
      { type: "bookshelf", label: "Книжный шкаф" },
    ],
  },
  {
    value: "Спальня",
    label: "Спальня",
    furniture: [
      { type: "bed", label: "Кровать" },
      { type: "tv", label: "Телевизор" },
      { type: "nightstand", label: "Прикроватная тумба" },
      { type: "wardrobe", label: "Шкаф" },
      { type: "dresser", label: "Комод" },
    ],
  },
  {
    value: "Комната",
    label: "Комната (с рабочим местом)",
    furniture: [
      { type: "desk", label: "Рабочий стол" },
      { type: "office_chair", label: "Компьютерный стул" },
      { type: "computer", label: "Монитор/ПК" },
      { type: "laptop", label: "Ноутбук" },
      { type: "bed", label: "Кровать" },
      { type: "shelf", label: "Полка" },
      { type: "table_lamp", label: "Ночник" },
    ],
  },
  {
    value: "Ванная",
    label: "Ванная",
    furniture: [
      { type: "vanity", label: "Тумба с раковиной" },
      { type: "faucet", label: "Кран" },
      { type: "bathroom_mirror", label: "Зеркало" },
      { type: "bathroom_cabinet", label: "Шкафчик" },
    ],
  },
  {
    value: "Туалетная комната",
    label: "Туалетная комната",
    furniture: [
      { type: "toilet", label: "Унитаз" },
      { type: "small_cabinet", label: "Тумба" },
      { type: "sink", label: "Раковина" },
    ],
  },
  {
    value: "Прихожая",
    label: "Прихожая",
    furniture: [
      { type: "coat_rack", label: "Вешалка" },
      { type: "mirror", label: "Зеркало" },
      { type: "shoe_cabinet", label: "Обувница" },
      { type: "console_table", label: "Консоль" },
      { type: "bench", label: "Банкетка" },
    ],
  },
];

export default function FurniturePage() {
  const [image, setImage] = useState<string | null>(null);
  const [room, setRoom] = useState("Зал");
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<FurnitureResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [predictedStyle, setPredictedStyle] = useState<string | null>(null);
  const [predictingStyle, setPredictingStyle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const predictedStyleRawRef = useRef<string | null>(null);
  const originalFileRef = useRef<File | null>(null);

  const predictStyle = useCallback(async (file: File) => {
    setPredictingStyle(true);
    setPredictedStyle(null);
    try {
      const resized = await resizeImage(file, 256, 256);
      const formData = new FormData();
      formData.append("file", resized, "image.jpg");
      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const name = data.predicted_class.name;
          predictedStyleRawRef.current = name;
          setPredictedStyle(STYLE_TRANSLATIONS[name] || name);
        }
      }
    } catch (error) {
      console.error("Style prediction error:", error);
    } finally {
      setPredictingStyle(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      originalFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      predictStyle(file);
    }
  }, [predictStyle]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      originalFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      predictStyle(file);
    }
  }, [predictStyle]);

  const handleFurnitureClick = async (type: string) => {
    setSelectedFurniture(type);
    setLoading(true);
    setSearchResults([]);

    try {
      const response = await fetch("/api/furniture/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: predictedStyleRawRef.current || "Modern",
          furniture: type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && data.data) {
          const results: FurnitureResult[] = Object.entries(data.data).map(
            ([link, info]: [string, any]) => ({
              name: link.split("/").pop() || "Товар",
              image: info.image_url,
              price: info.price ? `${info.price} ₽` : undefined,
              link,
            }),
          );
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } else {
        console.error("Furniture search failed:", response.status);
      }
    } catch (error) {
      console.error("Furniture search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentRoom = ROOMS.find((r) => r.value === room);

  return (
    <div className="page furniture-page">
      <Header />

      <main className="page-main">
        <div className="furniture-main">
          <h1 className="page-title">Подбор мебели по фото</h1>
          <p className="page-subtitle">Загрузите фото комнаты и подберите подходящую мебель</p>

          <div className="furniture-container">
            <div className="upload-section glass-card">
              <div
                className={`drop-zone ${image ? "has-image" : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !image && fileInputRef.current?.click()}
              >
                {!image ? (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Перетащите фото сюда</span>
                    <span className="text-muted">или</span>
                    <button className="btn-secondary">Выбрать файл</button>
                  </div>
                ) : (
                  <div className="preview-state">
                    <img src={image} alt="Загруженное фото" className="preview-image" />
                    <button
                      className="btn-change"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Изменить фото
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </div>

              {predictingStyle && (
                <div className="style-badge predicting">
                  <div className="spinner-small" />
                  <span>Определение стиля...</span>
                </div>
              )}

              {predictedStyle && (
                <div className="style-badge detected">
                  <span className="style-label">Распознанный стиль:</span>
                  <span className="style-value">{predictedStyle}</span>
                </div>
              )}

              <div className="room-selector">
                <label htmlFor="roomSelect">Выберите комнату:</label>
                <select
                  id="roomSelect"
                  value={room}
                  onChange={(e) => {
                    setRoom(e.target.value);
                    setSelectedFurniture(null);
                    setSearchResults([]);
                  }}
                >
                  {ROOMS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="furniture-list-section glass-card">
              <h3>Доступная мебель</h3>
              <div className="furniture-grid">
                {currentRoom?.furniture.map((item) => (
                  <button
                    key={item.type}
                    className={`furniture-btn ${selectedFurniture === item.type ? "active" : ""}`}
                    onClick={() => handleFurnitureClick(item.type)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {selectedFurniture && (
                <div className="search-results">
                  <div className="results-header">
                    <h4>Варианты мебели</h4>
                    {searchResults.length > 0 && (
                      <button
                        className="btn-clear"
                        onClick={() => {
                          setSelectedFurniture(null);
                          setSearchResults([]);
                        }}
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner" />
                      <span>Загрузка вариантов...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="results-grid">
                      {searchResults.map((result, idx) => (
                        <div key={idx} className="result-card">
                          {result.image && <img src={result.image} alt={result.name} />}
                          <div className="result-info">
                            <h5>{result.name}</h5>
                            {result.description && <p>{result.description}</p>}
                            {result.price && <span className="price">{result.price}</span>}
                            {result.link && (
                              <a href={result.link} target="_blank" rel="noopener noreferrer">
                                Подробнее
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-results">Варианты не найдены</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
