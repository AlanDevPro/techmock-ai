import { AuthCard } from '../../components/AuthCard';

export default function AuthPage() {

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthCard />
      </div>
    </div>
  );
}