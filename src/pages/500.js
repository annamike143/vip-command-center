// Custom 500 page for Command Center
export default function Custom500() {
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
      <h1>500 - Admin Server Error</h1>
      <p>Something went wrong with the Command Center.</p>
      <a href="/" style={{ marginTop: '20px', color: '#fbbf24' }}>
        Return to Command Center
      </a>
    </div>
  );
}
