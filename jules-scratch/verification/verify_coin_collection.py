import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    page.goto("http://localhost:5173/")

    # Wait for the game to initialize by waiting for the player name to appear
    player_name_element = page.locator("#playerName")
    expect(player_name_element).not_to_be_empty()

    # Now that the game is initialized, check the money
    player_money_element = page.locator("#playerMoney")
    expect(player_money_element).to_have_text("$0")

    # The player starts at (3, 3) and the coin is at (1, 8)
    # We need to move left twice and forward five times.

    # Move left twice
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(300) # wait for animation
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(300)

    # Move forward five times
    for _ in range(5):
        page.keyboard.press("ArrowUp")
        page.wait_for_timeout(300)

    # After collecting the coin, the money should be $1
    expect(player_money_element).to_have_text("$1")

    page.screenshot(path="jules-scratch/verification/verification.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)