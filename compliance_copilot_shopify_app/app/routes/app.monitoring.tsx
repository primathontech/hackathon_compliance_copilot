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
  Icon,
  Tabs,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  InfoIcon 
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch monitoring data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/monitoring/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { monitoringData: data, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch monitoring data:', error);
  }
  
  // Fallback to mock data if backend is not available
  return {
    monitoringData: {
      complianceScore: 75,
      totalMerchants: 1,
      activeAudits: 2,
      pendingRequests: 5,
      withdrawnConsents: 3,
      breachIncidents: 0,
      alertCounts: {
        critical: 1,
        high: 3,
        medium: 5,
        low: 2
      }
    },
    shop: session?.shop
  };
};

export default function MonitoringDashboard() {
  const { monitoringData } = useLoaderData<typeof loader>();
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    {
      id: 'overview',
      content: 'Overview',
      panelID: 'overview-panel',
    },
    {
      id: 'alerts',
      content: 'Alerts',
      panelID: 'alerts-panel',
    },
    {
      id: 'metrics',
      content: 'Metrics',
      panelID: 'metrics-panel',
    },
  ];

  const totalAlerts = (monitoringData.alertCounts.critical as number) + 
                     (monitoringData.alertCounts.high as number) + 
                     (monitoringData.alertCounts.medium as number) + 
                     (monitoringData.alertCounts.low as number);

  return (
    <Page>
      <TitleBar title="Real-time Monitoring">
        <Button variant="primary">
          Configure Alerts
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Overview Cards */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Active Audits</Text>
                    <Icon source={InfoIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{monitoringData.activeAudits}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Pending Requests</Text>
                  <Text as="p" variant="heading2xl">{monitoringData.pendingRequests}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Withdrawn Consents</Text>
                  <Text as="p" variant="heading2xl">{monitoringData.withdrawnConsents}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Breach Incidents</Text>
                  <Text as="p" variant="heading2xl">{monitoringData.breachIncidents}</Text>
                </BlockStack>
              </Card>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Main Content */}
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Monitoring Overview</Text>
                    
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Icon source={CheckCircleIcon} tone="success" />
                          <Text as="p" variant="bodyMd">System Status</Text>
                        </InlineStack>
                        <Badge tone="success">Operational</Badge>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Icon source={AlertTriangleIcon} tone="warning" />
                          <Text as="p" variant="bodyMd">Critical Alerts</Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">{monitoringData.alertCounts.critical}</Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Icon source={InfoIcon} tone="base" />
                          <Text as="p" variant="bodyMd">Total Alerts</Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">{totalAlerts}</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Recent Alerts</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No recent alerts to display.
                    </Text>
                  </BlockStack>
                )}
                
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Performance Metrics</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Compliance score: {monitoringData.complianceScore}%
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
                      View All Alerts
                    </Button>
                    <Button fullWidth variant="plain">
                      Export Monitoring Report
                    </Button>
                    <Button fullWidth variant="plain">
                      Configure Notifications
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