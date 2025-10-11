import { sendSettings } from './websocket.js';
import { playerData } from './components/Player.js';

function initializeSettings() {
  const settingsContainer = document.getElementById('settings-container');
  const settingsButton = document.getElementById('settings-button');
  const playerNameDiv = document.getElementById('playerName');
  const playerColourDiv = document.getElementById('playerColour');

  fetch('/settings.html')
    .then(response => response.text())
    .then(html => {
      settingsContainer.innerHTML = html;
      const settingsDialog = document.getElementById('settings-dialog');
      const closeButton = document.getElementById('close-settings');
      const saveButton = document.getElementById('save-settings');
      const nameInput = document.getElementById('new-player-name');
      const colourInput = document.getElementById('new-player-colour');

      const openSettings = (event) => {
        event.preventDefault();
        nameInput.value = playerData.name;
        colourInput.value = playerData.colour;
        settingsDialog.style.display = 'block';
      }

      settingsButton.addEventListener('touchend', openSettings);
      settingsButton.addEventListener('click', openSettings);

      const closeSettings = (event) => {
        event.preventDefault();
        settingsDialog.style.display = 'none';
      };

      const saveSettings = (event) => {
        event.preventDefault();
        const newName = nameInput.value;
        const newColour = colourInput.value;
        sendSettings(newName, newColour);

        playerData.name = newName;
        playerData.colour = newColour;

        playerNameDiv.textContent = newName;
        playerColourDiv.style.backgroundColor = newColour;

        settingsDialog.style.display = 'none';
      };

      closeButton.addEventListener('click', closeSettings);
      closeButton.addEventListener('touchend', closeSettings);

      saveButton.addEventListener('click', saveSettings);
      saveButton.addEventListener('touchend', saveSettings);
    });
}

initializeSettings();