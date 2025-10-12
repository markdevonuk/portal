// loader.js - FMS Portal Loading System
// Add this file to your project and include it in all pages

// The loader HTML to inject
const loaderHTML = `
<div id="fmsLoader" class="fms-loader-container">
  <div class="fms-loader-content">
    <div class="fms-loader-logo">
      <div class="fms-loader-shield"></div>
      <div class="fms-loader-cross">+</div>
    </div>
    <h2>FMS Prehospital</h2>
    <p>Loading your portal...</p>
    <div class="fms-loader-spinner"></div>
  </div>
</div>
`;

// The loader CSS
const loaderCSS = `
.fms-loader-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #00a896 0%, #028090 100%);
  transition: opacity 0.5s ease-in-out;
}

.fms-loader-content {
  text-align: center;
  color: white;
}

.fms-loader-logo {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
  position: relative;
}

.fms-loader-shield {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: pulse 2s infinite ease-in-out;
}

.fms-loader-shield::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  background: linear-gradient(135deg, #00a896 0%, #028090 100%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  z-index: 1;
}

.fms-loader-cross {
  position: absolute;
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  z-index: 2;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 40px;
}

.fms-loader-spinner {
  margin: 20px auto;
  width: 60px;
  height: 60px;
  position: relative;
}

.fms-loader-spinner:before,
.fms-loader-spinner:after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid transparent;
  border-top-color: white;
}

.fms-loader-spinner:before {
  animation: spin 2s infinite ease;
}

.fms-loader-spinner:after {
  border: 4px solid rgba(255, 255, 255, 0.3);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.fms-loader-hide {
  opacity: 0;
  pointer-events: none;
}
`;

// Initialize loader
function initFmsLoader() {
  // Create the style element
  const style = document.createElement('style');
  style.textContent = loaderCSS;
  document.head.appendChild(style);
  
  // Create loader container
  const loaderContainer = document.createElement('div');
  loaderContainer.innerHTML = loaderHTML;
  document.body.appendChild(loaderContainer.firstElementChild);
  
  // Ensure the loader is visible initially
  showFmsLoader();
  
  // Show loader when leaving page
  window.addEventListener('beforeunload', () => {
    showFmsLoader();
  });
}

// Show loader
function showFmsLoader() {
  // Use requestAnimationFrame to ensure this happens in the next paint
  requestAnimationFrame(() => {
    const loader = document.getElementById('fmsLoader');
    if (loader) {
      loader.classList.remove('fms-loader-hide');
    }
  });
}

// Hide loader
function hideFmsLoader() {
  const loader = document.getElementById('fmsLoader');
  if (loader) {
    loader.classList.add('fms-loader-hide');
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initFmsLoader);

// Export functions
window.fmsLoader = {
  show: showFmsLoader,
  hide: hideFmsLoader
};
