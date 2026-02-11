import { useState } from "react";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

export default function AuthForm() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = isLogin
      ? "http://localhost:3000/api/login"
      : "http://localhost:3000/api/register";

    const body = isLogin
      ? { email: form.email, password: form.password }
      : { username: form.username, email: form.email, password: form.password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // jeśli backend zwróci np. "Username zajęty" lub "Email zajęty"
        enqueueSnackbar(data.message || "Coś poszło nie tak", { variant: "error" });
        setLoading(false);
        return;
      }


      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("username", data.user.username); 


      enqueueSnackbar(isLogin ? "Zalogowano!" : "Konto utworzone!", { variant: "success" });
      setLoading(false);
      navigate("/lobby");
    } catch (err) {
      enqueueSnackbar("Brak połączenia z serwerem", { variant: "error" });
      setLoading(false);
    }
  };

  const formHeight = isLogin ? "h-[200px]" : "h-[280px]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* SWITCH */}
        <div className="flex justify-center mb-6 bg-gray-200 rounded-full p-1">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-full font-semibold transition-all duration-300 cursor-pointer ${
              isLogin ? "bg-white text-blue-600 shadow" : "text-gray-500"
            }`}
          >
            Logowanie
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-full font-semibold transition-all duration-300 cursor-pointer ${
              !isLogin ? "bg-white text-blue-600 shadow" : "text-gray-500"
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* FORMULARZ */}
        <div
          className={`transition-[height] duration-500 ease-in-out overflow-hidden ${formHeight}`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col justify-between h-full space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="username"
                placeholder="Nazwa użytkownika"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              />
            )}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Hasło"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              {loading ? "Ładowanie..." : isLogin ? "Zaloguj się" : "Utwórz konto"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
