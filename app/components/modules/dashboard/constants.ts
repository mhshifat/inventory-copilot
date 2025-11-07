import type { TourStep } from "@/components/shared/tour";

export const tourSteps: TourStep[] = [
  {
    target: '[data-tour-id="stat-total"]',
    title: "Total Products",
    description: "See how many products are being tracked across all collections.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="stat-low"]',
    title: "Low Stock Items",
    description: "Quickly spot items that need attention to prevent stockouts.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="stat-health"]',
    title: "Inventory Health",
    description: "Overall stock health based on products that are adequately stocked.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="ai-forecast"]',
    title: "AI Forecast",
    description: "AI looks at sales trends to predict stockouts and recommends actions.",
    position: "left",
  },
  {
    target: '[data-tour-id="search-input"]',
    title: "Search",
    description: "Find products by name or SKU instantly.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="status-filter"]',
    title: "Status Filter",
    description: "Filter by stock status to focus your review.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="vendor-filter"]',
    title: "Vendor Filter",
    description: "Narrow results to a specific vendor.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="collection-filter"]',
    title: "Collection Filter",
    description: "View products for a particular collection.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="inventory-table"]',
    title: "Live Stock Overview",
    description: "This table shows all products with real-time inventory data.",
    position: "top",
  },
  {
    target: '[data-tour-id="forecast-column"]',
    title: "Stock Forecast",
    description: "Estimated days until stock runs out for each product.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="reorder-column"]',
    title: "Smart Reorder Suggestions",
    description: "Recommended restock quantities to stay in a healthy range.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="sync-button"]',
    title: "Sync Inventory",
    description: "Refresh your data to reflect the latest changes.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="reports-button"]',
    title: "Reports",
    description: "Dive deeper into trends and forecasting performance.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="suppliers-button"]',
    title: "Suppliers",
    description: "Manage supplier relationships for timely restocks.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="alerts-button"]',
    title: "Alerts",
    description: "Review low-stock and critical inventory notifications.",
    position: "bottom",
  },
  {
    target: '[data-tour-id="settings-button"]',
    title: "Settings",
    description: "Customize forecast horizons and preferences.",
    position: "bottom",
  },
];