import { useEffect, useState } from "react";

export default function SuggestTab({ userId, username }) {
  const [type, setType] = useState("question");
  const [categories, setCategories] = useState([]);
  const [mySuggestions, setMySuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState("form"); 


  const [categoryName, setCategoryName] = useState("");


  const [selectedCategory, setSelectedCategory] = useState("");
  const [difficulty, setDifficulty] = useState(100);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [message, setMessage] = useState(null); 

  useEffect(() => {
    fetchCategories();
    fetchMySuggestions();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:3000/admin/categories");
      const data = await res.json();
      setCategories(data);
    } catch {}
  };

  const fetchMySuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/suggestions/${userId}`);
      const data = await res.json();
      setMySuggestions(data.suggestions || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setSending(true);
    setMessage(null);

    const body = {
      userId, username, type,
      ...(type === "category" && { categoryName }),
      ...(type === "question" && {
        categoryId: selectedCategory,
        categoryDisplayName: categories.find(c => c._id === selectedCategory)?.name,
        difficulty,
        question,
        answers,
        correctIndex,
      }),
    };

    try {
      const res = await fetch("http://localhost:3000/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ text: "Zgłoszenie wysłane! Czeka na zatwierdzenie przez admina.", ok: true });
      // Reset formularza
      setCategoryName("");
      setQuestion("");
      setAnswers(["", "", "", ""]);
      setCorrectIndex(0);
      setSelectedCategory("");
      fetchMySuggestions();
    } catch (err) {
      setMessage({ text: err.message || "Błąd wysyłania", ok: false });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "pending")  return <span className="text-yellow-400 text-xs font-black uppercase">⏳ Oczekuje</span>;
    if (status === "approved") return <span className="text-green-400 text-xs font-black uppercase">✓ Zatwierdzone</span>;
    if (status === "rejected") return <span className="text-red-400 text-xs font-black uppercase">✗ Odrzucone</span>;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  return (
    <div className="space-y-3">
      {/* Przełącznik widoku */}
      <div className="flex rounded-xl overflow-hidden border border-blue-800">
        <button
          onClick={() => setView("form")}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${view === "form" ? "bg-blue-950 text-yellow-400" : "bg-blue-900 text-blue-400 hover:text-blue-200"}`}
        >
          📝 Nowe zgłoszenie
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${view === "history" ? "bg-blue-950 text-yellow-400" : "bg-blue-900 text-blue-400 hover:text-blue-200"}`}
        >
          📋 Moje zgłoszenia
        </button>
      </div>

      {/* ===== FORMULARZ ===== */}
      {view === "form" && (
        <div className="space-y-3">
          {/* Typ zgłoszenia */}
          <div className="flex rounded-xl overflow-hidden border border-blue-800">
            <button
              onClick={() => setType("question")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${type === "question" ? "bg-indigo-700 text-yellow-400" : "bg-blue-950 text-blue-400 hover:text-blue-200"}`}
            >
              ❓ Pytanie
            </button>
            <button
              onClick={() => setType("category")}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${type === "category" ? "bg-indigo-700 text-yellow-400" : "bg-blue-950 text-blue-400 hover:text-blue-200"}`}
            >
              📁 Kategoria
            </button>
          </div>

          {/* Formularz kategorii */}
          {type === "category" && (
            <div className="space-y-2">
              <p className="text-blue-300 text-xs uppercase tracking-widest">Nazwa nowej kategorii</p>
              <input
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                placeholder="np. Astronomia, Muzyka klasyczna..."
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-blue-600 focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
          )}

          {/* Formularz pytania */}
          {type === "question" && (
            <div className="space-y-2">
              <p className="text-blue-300 text-xs uppercase tracking-widest">Kategoria</p>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors"
              >
                <option value="">Wybierz kategorię</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>

              <p className="text-blue-300 text-xs uppercase tracking-widest">Trudność</p>
              <select
                value={difficulty}
                onChange={e => setDifficulty(Number(e.target.value))}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors"
              >
                {[100, 200, 300, 400, 500].map(d => (
                  <option key={d} value={d}>{d} pkt</option>
                ))}
              </select>

              <p className="text-blue-300 text-xs uppercase tracking-widest">Treść pytania</p>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Wpisz treść pytania..."
                rows={2}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-blue-600 focus:outline-none focus:border-yellow-400 transition-colors resize-none"
              />

              <p className="text-blue-300 text-xs uppercase tracking-widest">Odpowiedzi</p>
              {answers.map((ans, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => setCorrectIndex(i)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all cursor-pointer ${correctIndex === i ? "bg-green-500 border-green-400" : "border-blue-600 hover:border-green-500"}`}
                  />
                  <input
                    value={ans}
                    onChange={e => {
                      const updated = [...answers];
                      updated[i] = e.target.value;
                      setAnswers(updated);
                    }}
                    placeholder={`Odpowiedź ${i + 1}${correctIndex === i ? " ✓ poprawna" : ""}`}
                    className="flex-1 bg-blue-950 border border-blue-700 rounded-xl px-3 py-2 text-white text-sm placeholder-blue-600 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>
              ))}
              <p className="text-blue-500 text-xs">Kliknij kółko przy odpowiedzi aby zaznaczyć poprawną</p>
            </div>
          )}

          {/* Komunikat */}
          {message && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${message.ok ? "bg-green-500/20 border border-green-500 text-green-400" : "bg-red-500/20 border border-red-500 text-red-400"}`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 font-black uppercase tracking-wider hover:bg-indigo-600 hover:border-orange-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Wysyłanie..." : "📨 Wyślij zgłoszenie"}
          </button>
        </div>
      )}

      {/* ===== HISTORIA ZGŁOSZEŃ ===== */}
      {view === "history" && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Twoje zgłoszenia</p>
            <button onClick={fetchMySuggestions} className="text-blue-500 hover:text-blue-300 text-xs uppercase tracking-wider cursor-pointer">↻ Odśwież</button>
          </div>

          {loading && (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-yellow-400 rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {!loading && mySuggestions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-600 text-sm uppercase tracking-widest">Brak zgłoszeń</p>
            </div>
          )}

          {!loading && mySuggestions.map(s => (
            <div key={s._id} className="bg-blue-950 rounded-xl p-3 border border-blue-800 space-y-1">
              <div className="flex justify-between items-start">
                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${s.type === "category" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {s.type === "category" ? "📁 Kategoria" : "❓ Pytanie"}
                </span>
                {statusBadge(s.status)}
              </div>

              {s.type === "category" && (
                <p className="text-white text-sm font-semibold">{s.categoryName}</p>
              )}

              {s.type === "question" && (
                <>
                  <p className="text-white text-sm font-semibold leading-snug">{s.question}</p>
                  <p className="text-blue-400 text-xs">{s.categoryDisplayName} · {s.difficulty} pkt</p>
                </>
              )}

              {s.status === "rejected" && s.adminNote && (
                <p className="text-red-400 text-xs italic">Powód: {s.adminNote}</p>
              )}

              <p className="text-blue-600 text-xs">{formatDate(s.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}