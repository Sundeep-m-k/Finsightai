import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { uploadFile, uploadSample, getMockProfile } from '../lib/api';

export function UploadPage() {
  const navigate = useNavigate();
  const { sessionId, setProfile } = useProfile();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleUseSample = async () => {
    setError('');
    setStatus('uploading');
    try {
      if (sessionId) {
        const profile = await uploadSample(sessionId);
        setProfile(profile);
      } else {
        setProfile(await getMockProfile());
      }
      setStatus('done');
      setTimeout(() => navigate('/gap'), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setStatus('uploading');
    try {
      if (sessionId) {
        const profile = await uploadFile(file, sessionId);
        setProfile(profile);
      } else {
        setProfile(await getMockProfile());
      }
      setStatus('done');
      setTimeout(() => navigate('/gap'), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Upload transactions</h1>
      <p className="mt-1 text-slate-600">
        Upload a CSV or Excel file of your transactions, or use sample data to try the app.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 hover:border-indigo-400 hover:bg-indigo-50/50">
          <span className="text-slate-600">Drop a file here or click to browse</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={status === 'uploading'}
          />
        </label>

        <div className="text-center text-slate-500">or</div>

        <button
          type="button"
          onClick={handleUseSample}
          disabled={status === 'uploading'}
          className="w-full rounded-lg border border-indigo-600 py-3 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        >
          Use sample data
        </button>

        {status === 'uploading' && (
          <p className="text-center text-sm text-slate-600">Processing…</p>
        )}
        {status === 'done' && (
          <p className="text-center text-sm text-green-600">Done! Redirecting…</p>
        )}
        {status === 'error' && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/onboard')}
        className="mt-6 text-slate-500 hover:text-slate-700"
      >
        ← Back to questionnaire
      </button>
    </div>
  );
}
