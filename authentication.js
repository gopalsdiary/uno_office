// Supabase Configuration (do not redeclare globals)
// Use existing window values when available to avoid duplicate const errors
window.SUPABASE_URL = window.SUPABASE_URL || 'https://tschsyozvlneslqylqii.supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzY2hzeW96dmxuZXNscXlscWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MzcyNjgsImV4cCI6MjA4MjMxMzI2OH0.7kfq7K-jbFmgnin2zkLJf7GIulGXvfQzBkzjs0iAO14';

// Initialize Supabase client once and attach to window
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// Inactivity timeout (15 minutes in milliseconds)
const INACTIVITY_TIMEOUT = 50 * 60 * 1000; // 15 minutes
let inactivityTimer;

// Pages that don't require authentication
const PUBLIC_PAGES = ['index.html', 'login.html'];

// Check if current page is public
function isPublicPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  return PUBLIC_PAGES.includes(currentPage);
}

// Reset inactivity timer
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    handleLogout();
  }, INACTIVITY_TIMEOUT);
}

// Setup activity listeners
function setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
  });
  
  // Start the timer
  resetInactivityTimer();
}

// Handle logout
async function handleLogout() {
  try {
    // Sign out from Supabase
    const { error } = await window.supabaseClient.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout failed:', err);
    // Still redirect even if there's an error
    window.location.href = '/index.html';
  }
}

// Check authentication status
async function checkAuth() {
  // Skip auth check for public pages
  if (isPublicPage()) {
    return;
  }
  
  try {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error || !session) {
      // No valid session, redirect to login
      window.location.href = '/index.html';
      return;
    }
    
    // Session is valid, setup inactivity monitoring
    setupActivityListeners();
    
  } catch (err) {
    console.error('Auth check failed:', err);
    window.location.href = '/index.html';
  }
}

// Handle password reset
async function handlePasswordReset() {
  const email = prompt('Enter your email address for password reset:');
  
  if (!email) {
    return;
  }
  
  try {
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    
    if (error) throw error;
    
    alert('✅ Password reset email sent! Please check your inbox.');
  } catch (err) {
    console.error('Password reset error:', err);
    alert('❌ Error sending password reset email: ' + err.message);
  }
}

// Initialize authentication
function initAuth() {
  // Check authentication on page load
  checkAuth();
  
  // Setup logout button handlers
  document.addEventListener('DOMContentLoaded', () => {
    const logoutButtons = document.querySelectorAll('[data-logout]');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          handleLogout();
        }
      });
    });
    
    // Setup reset password button handlers
    const resetButtons = document.querySelectorAll('[data-reset-password]');
    resetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handlePasswordReset();
      });
    });
  });
}

// Auto-initialize on script load
initAuth();

// Export functions for use in other scripts
window.authUtils = {
  handleLogout,
  handlePasswordReset,
  checkAuth,
  supabaseClient: window.supabaseClient
};
