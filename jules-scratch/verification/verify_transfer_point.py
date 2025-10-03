from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the local development server
        page.goto("http://localhost:5173/")

        # Wait for the canvas to be ready
        canvas = page.locator('canvas')
        expect(canvas).to_be_visible(timeout=10000) # Wait up to 10 seconds

        # Give the 3D scene some time to render
        page.wait_for_timeout(2000)

        # Take a screenshot to verify the transfer point
        screenshot_path = "jules-scratch/verification/transfer_point_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)