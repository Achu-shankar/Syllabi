"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from 'lucide-react'; // Example icon

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Receipts & Invoices</h1>
        <p className="text-muted-foreground">
          View and download your past invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            You have no invoices yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your invoices will appear here once you subscribe to a plan or make a purchase.
          </p>
          {/* Future: Table or list of invoices would go here */}
          {/* Example of a placeholder for a single invoice item (when data exists) */}
          {/* 
          <div className="mt-4 p-3 border rounded-md flex justify-between items-center">
            <div>
              <p className="font-medium">Invoice #INV-2023-001</p>
              <p className="text-sm text-muted-foreground">Date: May 23, 2023 - Amount: $12.00</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 h-4 w-4" /> Download (Coming Soon)
            </Button>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
} 