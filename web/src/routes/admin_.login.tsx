import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Mail, Eye, EyeOff, Store } from "lucide-react";
import { attemptLogin } from "@/lib/velora/store";
import { storefront } from "@/lib/api";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Modest Apparel Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [storeName, setStoreName] = useState("Modest Apparel");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void storefront
      .bootstrap()
      .then((data) => {
        setStoreName(String(data.branding?.["store_name"] ?? "Modest Apparel"));
      })
      .catch(() => undefined);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setBusy(true);
    const result = await attemptLogin(email.trim(), password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(next && next.startsWith("/admin") ? next : "/admin");
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            marginBottom: '15px',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)'
          }}>
            <Store style={{ width: '28px', height: '28px', color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 5px 0'
          }}>
            {storeName}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0'
          }}>
            Admin Panel
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '35px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 25px 0'
            }}>
              Welcome back
            </h2>

            {error && (
              <div style={{
                padding: '15px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#dc2626',
                  margin: '0'
                }}>{error}</p>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              {/* Email Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }}>
                    <Mail style={{ width: '20px', height: '20px' }} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@modestapparel.com"
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 48px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '15px',
                      color: '#1f2937',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }}>
                    <Lock style={{ width: '20px', height: '20px' }} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '14px 48px 14px 48px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '15px',
                      color: '#1f2937',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: '0',
                      display: 'flex'
                    }}
                  >
                    {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {busy ? (
                  "Signing in..."
                ) : (
                  <>
                    <Lock style={{ width: '20px', height: '20px' }} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div style={{
            padding: '20px 35px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              textAlign: 'center',
              margin: '0',
              lineHeight: '1.5'
            }}>
              After 5 failed attempts, your account will be temporarily locked.
            </p>
          </div>
        </div>

        {/* Back to Store */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.9)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s'
            }}
          >
            ← Back to store
          </a>
        </div>
      </div>
    </div>
  );
}