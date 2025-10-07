from playwright.sync_api import Page, expect

def test_settings_dialog(page: Page):
    # 1. Arrange: Go to the application.
    page.goto("http://localhost:5173/")

    # 2. Act: Click the settings button.
    settings_button = page.locator("#settings-button")
    settings_button.click()

    # 3. Assert: The settings dialog is visible.
    settings_dialog = page.locator("#settings-dialog")
    expect(settings_dialog).to_be_visible()

    # 4. Act: Change the player name and color.
    name_input = page.locator("#new-player-name")
    name_input.fill("Jules")
    colour_input = page.locator("#new-player-colour")
    colour_input.fill("#ff0000")

    # 5. Act: Click the save button.
    save_button = page.locator("#save-settings")
    save_button.click()

    # 6. Assert: The settings dialog is hidden.
    expect(settings_dialog).to_be_hidden()

    # 7. Assert: The player name and color are updated in the toolbar.
    player_name_div = page.locator("#playerName")
    expect(player_name_div).to_have_text("Jules")

    player_colour_div = page.locator("#playerColour")
    expect(player_colour_div).to_have_css("background-color", "rgb(255, 0, 0)")

    # 8. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")