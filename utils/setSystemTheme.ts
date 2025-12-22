import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@capacitor/navigation-bar";

export async function setSystemTheme(isDark: boolean) {
  try {
    // Extract background color from your CSS variables
    const root = getComputedStyle(document.documentElement);
    const background = root.getPropertyValue("--background").trim();

    // Convert HSL variable to a valid CSS color (HSL → HEX)
    const color = `hsl(${background})`;

    // Set status bar color
    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });

    // Set navigation bar color
    await NavigationBar.setBackgroundColor({ color });
    await NavigationBar.setButtonStyle({
      style: isDark ? "light" : "dark",
    });
  } catch (error) {
    console.warn("Failed to set system theme:", error);
  }
}
