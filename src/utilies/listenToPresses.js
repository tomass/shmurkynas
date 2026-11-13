// A computer presses a button with a click, a phone with a touch. The touch is
// answered and stopped right there, because a touch which is left alone is
// turned into a click afterwards and the button would be pressed twice.
export function listenToPresses(button, press) {
  const handlePress = event => {
    event.preventDefault();
    press();
  };
  button.addEventListener('click', handlePress);
  button.addEventListener('touchend', handlePress);
}
