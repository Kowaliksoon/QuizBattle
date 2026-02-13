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

  const { enqueueSnackbar } = useSnackbar();


  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:3000/admin/categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      enqueueSnackbar("Nie udało się pobrać kategorii", { variant: "error" });
    }
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const res = await fetch("http://localhost:3000/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });

      if (!res.ok) throw new Error("Błąd serwera");

      const cat = await res.json();
      setNewCategory("");
      fetchCategories();
      enqueueSnackbar(`Dodano kategorię: ${cat.name}`, { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Nie udało się dodać kategorii", { variant: "error" });
    }
  };

  const createQuestion = async () => {
    if (!selectedCategory || !question || answers.some((a) => !a.trim())) {
      enqueueSnackbar("Wypełnij wszystkie pola", { variant: "warning" });
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          difficulty,
          question,
          answers,
          correctIndex,
        }),
      });

      if (!res.ok) throw new Error("Błąd serwera");

      const q = await res.json();
      setQuestion("");
      setAnswers(["", "", "", ""]);
      enqueueSnackbar(`Dodano pytanie: ${q.question}`, { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Nie udało się dodać pytania", { variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 p-10 text-white">
      <h1 className="text-4xl font-bold text-center mb-10 tracking-wide">
        🎯 Panel Admina
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* BLOK 1 */}
        <div className="bg-white text-gray-800 rounded-2xl shadow-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Dodaj kategorię</h2>

          <input
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nazwa kategorii"
          />

          <button
            onClick={createCategory}
            className="w-full bg-blue-700 hover:bg-blue-800 transition duration-300 text-white py-3 rounded-lg font-semibold shadow-md"
          >
            Dodaj kategorię
          </button>

          <div>
            <h3 className="font-semibold mb-2">Lista kategorii</h3>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <li
                  key={cat._id}
                  className="bg-gray-100 px-3 py-2 rounded-md"
                >
                  {cat.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* BLOK 2 */}
        <div className="bg-white text-gray-800 rounded-2xl shadow-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Dodaj pytanie</h2>

          <select
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Wybierz kategorię</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          >
            <option value={100}>100 pkt</option>
            <option value={200}>200 pkt</option>
            <option value={300}>300 pkt</option>
            <option value={400}>400 pkt</option>
            <option value={500}>500 pkt</option>
          </select>

          <input
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Treść pytania"
          />

          {answers.map((ans, i) => (
            <input
              key={i}
              className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={ans}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[i] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder={`Odpowiedź ${i + 1}`}
            />
          ))}

          <select
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={correctIndex}
            onChange={(e) => setCorrectIndex(Number(e.target.value))}
          >
            <option value={0}>Poprawna: 1</option>
            <option value={1}>Poprawna: 2</option>
            <option value={2}>Poprawna: 3</option>
            <option value={3}>Poprawna: 4</option>
          </select>

          <button
            onClick={createQuestion}
            className="w-full bg-green-600 hover:bg-green-700 transition duration-300 text-white py-3 rounded-lg font-semibold shadow-md"
          >
            Dodaj pytanie
          </button>
        </div>
      </div>
    </div>
  );
}
