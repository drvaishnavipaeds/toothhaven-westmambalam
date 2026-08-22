import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'patient'>('patient');

  useEffect(() => {
    // Get user type from URL params
    const type = searchParams.get('type');
    if (type === 'admin' || type === 'patient') {
      setUserType(type);
    }

    // Check if user is authenticated (password reset link should have set the session)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please request a new password reset link.');
      }
    };

    checkAuth();
  }, [searchParams]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    
    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Password must contain number');
    }
    if (!/[!@#$%^&*]/.test(pwd)) {
      errors.push('Password must contain special character (!@#$%^&*)');
    }

    return errors;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Validate passwords
      if (!password || !confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const validationErrors = validatePassword(password);
      if (validationErrors.length > 0) {
        setError(`Password is weak: ${validationErrors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Update password via Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');

      // Redirect after 3 seconds
      setTimeout(() => {
        const redirectPath = userType === 'admin' ? '/admin-login' : '/';
        navigate(redirectPath);
      }, 3000);
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
            <p className="text-gray-600">
              {userType === 'admin' ? 'Admin' : 'Patient'} Portal
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle size={64} className="text-green-500" />
              </div>
              <h2 className="text-center text-xl font-semibold text-gray-800">
                Password Reset Successful!
              </h2>
              <p className="text-center text-gray-600">
                Your password has been reset. Redirecting to login page...
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm text-center">
                  Please wait, you'll be redirected shortly.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Password must contain:
                  <br />• At least 8 characters
                  <br />• Uppercase letter (A-Z)
                  <br />• Lowercase letter (a-z)
                  <br />• Number (0-9)
                  <br />• Special character (!@#$%^&*)
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate(userType === 'admin' ? '/admin-login' : '/')}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>
            Need help? Contact us at{' '}
            <a href="mailto:support@toothhaven.com" className="text-teal-600 hover:text-teal-700 font-medium">
              support@toothhaven.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
