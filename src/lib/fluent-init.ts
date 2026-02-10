// Register Fluent UI Web Components used in this project
import "@fluentui/web-components/badge.js";
import "@fluentui/web-components/button.js";
import "@fluentui/web-components/dialog.js";
import "@fluentui/web-components/dialog-body.js";
import "@fluentui/web-components/divider.js";
import "@fluentui/web-components/label.js";
import "@fluentui/web-components/spinner.js";

import { webDarkTheme } from "@fluentui/tokens";
// Apply dark theme
import { setTheme } from "@fluentui/web-components/theme/set-theme.js";

setTheme(webDarkTheme as Record<string, string | number>);
