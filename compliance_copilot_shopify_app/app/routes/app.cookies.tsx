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
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { 
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch cookie data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/cookie-management/cookies/${session?.shop || 'default-merchant'}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const backendData = await response.json();
      
      // Transform backend data to match frontend expectations
      const cookieData = {
        totalCookies: backendData.length || 0,
        essentialCookies: backendData.filter((c: any) => c.category === 'Essential').length || 0,
        analyticalCookies: backendData.filter((c: any) => c.category === 'Analytical').length || 0,
        marketingCookies: backendData.filter((c: any) => c.category === 'Marketing').length || 0,
        complianceScore: 85, // Calculate based on actual data
        consentBannerStatus: 'active',
        cookies: backendData.map((cookie: any) => ({
          name: cookie.name,
          domain: cookie.domain,
          category: cookie.category,
          purpose: cookie.purpose,
          expiry: cookie.expiry,
          consentRequired: cookie.consentRequired,
          status: cookie.status || 'compliant'
        }))
      };
      
      return { cookieData, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch cookie data from backend:', error);
  }
  
  // Fallback to mock data if backend is not available
  return {
    cookieData: {
      totalCookies: 24,
      essentialCookies: 8,
      analyticalCookies: 10,
      marketingCookies: 6,
      complianceScore: 85,
      consentBannerStatus: 'active',
      cookies: [
        {
          name: '_ga',
          domain: 'example.myshopify.com',
          category: 'Analytical',
          purpose: 'Google Analytics tracking',
          expiry: '2 years',
          consentRequired: true,
          status: 'compliant'
        },
        {
          name: '_fbp',
          domain: 'example.myshopify.com',
          category: 'Marketing',
          purpose: 'Facebook Pixel tracking',
          expiry: '90 days',
          consentRequired: true,
          status: 'needs_consent'
        },
        {
          name: 'cart',
          domain: 'example.myshopify.com',
          category: 'Essential',
          purpose: 'Shopping cart functionality',
          expiry: 'Session',
          consentRequired: false,
          status: 'compliant'
        }
      ]
    },
    shop: session?.shop
  };
};

export default function CookieManagement() {
  const { cookieData } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const runCookieScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/cookie-management/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: 'default-merchant',
          websiteUrl: `https://${window.location.hostname}`,
        }),
      });

      if (response.ok) {
        shopify.toast.show("Cookie scan completed successfully");
        // Reload the page to show updated data
        window.location.reload();
      } else {
        throw new Error('Scan failed');
      }
    } catch (error) {
      console.error('Cookie scan error:', error);
      shopify.toast.show("Error during cookie scan", { isError: true });
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge tone="success">Compliant</Badge>;
      case 'needs_consent':
        return <Badge tone="warning">Needs Consent</Badge>;
      case 'non_compliant':
        return <Badge tone="critical">Non-Compliant</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Essential':
        return <Badge tone="info">Essential</Badge>;
      case 'Analytical':
        return <Badge tone="warning">Analytical</Badge>;
      case 'Marketing':
        return <Badge tone="critical">Marketing</Badge>;
      default:
        return <Badge>Other</Badge>;
    }
  };

  const cookieRows = cookieData.cookies.map((cookie: any, index: number) => [
    <InlineStack gap="200" key={index}>
      <Icon source={InfoIcon} tone="base" />
      <Text as="span" variant="bodyMd" fontWeight="semibold">{cookie.name}</Text>
    </InlineStack>,
    cookie.domain,
    getCategoryBadge(cookie.category),
    cookie.purpose,
    cookie.expiry,
    getStatusBadge(cookie.status),
    <Button variant="plain" key={`action-${index}`}>
      Configure
    </Button>
  ]);

  const tabs = [
    {
      id: 'overview',
      content: 'Overview',
      panelID: 'overview-panel',
    },
    {
      id: 'cookies',
      content: 'Cookie Details',
      panelID: 'cookies-panel',
    },
    {
      id: 'consent',
      content: 'Consent Management',
      panelID: 'consent-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="Cookie Management">
        <Button 
          variant="primary" 
          loading={isScanning}
          onClick={runCookieScan}
        >
          Scan Cookies
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
                    <Text as="h3" variant="headingMd">Total Cookies</Text>
                    <Icon source={InfoIcon} tone="base" />
                  </InlineStack>
                  <Text as="p" variant="heading2xl">{cookieData.totalCookies}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Essential</Text>
                  <Text as="p" variant="heading2xl">{cookieData.essentialCookies}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Analytical</Text>
                  <Text as="p" variant="heading2xl">{cookieData.analyticalCookies}</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Marketing</Text>
                  <Text as="p" variant="heading2xl">{cookieData.marketingCookies}</Text>
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
                    <Text as="h2" variant="headingLg">Cookie Compliance Overview</Text>
                    
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodyMd">Compliance Score</Text>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{cookieData.complianceScore}%</Text>
                      </InlineStack>
                      <ProgressBar progress={cookieData.complianceScore} />
                      
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Icon source={CheckCircleIcon} tone="success" />
                          <Text as="p" variant="bodyMd">Consent Banner</Text>
                        </InlineStack>
                        <Badge tone="success">Active</Badge>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Icon source={AlertTriangleIcon} tone="warning" />
                          <Text as="p" variant="bodyMd">Cookies Requiring Consent</Text>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">{cookieData.analyticalCookies + cookieData.marketingCookies}</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Detected Cookies</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Cookie Name', 'Domain', 'Category', 'Purpose', 'Expiry', 'Status', 'Action']}
                      rows={cookieRows}
                    />
                  </BlockStack>
                )}
                
                {selectedTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Consent Management</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure cookie consent settings and banner customization.
                    </Text>
                    
                    <BlockStack gap="300">
                      <Button fullWidth>
                        Configure Consent Banner
                      </Button>
                      <Button fullWidth variant="plain">
                        Manage Cookie Categories
                      </Button>
                      <Button fullWidth variant="plain">
                        View Consent Records
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
                      Update Cookie Policy
                    </Button>
                    <Button fullWidth variant="plain">
                      Export Cookie Report
                    </Button>
                    <Button fullWidth variant="plain">
                      Configure Auto-Scan
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Compliance Tips</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Regularly scan for new cookies
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Ensure consent is obtained for non-essential cookies
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    • Keep cookie policies up to date
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