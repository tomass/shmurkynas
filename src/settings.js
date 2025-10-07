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

      settingsButton.addEventListener('click', () => {
        nameInput.value = playerData.name;
        colourInput.value = playerData.colour;
        settingsDialog.style.display = 'block';
      });

      closeButton.addEventListener('click', () => {
        settingsDialog.style.display = 'none';
      });

      saveButton.addEventListener('click', () => {
        const newName = nameInput.value;
        const newColour = colourInput.value;
        sendSettings(newName, newColour);

        playerData.name = newName;
        playerData.colour = newColour;

        playerNameDiv.textContent = newName;
        playerColourDiv.style.backgroundColor = newColour;

        settingsDialog.style.display = 'none';
      });
    });
}

initializeSettings();