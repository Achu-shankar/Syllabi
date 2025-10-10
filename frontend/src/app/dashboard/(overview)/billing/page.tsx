"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Zap, Users, Building } from 'lucide-react'; // Icons for plan features
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Mock plan data - in a real app, this would come from a config or API
const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "$0",
    frequency: "per month",
    description: "Over 100 ready-to-use Agents.",
    features: [
      "Draft & test unlimited custom Agents",
      "1,000 runs per month",
    ],
    isCurrent: true,
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    name: "Pro",
    icon: Users, // Example icon
    price: "$12",
    frequency: "per month + usage",
    billingNote: "Billed Annually",
    description: "Build unlimited custom Agents.",
    features: [
      "Publish unlimited custom Agents",
      "10,000 runs per month",
      "Up to 10 collaborators",
    ],
    isCurrent: false,
    cta: "Choose Pro",
  },
  {
    name: "Business",
    icon: Building, // Example icon
    price: "$80",
    frequency: "per month + usage",
    billingNote: "Billed Annually",
    description: "Scale your Agents.",
    features: [
      "Publish unlimited custom Agents",
      "100,000 runs per month",
      "Up to 100 collaborators",
      "API Access",
      "Embed AI Agents",
      "+ $20 / month per agent" // Special note for a feature
    ],
    isCurrent: false,
    cta: "Choose Business",
  },
];

export default function BillingPlanPage() {
  const [isAnnual, setIsAnnual] = React.useState(true); // Default to annual

    return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Plan</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription plan and billing details.
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Label htmlFor="billing-cycle" className="text-sm">Monthly</Label>
          <Switch 
            id="billing-cycle" 
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label="Toggle billing cycle between monthly and annual"
          />
          <Label htmlFor="billing-cycle" className="text-sm">Annual</Label>
          {isAnnual && <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-md">Save 20%</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => (
          <Card key={plan.name} className={`flex flex-col ${plan.name === 'Pro' ? 'border-primary shadow-lg' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {plan.icon && <plan.icon className="h-6 w-6 text-muted-foreground" />}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                {plan.billingNote && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{plan.billingNote}</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.frequency}</span>
              </div>
              <CardDescription className="pt-1 text-sm">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm font-medium mb-3">Includes:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto pt-6">
              <Button className="w-full" size="lg" disabled={plan.ctaDisabled} variant={plan.name === 'Pro' ? 'default' : 'outline'}>
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Placeholder for payment method and invoice history, similar to previous BillingPage */}
      {/* <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <p className="text-muted-foreground">Manage your payment methods and view past invoices (coming soon).</p>
      </div> */}
    </div>
  );
}

