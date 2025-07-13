import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  Icon,
  Tabs,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { InfoIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch third-party app data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/third-party-app-risk/apps/${session?.shop || 'default-merchant'}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { appsData: data, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch third-party app data:', error);
  }
  
  // Fallback to mock data if backend is not available
  return {
    appsData: [
      {
        id: 1,
        name: "Google Analytics",
        category: "Analytics",
        riskLevel: "low",
        dataAccess: ["customer_data", "order_data"],
        lastReviewed: "2025-01-01",
        status: "active"
      },
      {
        id: 2,
        name: "Facebook Pixel",
        category: "Marketing",
        riskLevel: "medium",
        dataAccess: ["customer_data", "behavioral_data"],
        lastReviewed: "2024-12-15",
        status: "active"
      },
      {
        id: 3,
        name: "Email Marketing Tool",
        category: "Marketing",
        riskLevel: "high",
        dataAccess: ["customer_data", "email_data", "purchase_history"],
        lastReviewed: "2024-11-20",
        status: "needs_review"
      }
    ],
    shop: session?.shop
  };
};

export default function ThirdPartyApps() {
  const { appsData } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const runAppScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/third-party-app-risk/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: 'default-merchant',
        }),
      });

      if (response.ok) {
        shopify.toast.show("App risk scan completed successfully");
        window.location.reload();
      } else {
        throw new Error('Scan failed');
      }
    } catch (error) {
      console.error('App scan error:', error);
      shopify.toast.show("Error during app scan", { isError: true });
    } finally {
      setIsScanning(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge tone="success">Low Risk</Badge>;
      case 'medium':
        return <Badge tone="warning">Medium Risk</Badge>;
      case 'high':
        return <Badge tone="critical">High Risk</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'needs_review':
        return <Badge tone="warning">Needs Review</Badge>;
      case 'suspended':
        return <Badge tone="critical">Suspended</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const appRows = appsData.map((app: any) => [
    <InlineStack gap="200" key={app.id}>
      <Icon source={InfoIcon} tone="base" />
      <Text as="span" variant="bodyMd" fontWeight="semibold">{app.name}</Text>
    </InlineStack>,
    app.category,
    getRiskBadge(app.riskLevel),
    app.dataAccess.join(', '),
    new Date(app.lastReviewed).toLocaleDateString(),
    getStatusBadge(app.status),
    <Button variant="plain" key={`action-${app.id}`}>
      Review
    </Button>
  ]);

  const tabs = [
    {
      id: 'apps',
      content: 'Installed Apps',
      panelID: 'apps-panel',
    },
    {
      id: 'risk',
      content: 'Risk Assessment',
      panelID: 'risk-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="Third-Party App Risk Management">
        <Button 
          variant="primary" 
          loading={isScanning}
          onClick={runAppScan}
        >
          Scan Apps
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Total Apps</Text>
                  <Text as="p" variant="heading2xl">{appsData.length}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">High Risk</Text>
                  <Text as="p" variant="heading2xl">
                    {appsData.filter((app: any) => app.riskLevel === 'high').length}
                  </Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Need Review</Text>
                  <Text as="p" variant="heading2xl">
                    {appsData.filter((app: any) => app.status === 'needs_review').length}
                  </Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Installed Third-Party Apps</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['App Name', 'Category', 'Risk Level', 'Data Access', 'Last Reviewed', 'Status', 'Action']}
                      rows={appRows}
                    />
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Risk Assessment Summary</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Overall risk assessment based on app permissions and data access patterns.
                    </Text>
                  </BlockStack>
                )}
              </Tabs>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Quick Actions</Text>
                  <BlockStack gap="200">
                    <Button fullWidth>
                      Review All Apps
                    </Button>
                    <Button fullWidth variant="plain">
                      Export App Report
                    </Button>
                    <Button fullWidth variant="plain">
                      Configure Risk Thresholds
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}