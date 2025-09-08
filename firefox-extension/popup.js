// Compatible Firefox et Chrome
const browser = this.browser || this.chrome;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎛️ Firefox popup initializing...');
  
  const enabledCheck = document.getElementById('enabledCheck');
  const endpointInput = document.getElementById('endpoint');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const saveBtn = document.getElementById('saveBtn');
  
  // Charger l'état actuel
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
    console.log('📊 Current status:', response);
    
    enabledCheck.checked = response.enabled;
    endpointInput.value = response.endpoint;
    
    // Afficher le compteur d'erreurs s'il y en a
    if (response.errorCount > 0) {
      statusText.textContent += ` (${response.errorCount} errors sent)`;
    }
    
    updateStatus();
  } catch (error) {
    console.error('❌ Failed to load status:', error);
    statusText.textContent = 'Error loading status';
    statusIndicator.classList.add('inactive');
  }
  
  function updateStatus() {
    if (enabledCheck.checked) {
      statusIndicator.classList.remove('inactive');
      statusText.textContent = '🦊 Firefox Monitoring Active';
    } else {
      statusIndicator.classList.add('inactive');
      statusText.textContent = 'Monitoring Disabled';
    }
  }
  
  enabledCheck.addEventListener('change', updateStatus);
  
  saveBtn.addEventListener('click', async () => {
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Saving...';
      
      const newEndpoint = endpointInput.value.trim();
      if (!newEndpoint) {
        alert('Please enter a valid endpoint URL');
        return;
      }
      
      await browser.runtime.sendMessage({
        type: 'SET_STATUS',
        enabled: enabledCheck.checked,
        endpoint: newEndpoint
      });
      
      console.log('✅ Settings saved successfully');
      
      saveBtn.textContent = '🦊 Saved!';
      saveBtn.style.background = '#4CAF50';
      
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
        saveBtn.style.background = '';
        saveBtn.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('❌ Failed to save:', error);
      saveBtn.textContent = '❌ Error';
      saveBtn.style.background = '#f44336';
      
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
        saveBtn.style.background = '';
        saveBtn.disabled = false;
      }, 2000);
    }
  });
  
  console.log('🎛️ Firefox popup ready!');
});