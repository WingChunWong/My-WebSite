// Register Fluent UI Web Components used in this project
// Basic components
import "@fluentui/web-components/badge.js";
import "@fluentui/web-components/button.js";
import "@fluentui/web-components/divider.js";
import "@fluentui/web-components/label.js";

// Form components
import "@fluentui/web-components/text-input.js";
import "@fluentui/web-components/textarea.js";
import "@fluentui/web-components/checkbox.js";
import "@fluentui/web-components/radio.js";
import "@fluentui/web-components/radio-group.js";
import "@fluentui/web-components/switch.js";
import "@fluentui/web-components/dropdown.js";
import "@fluentui/web-components/option.js";
import "@fluentui/web-components/listbox.js";

// Response & Feedback
import "@fluentui/web-components/dialog.js";
import "@fluentui/web-components/dialog-body.js";
import "@fluentui/web-components/spinner.js";
import "@fluentui/web-components/progress-bar.js";
import "@fluentui/web-components/message-bar.js";

// Container & Layout
import "@fluentui/web-components/field.js";
import "@fluentui/web-components/tabs.js";
import "@fluentui/web-components/tab.js";
import "@fluentui/web-components/tab-panel.js";
import "@fluentui/web-components/accordion.js";
import "@fluentui/web-components/accordion-item.js";
import "@fluentui/web-components/drawer.js";
import "@fluentui/web-components/drawer-body.js";

// Content & Navigation
import "@fluentui/web-components/link.js";
import "@fluentui/web-components/anchor-button.js";
import "@fluentui/web-components/menu.js";
import "@fluentui/web-components/menu-button.js";
import "@fluentui/web-components/menu-item.js";
import "@fluentui/web-components/tree-item.js";
import "@fluentui/web-components/tooltip.js";

import { webDarkTheme } from "@fluentui/tokens";
// Apply dark theme
import { setTheme } from "@fluentui/web-components/theme/set-theme.js";

setTheme(webDarkTheme as Record<string, string | number>);
