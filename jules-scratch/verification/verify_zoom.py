from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Wait for the canvas to be visible
    canvas = page.locator('canvas')
    canvas.wait_for(state='visible')

    # Get the initial bounding box of the canvas
    initial_box = canvas.bounding_box()

    # Simulate zooming in
    page.mouse.wheel(0, -500)
    page.wait_for_timeout(1000) # Wait for zoom animation

    # Take a screenshot after zooming in
    page.screenshot(path="jules-scratch/verification/zoomed_in.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)