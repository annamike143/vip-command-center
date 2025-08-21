// Custom 404 page for Command Center
export default function Custom404() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#dc2626',
      color: 'white'
    }}>
      <h1>404 - Admin Page Not Found</h1>
      <p>The admin page you are looking for does not exist.</p>
      <a href="/" style={{ marginTop: '20px', color: '#fbbf24' }}>
        Return to Command Center
      </a>
    </div>
  );
}
