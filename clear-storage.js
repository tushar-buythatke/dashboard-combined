// Clear localStorage to reset profiles with new filter structure
localStorage.removeItem('dashboard_profiles');
console.log('Cleared dashboard profiles - page will reload with updated filter structure');
window.location.reload();
