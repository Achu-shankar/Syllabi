"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from 'lucide-react';

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Payment Methods</h1>
          <p className="text-muted-foreground">
            Manage your saved payment methods.
          </p>
        </div>
        <Button disabled> {/* Functionality to be added later */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Method (Coming Soon)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
          <CardDescription>
            You have no saved payment methods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add a payment method to subscribe to a plan or make purchases.
          </p>
        </CardContent>
      </Card>

      {/* Future: List of payment methods would go here */}
    </div>
  );
} 