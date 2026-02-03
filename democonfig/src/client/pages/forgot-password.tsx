import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAppConfig } from '../lib/app-config';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { app } = useAppConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setResetToken(null);
    setLoading(true);

    try {
      const res = await api.post<{ success: boolean; data: { message: string; resetToken?: string } }>(
        '/auth/forgot-password',
        { email }
      );
      setSuccess(true);
      // In demo mode, show the reset token (in production, this would be emailed)
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {app?.name || 'System'}
          </CardTitle>
          <CardDescription>Reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  If an account exists with that email, a password reset link has been sent.
                </AlertDescription>
              </Alert>
              {resetToken && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Demo Mode: Reset Link</p>
                  <p className="text-xs text-muted-foreground break-all">
                    <Link
                      to={`/reset-password?token=${resetToken}`}
                      className="text-primary hover:underline"
                    >
                      Click here to reset your password
                    </Link>
                  </p>
                </div>
              )}
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
