'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api/v1';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${API}/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            'No se pudo restablecer la contraseña'
        );
      }

      setMessage(
        'Contraseña actualizada correctamente'
      );

      setTimeout(() => {
        router.push('/auth');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8">

        <h1 className="text-2xl font-bold text-[#00ff00] mb-6 text-center">
          Restablecer Contraseña
        </h1>

        <form
          onSubmit={handleReset}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Nueva contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirmar contraseña
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-900/50 border border-green-600 rounded-lg p-3 text-green-300 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00ff00] text-black py-2 rounded-lg font-semibold"
          >
            {loading
              ? 'Actualizando...'
              : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}