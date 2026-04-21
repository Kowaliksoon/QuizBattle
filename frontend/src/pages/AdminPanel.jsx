import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";

export default function AdminPanel() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [difficulty, setDifficulty] = useState(100);
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [suggFilter, setSuggFilter] = useState("pending");
  const [rejectNote, setRejectNote] = useState({});
  const [activeTab, setActiveTab] = useState("categories");

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchSuggestions(); }, [suggFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:3000/admin/categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      enqueueSnackbar("Nie udało się pobrać kategorii", { variant: "error" });
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`http://localhost:3000/admin/suggestions?status=${suggFilter}`);
      const data = await res.json();
      setSuggestions(data);
    } catch {}
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await fetch("http://localhost:3000/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });
      if (!res.ok) throw new Error();
      const cat = await res.json();
      setNewCategory("");
      fetchCategories();
      enqueueSnackbar(`Dodano kategorię: ${cat.name}`, { variant: "success" });
    } catch {
      enqueueSnackbar("Nie udało się dodać kategorii", { variant: "error" });
    }
  };

  const createQuestion = async () => {
    if (!selectedCategory || !question || answers.some(a => !a.trim())) {
      enqueueSnackbar("Wypełnij wszystkie pola", { variant: "warning" });
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategory, difficulty, question, answers, correctIndex }),
      });
      if (!res.ok) throw new Error();
      const q = await res.json();
      setQuestion("");
      setAnswers(["", "", "", ""]);
      enqueueSnackbar(`Dodano pytanie: ${q.question}`, { variant: "success" });
    } catch {
      enqueueSnackbar("Nie udało się dodać pytania", { variant: "error" });
    }
  };

  const approveSuggestion = async (id) => {
    await fetch(`http://localhost:3000/admin/suggestions/${id}/approve`, { method: "POST" });
    enqueueSnackbar("Zatwierdzono!", { variant: "success" });
    fetchSuggestions();
  };

  const rejectSuggestion = async (id) => {
    await fetch(`http://localhost:3000/admin/suggestions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: rejectNote[id] || "" }),
    });
    enqueueSnackbar("Odrzucono!", { variant: "warning" });
    fetchSuggestions();
  };

  const inputClass = "w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-blue-600 focus:outline-none focus:border-yellow-400 transition-colors";
  const selectClass = "w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors";

  const tabs = [
    { id: "categories", label: "📁 Kategorie" },
    { id: "questions",  label: "❓ Pytania" },
    { id: "suggestions", label: "📨 Zgłoszenia" },
  ];

  return (
    <div className="min-h-screen bg-blue-950 p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-800 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest text-yellow-400 uppercase drop-shadow-lg">
            VA<span className="text-white">BANQUE</span>
          </h1>
          <p className="text-blue-300 text-sm font-medium mt-1 uppercase tracking-widest">Panel Administratora</p>
        </div>

        <div className="bg-blue-900 rounded-2xl shadow-2xl border-2 border-orange-500 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b-2 border-blue-800">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 font-black text-xs uppercase tracking-widest transition-all duration-150 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-950 text-yellow-400 border-b-2 border-yellow-400"
                    : "bg-blue-900 text-blue-400 hover:text-blue-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ===== TAB: KATEGORIE ===== */}
            {activeTab === "categories" && (
              <div className="space-y-4">
                <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Nowa kategoria</p>
                <div className="flex gap-2">
                  <input
                    className={inputClass + " flex-1"}
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createCategory()}
                    placeholder="Nazwa kategorii..."
                  />
                  <button
                    onClick={createCategory}
                    className="px-5 py-2.5 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 font-black text-sm uppercase tracking-wider hover:bg-indigo-600 hover:border-orange-400 transition-all cursor-pointer"
                  >
                    + Dodaj
                  </button>
                </div>

                <div className="border-t border-blue-800 pt-4">
                  <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold mb-3">
                    Lista kategorii <span className="text-yellow-400">({categories.length})</span>
                  </p>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {categories.length === 0 && (
                      <p className="text-blue-600 text-sm text-center py-4 uppercase tracking-widest">Brak kategorii</p>
                    )}
                    {categories.map((cat, idx) => (
                      <div key={cat._id} className="bg-blue-950 rounded-xl px-4 py-2.5 border border-blue-800 flex items-center justify-between">
                        <span className="text-white text-sm font-semibold">{cat.name}</span>
                        <span className="text-blue-600 text-xs font-black">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== TAB: PYTANIA ===== */}
            {activeTab === "questions" && (
              <div className="space-y-3">
                <p className="text-blue-300 text-xs uppercase tracking-widest font-semibold">Nowe pytanie</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mb-1">Kategoria</p>
                    <select className={selectClass} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                      <option value="">Wybierz kategorię</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-blue-400 text-xs uppercase tracking-widest mb-1">Trudność</p>
                    <select className={selectClass} value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}>
                      {[100, 200, 300, 400, 500].map(d => (
                        <option key={d} value={d}>{d} pkt</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-blue-400 text-xs uppercase tracking-widest mb-1">Treść pytania</p>
                  <textarea
                    className={inputClass + " resize-none"}
                    rows={2}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Wpisz treść pytania..."
                  />
                </div>

                <div>
                  <p className="text-blue-400 text-xs uppercase tracking-widest mb-2">Odpowiedzi <span className="text-blue-600 normal-case">(kliknij kółko = poprawna)</span></p>
                  <div className="space-y-2">
                    {answers.map((ans, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectIndex(i)}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all cursor-pointer ${
                            correctIndex === i
                              ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/30"
                              : "border-blue-600 hover:border-green-500"
                          }`}
                        />
                        <input
                          value={ans}
                          onChange={e => {
                            const updated = [...answers];
                            updated[i] = e.target.value;
                            setAnswers(updated);
                          }}
                          placeholder={`Odpowiedź ${i + 1}${correctIndex === i ? " ✓" : ""}`}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createQuestion}
                  className="w-full py-3 rounded-xl bg-indigo-700 border-2 border-indigo-500 text-yellow-400 font-black uppercase tracking-wider hover:bg-indigo-600 hover:border-orange-400 transition-all cursor-pointer"
                >
                  + Dodaj pytanie
                </button>
              </div>
            )}

            {/* ===== TAB: ZGŁOSZENIA ===== */}
            {activeTab === "suggestions" && (
              <div className="space-y-4">
                {/* Filtry */}
                <div className="flex rounded-xl overflow-hidden border border-blue-800">
                  {[
                    { id: "pending",  label: "⏳ Oczekujące" },
                    { id: "approved", label: "✓ Zatwierdzone" },
                    { id: "rejected", label: "✗ Odrzucone" },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSuggFilter(f.id)}
                      className={`flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                        suggFilter === f.id
                          ? "bg-blue-950 text-yellow-400"
                          : "bg-blue-900 text-blue-400 hover:text-blue-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {suggestions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-blue-600 text-sm uppercase tracking-widest">Brak zgłoszeń</p>
                  </div>
                )}

                <div className="space-y-3">
                  {suggestions.map(s => (
                    <div key={s._id} className="bg-blue-950 rounded-xl border border-blue-800 overflow-hidden">
                      {/* Nagłówek zgłoszenia */}
                      <div className="px-4 py-3 border-b border-blue-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${
                            s.type === "category"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}>
                            {s.type === "category" ? "📁 Kategoria" : "❓ Pytanie"}
                          </span>
                          <span className="text-blue-300 text-xs">od <span className="text-white font-black">{s.username}</span></span>
                        </div>
                        <span className="text-blue-600 text-xs">{new Date(s.createdAt).toLocaleDateString("pl-PL")}</span>
                      </div>

                      {/* Treść zgłoszenia */}
                      <div className="px-4 py-3 space-y-2">
                        {s.type === "category" && (
                          <p className="text-white font-black text-sm">
                            Proponowana kategoria: <span className="text-yellow-400">{s.categoryName}</span>
                          </p>
                        )}

                        {s.type === "question" && (
                          <>
                            <p className="text-white font-semibold text-sm leading-snug">{s.question}</p>
                            <p className="text-blue-400 text-xs uppercase tracking-wide">
                              {s.categoryDisplayName} · <span className="text-yellow-400 font-black">{s.difficulty} pkt</span>
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                              {s.answers?.map((ans, i) => (
                                <div key={i} className={`text-xs px-3 py-2 rounded-lg font-semibold ${
                                  i === s.correctIndex
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-blue-900 text-blue-300 border border-blue-800"
                                }`}>
                                  {i + 1}. {ans} {i === s.correctIndex && "✓"}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {s.status === "rejected" && s.adminNote && (
                          <p className="text-red-400 text-xs italic border-t border-blue-800 pt-2">
                            Powód odrzucenia: {s.adminNote}
                          </p>
                        )}
                      </div>

                      {/* Akcje */}
                      {s.status === "pending" && (
                        <div className="px-4 py-3 border-t border-blue-800 flex gap-2 items-center">
                          <button
                            onClick={() => approveSuggestion(s._id)}
                            className="px-4 py-2 bg-green-600/20 border border-green-500 text-green-400 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-green-500/30 transition-all cursor-pointer"
                          >
                            ✓ Zatwierdź
                          </button>
                          <input
                            value={rejectNote[s._id] || ""}
                            onChange={e => setRejectNote(prev => ({ ...prev, [s._id]: e.target.value }))}
                            placeholder="Powód odrzucenia (opcjonalnie)..."
                            className="flex-1 bg-blue-900 border border-blue-700 rounded-xl px-3 py-2 text-white text-xs placeholder-blue-600 focus:outline-none focus:border-red-400 transition-colors"
                          />
                          <button
                            onClick={() => rejectSuggestion(s._id)}
                            className="px-4 py-2 bg-red-600/20 border border-red-500 text-red-400 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-red-500/30 transition-all cursor-pointer"
                          >
                            ✗ Odrzuć
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}