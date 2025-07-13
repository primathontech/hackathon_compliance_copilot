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
import { InfoIcon, BookIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch regulatory knowledge data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/regulatory-knowledge/rules`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { regulatoryData: data, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch regulatory knowledge data:', error);
  }
  
  // Fallback to mock data if backend is not available
  return {
    regulatoryData: [
      {
        id: 1,
        title: "GDPR Article 6 - Lawfulness of processing",
        regulation: "GDPR",
        category: "Legal Basis",
        description: "Processing shall be lawful only if and to the extent that at least one of the following applies...",
        applicability: "All EU data processing",
        lastUpdated: "2025-01-01"
      },
      {
        id: 2,
        title: "CCPA Section 1798.100 - Right to Know",
        regulation: "CCPA",
        category: "Consumer Rights",
        description: "A consumer shall have the right to request that a business disclose...",
        applicability: "California consumers",
        lastUpdated: "2024-12-15"
      },
      {
        id: 3,
        title: "PIPEDA Principle 4.3 - Consent",
        regulation: "PIPEDA",
        category: "Consent",
        description: "The knowledge and consent of the individual are required for the collection...",
        applicability: "Canadian organizations",
        lastUpdated: "2024-11-20"
      }
    ],
    shop: session?.shop
  };
};

export default function RegulatoryKnowledge() {
  const { regulatoryData } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);

  const getRegulationBadge = (regulation: string) => {
    switch (regulation) {
      case 'GDPR':
        return <Badge tone="info">GDPR</Badge>;
      case 'CCPA':
        return <Badge tone="warning">CCPA</Badge>;
      case 'PIPEDA':
        return <Badge tone="success">PIPEDA</Badge>;
      default:
        return <Badge>Other</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Legal Basis':
        return <Badge tone="critical">Legal Basis</Badge>;
      case 'Consumer Rights':
        return <Badge tone="warning">Consumer Rights</Badge>;
      case 'Consent':
        return <Badge tone="info">Consent</Badge>;
      default:
        return <Badge>Other</Badge>;
    }
  };

  const ruleRows = regulatoryData.map((rule: any) => [
    <InlineStack gap="200" key={rule.id}>
      <Icon source={BookIcon} tone="base" />
      <Text as="span" variant="bodyMd" fontWeight="semibold">{rule.title}</Text>
    </InlineStack>,
    getRegulationBadge(rule.regulation),
    getCategoryBadge(rule.category),
    <Text as="span" variant="bodyMd" key={`desc-${rule.id}`}>
      {rule.description.substring(0, 100)}...
    </Text>,
    rule.applicability,
    <Button variant="plain" key={`action-${rule.id}`}>
      View Details
    </Button>
  ]);

  const tabs = [
    {
      id: 'rules',
      content: 'Regulatory Rules',
      panelID: 'rules-panel',
    },
    {
      id: 'gap-analysis',
      content: 'Gap Analysis',
      panelID: 'gap-panel',
    },
    {
      id: 'updates',
      content: 'Recent Updates',
      panelID: 'updates-panel',
    },
  ];

  const runGapAnalysis = async () => {
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/regulatory-knowledge/gap-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: 'default-merchant',
          merchantData: {
            businessType: 'e-commerce',
            jurisdiction: 'EU',
            dataTypes: ['customer_data', 'order_data'],
            currentPolicies: ['privacy_policy'],
            implementedControls: ['cookie_consent']
          }
        }),
      });

      if (response.ok) {
        shopify.toast.show("Gap analysis completed successfully");
      } else {
        throw new Error('Gap analysis failed');
      }
    } catch (error) {
      console.error('Gap analysis error:', error);
      shopify.toast.show("Error during gap analysis", { isError: true });
    }
  };

  return (
    <Page>
      <TitleBar title="Regulatory Knowledge Base">
        <Button variant="primary" onClick={runGapAnalysis}>
          Run Gap Analysis
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Total Rules</Text>
                  <Text as="p" variant="heading2xl">{regulatoryData.length}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">GDPR Rules</Text>
                  <Text as="p" variant="heading2xl">
                    {regulatoryData.filter((rule: any) => rule.regulation === 'GDPR').length}
                  </Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">CCPA Rules</Text>
                  <Text as="p" variant="heading2xl">
                    {regulatoryData.filter((rule: any) => rule.regulation === 'CCPA').length}
                  </Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">PIPEDA Rules</Text>
                  <Text as="p" variant="heading2xl">
                    {regulatoryData.filter((rule: any) => rule.regulation === 'PIPEDA').length}
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
                    <Text as="h2" variant="headingLg">Regulatory Rules Database</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Rule Title', 'Regulation', 'Category', 'Description', 'Applicability', 'Action']}
                      rows={ruleRows}
                    />
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Compliance Gap Analysis</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Analyze your current compliance posture against regulatory requirements.
                    </Text>
                    <Button onClick={runGapAnalysis}>
                      Run New Gap Analysis
                    </Button>
                  </BlockStack>
                )}
                
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Recent Regulatory Updates</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Stay informed about the latest changes in privacy regulations.
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
                      Search Regulations
                    </Button>
                    <Button fullWidth variant="plain">
                      Export Knowledge Base
                    </Button>
                    <Button fullWidth variant="plain">
                      Subscribe to Updates
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Regulatory Coverage</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • GDPR (EU)
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • CCPA (California)
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • PIPEDA (Canada)
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}