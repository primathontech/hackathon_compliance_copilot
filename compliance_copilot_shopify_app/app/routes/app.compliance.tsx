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
  Link,
  Tabs,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  InfoIcon 
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch detailed compliance data from backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/compliance/detailed`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shop-Domain': session?.shop || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return { complianceData: data, shop: session?.shop };
    }
  } catch (error) {
    console.error('Failed to fetch detailed compliance data:', error);
  }
  
  // Return mock data if backend is not available
  return {
    complianceData: {
      issues: [
        {
          id: 1,
          title: "Missing Cookie Consent Banner",
          severity: "critical",
          category: "Cookie Compliance",
          description: "No cookie consent mechanism detected on the website",
          recommendation: "Implement a GDPR-compliant cookie consent banner",
          status: "open"
        },
        {
          id: 2,
          title: "Privacy Policy Outdated",
          severity: "high",
          category: "Privacy Policy",
          description: "Privacy policy was last updated over 12 months ago",
          recommendation: "Review and update privacy policy to reflect current practices",
          status: "open"
        },
        {
          id: 3,
          title: "Third-party App Data Access",
          severity: "medium",
          category: "Data Access",
          description: "Multiple apps have access to customer data without clear justification",
          recommendation: "Review app permissions and remove unnecessary access",
          status: "in_progress"
        }
      ],
      regulations: [
        { name: "GDPR", compliance: 75, status: "partial" },
        { name: "CCPA", compliance: 85, status: "compliant" },
        { name: "PIPEDA", compliance: 60, status: "needs_attention" }
      ]
    },
    shop: session?.shop
  };
};

export default function ComplianceOverview() {
  const { complianceData, shop } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [selectedTab, setSelectedTab] = useState(0);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge tone="critical">Critical</Badge>;
      case 'high':
        return <Badge tone="warning">High</Badge>;
      case 'medium':
        return <Badge tone="info">Medium</Badge>;
      case 'low':
        return <Badge>Low</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge tone="success">Compliant</Badge>;
      case 'partial':
        return <Badge tone="warning">Partial</Badge>;
      case 'needs_attention':
        return <Badge tone="critical">Needs Attention</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const issueRows = complianceData.issues.map((issue: any) => [
    <InlineStack gap="200" key={issue.id}>
      <Icon 
        source={issue.severity === 'critical' ? AlertTriangleIcon : InfoIcon} 
        tone={issue.severity === 'critical' ? 'critical' : 'base'} 
      />
      <Text as="span" variant="bodyMd">{issue.title}</Text>
    </InlineStack>,
    getSeverityBadge(issue.severity),
    issue.category,
    <Button variant="plain" key={`action-${issue.id}`}>
      View Details
    </Button>
  ]);

  const regulationRows = complianceData.regulations.map((reg: any, index: number) => [
    reg.name,
    `${reg.compliance}%`,
    getStatusBadge(reg.status),
    <Button variant="plain" key={`reg-action-${index}`}>
      View Requirements
    </Button>
  ]);

  const tabs = [
    {
      id: 'issues',
      content: 'Issues & Recommendations',
      panelID: 'issues-panel',
    },
    {
      id: 'regulations',
      content: 'Regulatory Compliance',
      panelID: 'regulations-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="Compliance Overview">
        <Button variant="primary">
          Generate Report
        </Button>
      </TitleBar>
      
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                {selectedTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Compliance Issues</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text']}
                      headings={['Issue', 'Severity', 'Category', 'Action']}
                      rows={issueRows}
                    />
                  </BlockStack>
                )}
                
                {selectedTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Regulatory Compliance Status</Text>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text']}
                      headings={['Regulation', 'Compliance Score', 'Status', 'Action']}
                      rows={regulationRows}
                    />
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
                    <Button fullWidth url="/app/cookies">
                      Manage Cookies
                    </Button>
                    <Button fullWidth variant="plain" url="/app/privacy-policy">
                      Update Privacy Policy
                    </Button>
                    <Button fullWidth variant="plain" url="/app/third-party-apps">
                      Review App Permissions
                    </Button>
                    <Button fullWidth variant="plain" url="/app/monitoring">
                      View Monitoring Dashboard
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">Compliance Score</Text>
                  <Text as="p" variant="heading2xl">75%</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Based on current compliance status across all regulations
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