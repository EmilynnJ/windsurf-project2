export function LoginPage() {
  return (
    <div className="login-page" style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
      padding: '2rem 0',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
        }}>
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: '400px', 
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔮</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Sign in to your SoulSeer account
            </p>
            
            <form style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(30, 30, 46, 0.5)',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(30, 30, 46, 0.5)',
                    color: 'white'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>Remember me</span>
                </label>
                <a href="#" style={{ color: 'var(--secondary-purple)', textDecoration: 'none', fontSize: '0.9rem' }}>
                  Forgot password?
                </a>
              </div>
              
              <button 
                className="btn btn-primary" 
                type="submit"
                style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }}
              >
                Sign In
              </button>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Don't have an account?{' '}
                <a href="#" style={{ color: 'var(--secondary-purple)', textDecoration: 'none' }}>
                  Sign up
                </a>
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                <span style={{ padding: '0 1rem', color: 'var(--text-muted)' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
              </div>
              
              <button 
                className="btn btn-outline" 
                type="button"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '0.5rem' }}
              >
                Continue with Google
              </button>
              <button 
                className="btn btn-outline" 
                type="button"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Continue with Facebook
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}