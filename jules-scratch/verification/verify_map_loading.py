from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/")

    # Wait for the canvas to be visible, which indicates the game has loaded
    canvas = page.locator('canvas')
    expect(canvas).to_be_visible(timeout=10000)

    # Take a screenshot to verify the map is rendered
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)