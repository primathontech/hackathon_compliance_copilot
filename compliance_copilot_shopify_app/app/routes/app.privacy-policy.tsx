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
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { FileIcon, EditIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // For now, return mock data as privacy policy management would be complex
  return {
    policyData: {
      currentPolicy: {
        id: 1,
        version: "1.2",
        status: "published",
        lastUpdated: "2025-01-01",
        content: "This privacy policy describes how we collect, use, and protect your personal information...",
        complianceScore: 85
      },
      previousVersions: [
        {
          id: 2,
          version: "1.1",
          status: "archived",
          lastUpdated: "2024-11-15"
        },
        {
          id: 3,
          version: "1.0",
          status: "archived",
          lastUpdated: "2024-08-01"
        }
      ]
    },
    shop: session?.shop
  };
};

export default function PrivacyPolicy() {
  const { policyData } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePolicy = async () => {
    setIsGenerating(true);
    try {
      // This would call the AI service to generate a new policy
      shopify.toast.show("AI policy generation started");
      
      // Simulate generation delay
      setTimeout(() => {
        setIsGenerating(false);
        shopify.toast.show("Privacy policy generated successfully");
      }, 3000);
    } catch (error) {
      console.error('Policy generation error:', error);
      shopify.toast.show("Error generating privacy policy", { isError: true });
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge tone="success">Published</Badge>;
      case 'draft':
        return <Badge tone="warning">Draft</Badge>;
      case 'archived':
        return <Badge tone="info">Archived</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const tabs = [
    {
      id: 'current',
      content: 'Current Policy',
      panelID: 'current-panel',
    },
    {
      id: 'versions',
      content: 'Version History',
      panelID: 'versions-panel',
    },
    {
      id: 'generator',
      content: 'AI Generator',
      panelID: 'generator-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="Privacy Policy Management">
        <Button 
          variant="primary" 
          loading={isGenerating}
          onClick={generatePolicy}
        >
          Generate with AI
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Current Version</Text>
                    <Icon source={FileIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">v{policyData.currentPolicy.version}</Text>
                  {getStatusBadge(policyData.currentPolicy.status)}
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Compliance Score</Text>
                  <Text as="p" variant="heading2xl">{policyData.currentPolicy.complianceScore}%</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Last Updated</Text>
                  <Text as="p" variant="headingMd">
                    {new Date(policyData.currentPolicy.lastUpdated).toLocaleDateString()}
                  </Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Total Versions</Text>
                  <Text as="p" variant="heading2xl">{policyData.previousVersions.length + 1}</Text>
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
                    <Text as="h2" variant="headingLg">Current Privacy Policy</Text>
                    
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Version {policyData.currentPolicy.version}
                        </Text>
                        <InlineStack gap="200">
                          {getStatusBadge(policyData.currentPolicy.status)}
                          <Button variant="plain" icon={EditIcon}>
                            Edit
                          </Button>
                        </InlineStack>
                      </InlineStack>
                      
                      <Card>
                        <Text as="p" variant="bodyMd">
                          {policyData.currentPolicy.content}
                        </Text>
                      </Card>
                    </BlockStack>
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Version History</Text>
                    
                    <BlockStack gap="300">
                      {policyData.previousVersions.map((version: any) => (
                        <Card key={version.id}>
                          <InlineStack align="space-between">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                Version {version.version}
                              </Text>
                              <Text as="p" variant="bodyMd" tone="subdued">
                                {new Date(version.lastUpdated).toLocaleDateString()}
                              </Text>
                            </BlockStack>
                            <InlineStack gap="200">
                              {getStatusBadge(version.status)}
                              <Button variant="plain">
                                View
                              </Button>
                            </InlineStack>
                          </InlineStack>
                        </Card>
                      ))}
                    </BlockStack>
                  </BlockStack>
                )}
                
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">AI Privacy Policy Generator</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Generate a GDPR-compliant privacy policy using AI based on your business requirements.
                    </Text>
                    
                    <BlockStack gap="300">
                      <Button 
                        fullWidth 
                        loading={isGenerating}
                        onClick={generatePolicy}
                      >
                        Generate New Privacy Policy
                      </Button>
                      <Button fullWidth variant="plain">
                        Customize Generation Settings
                      </Button>
                    </BlockStack>
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
                      Publish Policy
                    </Button>
                    <Button fullWidth variant="plain">
                      Download PDF
                    </Button>
                    <Button fullWidth variant="plain">
                      Schedule Review
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Compliance Tips</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Review policy every 6 months
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Update after business changes
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Ensure clear, plain language
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