import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";

// Privacy Policy page for Inventory Copilot
// Tailwind + shadcn/ui components

const LAST_UPDATED = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const SUPPORT_EMAIL = "shifat.dev@gmail.com"; // replace with your real support email

export default function PrivacyPolicyPage() {
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      // tiny visual feedback could be implemented here
      // but keep simple for this single-file component
      // you can replace with a toast from your notification system
      alert("Support email copied to clipboard");
    } catch (err) {
      console.error(err);
      alert("Unable to copy email");
    }
  };

  return (
    <div className="container mx-auto px-6! py-12!">
      <div className="max-w-4xl! mx-auto">
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-2xl! md:text-3xl!">Privacy Policy — Inventory Copilot</CardTitle>
            <p className="text-sm! text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </CardHeader>

          <CardContent className="prose prose-slate mt-4">
            <p>
              This Privacy Policy explains how <strong>Inventory Copilot</strong> (the “App”) collects,
              uses, and protects data when installed on a Shopify store. The App uses order and product
              data to provide inventory forecasting and analytics.
            </p>

            <Separator className="my-4!" style={{
                marginTop: "16px",
                marginBottom: "16px",
            }} />

            <h2>1. Information We Collect</h2>

            <Accordion type="single" collapsible defaultValue="store-info">
              <AccordionItem value="store-info">
                <AccordionTrigger>1.1 Store Information</AccordionTrigger>
                <AccordionContent>
                  <p>
                    When you install the App we access basic store-level data required to operate the
                    App, including store name, domain and the access scopes granted to the App.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="order-data">
                <AccordionTrigger>1.2 Order Data (Past 30 days only)</AccordionTrigger>
                <AccordionContent>
                  <p>
                    To provide forecasting and analytics, Inventory Copilot collects and processes
                    order data limited to the <strong>past 30 days</strong>. This data may include:
                  </p>
                  <ul>
                    <li>Order ID and order creation or processed timestamps</li>
                    <li>Line items: product IDs, variant IDs, and quantities</li>
                    <li>Fulfillment status and related timestamps</li>
                    <li>Aggregated, non-identifying transaction details (not payment info)</li>
                  </ul>
                  <p>
                    The App is designed to <strong>exclude</strong> customer-identifying personal data
                    such as customer name, email, address, phone number, and payment information.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="product-data">
                <AccordionTrigger>1.3 Product & Inventory Data</AccordionTrigger>
                <AccordionContent>
                  <p>To compute inventory insights we also access:</p>
                  <ul>
                    <li>Product details (ID, title, images)</li>
                    <li>Inventory levels and locations</li>
                    <li>SKU and vendor data</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>2. How We Use Your Information</h2>
            <p>
              Inventory Copilot uses collected data only to deliver the App’s functionality and to
              improve its reliability. Primary uses include:
            </p>
            <ul>
              <li>Generating inventory forecasts and daily velocity reports</li>
              <li>Calculating low-stock alerts and restock recommendations</li>
              <li>Improving forecasting models and internal diagnostics (aggregated/non-identifying)
              </li>
            </ul>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>3. Data Filters & "Sold" Definition</h2>
            <p>
              By default Inventory Copilot can be configured to count units that are: ordered,
              paid, or fulfilled. The App supports filtering by financial status (e.g. paid) and
              fulfillment status (e.g. fulfilled). For true shipped/received counts, the App uses
              the fulfilled quantity (quantity minus fulfillableQuantity) where available.
            </p>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>4. Storage & Security</h2>
            <p>
              We store only the minimum data required for the App to function. Data is stored on
              secure servers with industry-standard protections. Access is restricted and logged.
              Order data older than 30 days is not collected by default.
            </p>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>5. Data Retention & Deletion</h2>
            <p>
              Your store data is retained only while the App is installed. If you uninstall the App,
              all related stored data will be deleted within <strong>48 hours</strong>.
            </p>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>6. Sharing & Third Parties</h2>
            <p>
              We do not sell your data. We only share data when required for legal compliance, or
              when necessary to operate the service (for example, Shopify’s own access as described
              in their policies). We will never share data for advertising or marketing purposes.
            </p>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>7. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, or request
              deletion of data we store. To exercise those rights, contact us at the support email
              below.
            </p>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <h2>8. Contact</h2>
            <p>
              Questions or requests regarding this policy should be sent to:
            </p>

            <div className="flex items-center gap-3">
              <code className="rounded-md px-2! py-1! bg-muted text-sm!">{SUPPORT_EMAIL}</code>
              <Button 
            //   @ts-ignore
              variant="outline" size="sm" onClick={handleCopyEmail}>
                <Copy className="mr-2! h-4! w-4!" /> Copy
              </Button>
            </div>

            <Separator className="my-6!" style={{
                marginTop: "24px",
                marginBottom: "24px",
            }} />

            <p className="text-sm! text-muted-foreground">
              By using Inventory Copilot you agree to the collection and use of information in
              accordance with this policy. We may update this policy occasionally; we will post any
              updates on this page and update the date at the top.
            </p>

            <div className="mt-6! flex gap-2!">
              <Button onClick={() => window.print()}>Print</Button>
              <Button 
                // @ts-ignore
              variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Back to top
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
