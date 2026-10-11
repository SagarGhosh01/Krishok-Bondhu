import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, UserCheck, Lock, Mail, User } from "lucide-react";
import { loginUser, registerUser, setAuthToken } from "../services/api";

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await registerUser(email, password, fullName || "Farmer User");
        setAuthToken(res.access_token);
      } else {
        const res = await loginUser(email, password);
        setAuthToken(res.access_token);
      }
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication error.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoFarmer = () => {
    setEmail("farmer@agrishield.ai");
    setPassword("Farmer@12345");
    setFullName("Alex William");
  };

  const fillDemoAdmin = () => {
    setEmail("admin@agrishield.ai");
    setPassword("Admin@12345");
    setFullName("Agronomy Admin");
  };

  return (
    <div className="min-h-screen bg-agri-bg flex items-center justify-center p-4 max-w-md mx-auto font-sans">
      <div className="w-full bg-white rounded-4xl p-6 sm:p-8 border border-agri-border shadow-xl space-y-5">
        {/* Logo and Brand */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-3xl bg-agri-primary text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-agri-text pt-2">
            {isRegister ? t("auth.register_title") : t("auth.login_title")}
          </h2>
          <p className="text-xs text-agri-muted">
            {t("app.screening_aid")}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-2xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-agri-text block">
                {t("auth.full_name")}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-agri-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex William"
                  className="w-full bg-agri-surface border border-agri-border rounded-2xl py-3 pl-10 pr-4 text-xs text-agri-text focus:outline-hidden focus:border-agri-primary"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-agri-text block">
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-agri-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@agrishield.ai"
                className="w-full bg-agri-surface border border-agri-border rounded-2xl py-3 pl-10 pr-4 text-xs text-agri-text focus:outline-hidden focus:border-agri-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-agri-text block">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-agri-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-agri-surface border border-agri-border rounded-2xl py-3 pl-10 pr-4 text-xs text-agri-text focus:outline-hidden focus:border-agri-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-agri-primary text-white font-bold text-xs tracking-wide shadow-md hover:bg-agri-primaryHover transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Processing..." : isRegister ? t("auth.sign_up") : t("auth.sign_in")}
          </button>
        </form>

        {/* Demo Fast-Fill Buttons */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-agri-muted block text-center">
            Quick Fill Demo Accounts
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={fillDemoFarmer}
              className="py-2 px-3 rounded-xl border border-agri-border bg-agri-surface text-agri-text hover:bg-white transition text-center"
            >
              👨‍🌾 Farmer Account
            </button>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="py-2 px-3 rounded-xl border border-agri-border bg-agri-surface text-agri-text hover:bg-white transition text-center"
            >
              🛡️ Admin Account
            </button>
          </div>
        </div>

        {/* Toggle between Login and Register */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-agri-primary font-bold hover:underline"
          >
            {isRegister ? t("auth.have_account") : t("auth.no_account")}
          </button>
        </div>
      </div>
    </div>
  );
};
