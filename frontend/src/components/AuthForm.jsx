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

  const formHeight = isLogin ? "h-[180px]" : "h-[252px]";

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-800 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-black tracking-widest uppercase drop-shadow-lg">
            <span className="text-yellow-400">VA</span><span className="text-white">BANQUE</span>
          </h1>
          <p className="text-blue-300 text-sm mt-1 uppercase tracking-widest font-semibold">
            {isLogin ? "Witaj z powrotem!" : "Dołącz do gry!"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-blue-900 rounded-2xl border-2 border-orange-500 shadow-2xl shadow-orange-900/20 overflow-hidden">

          {/* Switch tabs */}
          <div className="flex border-b-2 border-orange-500/50">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 font-black text-sm uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                isLogin
                  ? "bg-blue-950 text-yellow-400 border-b-2 border-yellow-400"
                  : "bg-blue-900 text-blue-400 hover:text-blue-200"
              }`}
            >
              Logowanie
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 font-black text-sm uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                !isLogin
                  ? "bg-blue-950 text-yellow-400 border-b-2 border-yellow-400"
                  : "bg-blue-900 text-blue-400 hover:text-blue-200"
              }`}
            >
              Rejestracja
            </button>
          </div>

          {/* Form */}
          <div className="p-5">
            <div className={`transition-[height] duration-500 ease-in-out overflow-hidden ${formHeight}`}>
              <form onSubmit={handleSubmit} className="flex flex-col h-full gap-5">
                {!isLogin && (
                  <input
                    type="text"
                    name="username"
                    placeholder="Nazwa użytkownika"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-blue-950 border-2 border-blue-700 rounded-xl text-white placeholder-blue-500 focus:outline-none focus:border-orange-400 transition font-semibold text-sm"
                    required
                  />
                )}
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-blue-950 border-2 border-blue-700 rounded-xl text-white placeholder-blue-500 focus:outline-none focus:border-orange-400 transition font-semibold text-sm"
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Hasło"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-blue-950 border-2 border-blue-700 rounded-xl text-white placeholder-blue-500 focus:outline-none focus:border-orange-400 transition font-semibold text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 bg-indigo-700 border-2 border-indigo-500 text-yellow-400 font-black rounded-xl uppercase tracking-widest text-sm shadow-lg transition-all duration-150
                    ${loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-indigo-600 hover:border-orange-400 hover:text-orange-300 hover:brightness-110 cursor-pointer"
                    }`}
                >
                  {loading ? "⏳ Ładowanie..." : isLogin ? "🎮 Zaloguj się" : "🎯 Utwórz konto"}
                </button>
              </form>
            </div>
          </div>

          {/* Footer inside card */}
          <div className="px-5 pb-4 text-center">
            <p className="text-blue-500 text-xs uppercase tracking-wider">
              {isLogin ? "Nie masz konta?" : "Masz już konto?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-yellow-400 font-black hover:text-orange-300 transition-colors cursor-pointer"
              >
                {isLogin ? "Zarejestruj się" : "Zaloguj się"}
              </button>
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-center text-blue-600 text-xs mt-4 uppercase tracking-widest">
          Sprawdź swoją wiedzę w pojedynku!
        </p>
      </div>
    </div>
  );
}