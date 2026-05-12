import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await onLogin(email, password);
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Грешен имейл или парола'
        : err.message);
    }
    setBusy(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        borderRadius: 16,
        padding: '48px 40px',
        width: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌍</div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#1e293b' }}>Zelanos Tours</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Вход в системата</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Имейл
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="email@example.com"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Парола
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 0',
            background: busy ? '#94a3b8' : '#e67e22',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(230,126,34,.4)',
          }}
        >
          {busy ? 'Зареждане...' : 'Вход'}
        </button>
      </form>
    </div>
  );
}
