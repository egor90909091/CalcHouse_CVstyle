import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore } from "../store/useProjectStore";
import type { MaterialsResult } from "../types/project";
import { askAdvisor, buildChatContext, type ChatMessage } from "../api/client";

const MAX_QUESTIONS = 3;
const MAX_INPUT = 1000;
const INITIAL_QUESTION = "Проанализируй смету и дай полезные советы по материалам и строительству.";

interface Props {
  results: MaterialsResult;
}

interface MarkdownComponentProps {
  children?: React.ReactNode;
}

function AdvisorLoader() {
  return (
    <div className="advisor-ripple">
      <div className="advisor-ripple-container">
        <span className="advisor-ripple-ring" />
        <span className="advisor-ripple-ring" />
        <span className="advisor-ripple-ring" />
      </div>
      <span className="advisor-ripple-text">Анализ сметы…</span>
    </div>
  );
}

export default function AdvisorChat({ results }: Props) {
  const project = useStore((s) => s.project);
  const floorsCount = project?.floors_count ?? 1;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsLeft, setQuestionsLeft] = useState(MAX_QUESTIONS);
  const [includeInPrint, setIncludeInPrint] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading]);

  const send = async (question: string) => {
    setLoading(true);
    setError(null);
    try {
      const context = buildChatContext(results, floorsCount);
      const history = [...messages];
      const answer = await askAdvisor(context, messages, question);
      history.push({ role: "user", content: question });
      history.push({ role: "assistant", content: answer });
      setMessages(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить ответ");
    } finally {
      setLoading(false);
    }
  };

  const handleInitial = () => {
    send(INITIAL_QUESTION);
  };

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading || questionsLeft <= 0) return;
    setQuestionsLeft((n) => n - 1);
    setInput("");
    send(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    setError(null);
    send(messages.length > 0 ? messages[messages.length - 1].content : INITIAL_QUESTION);
  };

  const chatClass = includeInPrint ? "advisor-chat printable" : "advisor-chat";
  const isStarted = messages.length > 0;
  const inputDisabled = questionsLeft <= 0 || loading;

  return (
    <div className="advisor-section">
      <div className={chatClass}>
        <div className="advisor-chat-header">
          <div className="advisor-chat-title">
            <svg className="advisor-icon" viewBox="0 0 24 24" fill="none" width="22" height="22">
              <path d="M12 2L3 7l9 5 9-5-9-5z" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M3 12l9 5 9-5M3 17l9 5 9-5" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" opacity="0.5"/>
            </svg>
            <h3>ИИ-консультант по строительству</h3>
          </div>
          {isStarted && (
            <label className="advisor-print-toggle">
              <input
                type="checkbox"
                checked={includeInPrint}
                onChange={(e) => setIncludeInPrint(e.target.checked)}
              />
              В печать
            </label>
          )}
        </div>

        {!isStarted && !loading && (
          <div className="advisor-empty">
            <div className="advisor-empty-icon">
              <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
                <circle cx="24" cy="24" r="22" stroke="var(--accent)" strokeWidth="2" opacity="0.15"/>
                <path d="M24 8L12 14v10c0 7 5.5 12 12 14 6.5-2 12-7 12-14V14L24 8z" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M20 24l3 3 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Советы по вашей смете</h4>
            <p className="advisor-hint">
              ИИ-консультант проанализирует материалы и конструкции из вашей сметы
              и даст конкретные советы — с цифрами и параметрами, применимыми на стройке
            </p>
            <button className="advisor-cta" onClick={handleInitial} disabled={false}>
              Получить советы по смете
            </button>
          </div>
        )}

        {!isStarted && loading && <AdvisorLoader />}

        {isStarted && (
          <div className="advisor-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`advisor-msg advisor-msg--${msg.role}`}>
                {msg.role === "assistant" && <span className="advisor-msg__eyebrow">КОНСУЛЬТАНТ</span>}
                <div className="advisor-msg__body">
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children: c }: MarkdownComponentProps) => <h2>{c}</h2>,
                        table: ({ children: c }: MarkdownComponentProps) => <div className="advisor-table-wrap"><table>{c}</table></div>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="advisor-msg advisor-msg--assistant">
                <span className="advisor-msg__eyebrow">КОНСУЛЬТАНТ</span>
                <div className="advisor-msg__body">
                  <div className="advisor-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {error && (
          <div className="advisor-error">
            <span>{error}</span>
            <button className="advisor-retry" onClick={handleRetry}>
              Повторить
            </button>
          </div>
        )}

        {isStarted && !error && (
          <div className="advisor-input-row">
            {inputDisabled ? (
              <div className="advisor-limit-reached">Лимит вопросов исчерпан</div>
            ) : (
              <>
                <textarea
                  className="advisor-input"
                  placeholder="Спросите о материалах, технологиях, стоимости…"
                  value={input}
                  maxLength={MAX_INPUT}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button className="advisor-send" onClick={handleSend} disabled={loading || !input.trim()}>
                  Отправить
                </button>
              </>
            )}
            <div className="advisor-counter">
              {input.length}/{MAX_INPUT} · Вопросов осталось: {questionsLeft}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}