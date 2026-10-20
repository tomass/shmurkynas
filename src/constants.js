export const tileSize = 42;
export const coinStartTime = { hour: 7, minute: 0 };
export const coinEndTime = { hour: 23, minute: 0 };
export const maxCoins = 3;
export const coinAppearanceProbability = 0.1;
export const coinAppearanceInterval = 5 * 60 * 1000; // 5 minutes
export const adventureAppearanceInterval = 30 * 60 * 1000; // 1 hour
export const adventureAbandonInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

// What every kind of living space costs. A map can name its own price for a
// single living point, see the price attribute of a living point.
export const livingPrices = {
  flat1: 100,
  flat2: 200,
  house1: 1000,
  house2: 2000,
};
// The lightbulb on top of a living building: green while nobody lives there,
// blue once somebody has bought it.
export const livingFreeColour = 0x00ff00;
export const livingOccupiedColour = 0x0066ff;
