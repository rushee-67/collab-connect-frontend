import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

export default function AuthForm({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        // Login API call
        const res = await API.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("username", res.data.name || form.username);
        onLogin?.();
        navigate("/dashboard/home");
      } else {
        // Signup API call
        const res = await API.post("/auth/signup", {
          name: form.username,
          email: form.email,
          password: form.password,
          role: "user",
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("username", res.data.name || form.username);
        onLogin?.();
        navigate("/dashboard/home");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl shadow-xl border border-gray-600 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-800 to-red-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">
            {isLogin ? "Login" : "Signup"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-200">Full Name</label>
              <input
                type="text"
                className="mt-1 w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-200">Email</label>
            <input
              type="email"
              className="mt-1 w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Password</label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-red-600 text-white font-semibold rounded-lg"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-300">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:underline">
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
