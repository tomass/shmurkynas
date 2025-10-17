from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:5173/")

    # Add a dummy map to localStorage to make the button visible
    image_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    page.evaluate(f"localStorage.setItem('treasureMap_test_1_1', '{image_data}');")

    # Reload the page to apply the localStorage change
    page.reload()

    # Wait for the game to initialize
    page.wait_for_selector("#show-maps-button", state="visible")

    # Click the "show maps" button
    page.click("#show-maps-button")
    page.wait_for_selector("#map-viewer", state="visible")

    # Set the image source directly
    page.evaluate(f"document.querySelector('#map-image-container img').src = '{image_data}';")


    page.screenshot(path="jules-scratch/verification/map_viewer.png")

    # Close the map viewer and take another screenshot
    page.click("#close-map-viewer-button")
    page.wait_for_selector("#map-viewer", state="hidden")
    page.screenshot(path="jules-scratch/verification/main_screen.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)