// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../services/api';
import styles from './Auth.module.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await api.post(endpoint, formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.heroContainer}>
      {/* Animated Background */}
      <div className={styles.heroBackground}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
        <div className={styles.gridPattern}></div>
      </div>

      {/* Main Content */}
      <div className={styles.heroContent}>
        {/* Left Section - Features */}
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>
            Smart Electricity Cost Sharing
          </h1>
          <p className={styles.heroSubtitle}>
            Simplify meter management for your group, calculate fair cost allocation, and settle payments with transparency.
          </p>

          {/* Features Grid */}
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <div className={styles.featureText}>
                <h3>Real-Time Calculations</h3>
                <p>Instant cost allocation based on appliance usage</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <div className={styles.featureText}>
                <h3>Group Management</h3>
                <p>Easy member invitations and appliance tracking</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <div className={styles.featureText}>
                <h3>Fair Billing</h3>
                <p>Transparent cost breakdown for every member</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <div className={styles.featureText}>
                <h3>Secure Payments</h3>
                <p>Safe transactions with Interswitch integration</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>2000+</div>
              <div className={styles.statLabel}>Active Users</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>500+</div>
              <div className={styles.statLabel}>Groups</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>₦50M+</div>
              <div className={styles.statLabel}>Settled</div>
            </div>
          </div>
        </div>

        {/* Right Section - Auth Card */}
        <div className={styles.heroRight}>
          <div className={styles.authCard}>
            {/* Header */}
            <div className={styles.authHeader}>
              <div className={styles.authLogo}>⚡</div>
              <h2 className={styles.authTitle}>MeterMate</h2>
              <p className={styles.authSubtitle}>
                {isLogin ? 'Welcome back!' : 'Join the platform'}
              </p>
            </div>

            {/* Body */}
            <div className={styles.authBody}>
              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Full Name</label>
                      <input
                        required
                        type="text"
                        name="name"
                        placeholder="John Doe"
                        onChange={handleChange}
                        className={styles.formInput}
                        value={formData.name}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Phone Number</label>
                      <input
                        required
                        type="tel"
                        name="phone"
                        placeholder="+234 700 000 0000"
                        onChange={handleChange}
                        className={styles.formInput}
                        value={formData.phone}
                      />
                    </div>
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    onChange={handleChange}
                    className={styles.formInput}
                    value={formData.email}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Password</label>
                  <div className={styles.passwordContainer}>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Enter your password"
                      onChange={handleChange}
                      className={styles.formInput}
                      value={formData.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.passwordToggle}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className={styles.submitButton}
                >
                  {loading ? '⏳ Processing...' : (isLogin ? '🔓 Log In' : '✨ Create Account')}
                </button>
              </form>

              {/* Toggle Auth Mode */}
              <div className={styles.toggleAuth}>
                <p className={styles.toggleText}>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </p>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setFormData({ name: '', email: '', phone: '', password: '' });
                  }}
                  className={styles.toggleButton}
                >
                  {isLogin ? 'Sign Up Now' : 'Log In Instead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
