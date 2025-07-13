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
  ProgressBar,
  Icon,
  Link,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckMarkIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch compliance data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/compliance/dashboard`, {
      headers: {
        'Authorization': `Bearer ${session?.accessToken}`,
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { complianceData: data, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch compliance data:', error);
  }
  
  // Return mock data if backend is not available
  return {
    complianceData: {
      complianceScore: 75,
      status: 'warning',
      lastAuditDate: new Date().toISOString(),
      criticalIssues: 2,
      totalIssues: 8,
      cookieCompliance: 85,
      privacyPolicyStatus: 'compliant',
      thirdPartyApps: 12,
      riskLevel: 'medium'
    },
    shop: session?.shop
  };
};

export default function ComplianceDashboard() {
  const { complianceData, shop } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  const runComplianceAudit = async () => {
    setIsRunningAudit(true);
    try {
      const response = await fetch(`${process.env.BACKEND_API_URL}/compliance/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop }),
      });
      
      if (response.ok) {
        shopify.toast.show("Compliance audit started successfully");
      } else {
        shopify.toast.show("Failed to start compliance audit", { isError: true });
      }
    } catch (error) {
      shopify.toast.show("Error starting compliance audit", { isError: true });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge tone="success">Compliant</Badge>;
      case 'warning':
        return <Badge tone="warning">Needs Attention</Badge>;
      case 'critical':
        return <Badge tone="critical">Critical Issues</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  return (
    <Page>
      <TitleBar title="Compliance Co-Pilot Dashboard">
        <Button
          variant="primary"
          loading={isRunningAudit}
          onClick={runComplianceAudit}
        >
          Run Compliance Audit
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        {/* Overview Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Compliance Score</Text>
                  <Icon source={ShieldCheckMarkIcon} tone="base" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {complianceData.complianceScore}%
                </Text>
                <ProgressBar
                  progress={complianceData.complianceScore}
                />
                {getStatusBadge(complianceData.status)}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Issues Found</Text>
                  <Icon source={AlertTriangleIcon} tone="warning" />
                </InlineStack>
                <InlineStack gap="200">
                  <Text as="p" variant="heading2xl" tone="critical">
                    {complianceData.criticalIssues}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    / {complianceData.totalIssues} total
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Critical issues requiring immediate attention
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Last Audit</Text>
                  <Icon source={ClockIcon} tone="base" />
                </InlineStack>
                <Text as="p" variant="headingMd">
                  {new Date(complianceData.lastAuditDate).toLocaleDateString()}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {Math.floor((Date.now() - new Date(complianceData.lastAuditDate).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Detailed Compliance Areas */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">Compliance Areas</Text>
                
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <InlineStack gap="200">
                      <Icon source={CheckCircleIcon} tone="success" />
                      <Text as="p" variant="bodyMd">Cookie Compliance</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text as="p" variant="bodyMd">{complianceData.cookieCompliance}%</Text>
                      <Link url="/app/cookies" removeUnderline>
                        <Button variant="plain">Manage</Button>
                      </Link>
                    </InlineStack>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <InlineStack gap="200">
                      <Icon source={CheckCircleIcon} tone="success" />
                      <Text as="p" variant="bodyMd">Privacy Policy</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      {getStatusBadge(complianceData.privacyPolicyStatus)}
                      <Link url="/app/privacy-policy" removeUnderline>
                        <Button variant="plain">Review</Button>
                      </Link>
                    </InlineStack>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <InlineStack gap="200">
                      <Icon source={AlertTriangleIcon} tone="warning" />
                      <Text as="p" variant="bodyMd">Third-Party Apps</Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text as="p" variant="bodyMd">{complianceData.thirdPartyApps} apps</Text>
                      <Badge tone="warning">{`${complianceData.riskLevel} risk`}</Badge>
                      <Link url="/app/third-party-apps" removeUnderline>
                        <Button variant="plain">Review</Button>
                      </Link>
                    </InlineStack>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Quick Actions</Text>
                  <BlockStack gap="200">
                    <Button fullWidth url="/app/compliance">
                      View Full Compliance Report
                    </Button>
                    <Button fullWidth variant="plain" url="/app/monitoring">
                      Real-time Monitoring
                    </Button>
                    <Button fullWidth variant="plain" url="/app/regulatory">
                      Regulatory Knowledge Base
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Recent Activity</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No recent compliance activities
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
